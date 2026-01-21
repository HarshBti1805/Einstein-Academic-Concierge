"""
Allocation Engine for course registration.

Handles both batch allocation (when bookings open) and single-vacancy fills.
Uses a modified Gale-Shapley-like approach for optimal matching.
"""

import logging
from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Optional
from enum import Enum

from models.entities import (
    Student, Course, CourseApplication, AllocationResult,
    RegistrationStatus, CourseBookingState, StudentCoursePreferences
)
from core.scoring import ScoringEngine
from core.waitlist import WaitlistManager

logger = logging.getLogger(__name__)


class AllocationStrategy(Enum):
    """Strategy for allocating students to courses."""
    GREEDY = "greedy"  # Simple greedy by score
    STUDENT_OPTIMAL = "student_optimal"  # Favor student preferences
    COURSE_OPTIMAL = "course_optimal"  # Favor course preferences (best students)
    BALANCED = "balanced"  # Balance both sides


@dataclass
class BatchAllocationConfig:
    """Configuration for batch allocation."""
    strategy: AllocationStrategy = AllocationStrategy.BALANCED
    max_courses_per_student: int = 5
    allow_oversubscription: float = 0.0  # e.g., 0.1 = 10% over capacity
    prioritize_student_top_choices: bool = True


class AllocationEngine:
    """
    Handles the allocation of students to courses.
    
    Supports:
    1. Batch allocation - When bookings open, allocate all eligible students
    2. Vacancy fill - When a spot opens, fill from waitlist
    3. Manual registration - When student explicitly registers (if vacancy exists)
    """
    
    def __init__(
        self,
        waitlist_manager: WaitlistManager,
        scoring_engine: ScoringEngine,
        config: Optional[BatchAllocationConfig] = None
    ):
        self.waitlist = waitlist_manager
        self.scoring = scoring_engine
        self.config = config or BatchAllocationConfig()
        
        # In-memory stores (in production, use database)
        self._enrollments: dict[str, set[str]] = defaultdict(set)  # course_id -> student_ids
        self._student_courses: dict[str, set[str]] = defaultdict(set)  # student_id -> course_ids
    
    def apply_for_course(
        self,
        student: Student,
        course: Course,
        preferences: StudentCoursePreferences,
        applied_at: Optional[datetime] = None
    ) -> AllocationResult:
        """
        Process a student's application for a course.
        
        Depending on course state:
        - BOOKING_CLOSED: Add to waitlist
        - BOOKING_OPEN + vacancy: May register immediately or waitlist
        - BOOKING_OPEN + no vacancy: Add to waitlist
        - COURSE_STARTED: Add to waitlist (will fill on dropout)
        """
        applied_at = applied_at or datetime.utcnow()
        priority_rank = preferences.get_priority(course.course_id)
        
        # Compute score
        application = self.scoring.compute_score(
            student=student,
            course=course,
            applied_at=applied_at,
            student_priority=priority_rank
        )
        
        # Check prerequisites
        if not self._check_prerequisites(student, course):
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="Prerequisites not met",
                score=application.composite_score
            )
        
        # Check GPA requirement
        if student.gpa < course.min_gpa:
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message=f"GPA {student.gpa:.2f} below minimum {course.min_gpa:.2f}",
                score=application.composite_score
            )
        
        # Process based on course state
        if course.booking_state == CourseBookingState.BOOKING_CLOSED:
            # Add to waitlist, will be processed when bookings open
            self.waitlist.add_to_waitlist(application)
            position = self.waitlist.get_waitlist_position(course.course_id, student.student_id)
            
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=True,
                status=RegistrationStatus.WAITLISTED,
                message="Added to waitlist. Booking not yet open.",
                waitlist_position=position,
                score=application.composite_score
            )
        
        elif course.booking_state == CourseBookingState.BOOKING_OPEN:
            if course.has_vacancy:
                # Booking open with vacancy - this is where manual registration is possible
                # But we still add to waitlist first for batch processing
                self.waitlist.add_to_waitlist(application)
                position = self.waitlist.get_waitlist_position(course.course_id, student.student_id)
                
                return AllocationResult(
                    student_id=student.student_id,
                    course_id=course.course_id,
                    success=True,
                    status=RegistrationStatus.WAITLISTED,
                    message="Application received. Allocation will be processed in next batch.",
                    waitlist_position=position,
                    score=application.composite_score
                )
            else:
                # No vacancy, pure waitlist
                self.waitlist.add_to_waitlist(application)
                position = self.waitlist.get_waitlist_position(course.course_id, student.student_id)
                
                return AllocationResult(
                    student_id=student.student_id,
                    course_id=course.course_id,
                    success=True,
                    status=RegistrationStatus.WAITLISTED,
                    message="Course full. Added to waitlist.",
                    waitlist_position=position,
                    score=application.composite_score
                )
        
        elif course.booking_state == CourseBookingState.COURSE_STARTED:
            # Course started, can only join if vacancy
            if course.has_vacancy:
                self.waitlist.add_to_waitlist(application)
                position = self.waitlist.get_waitlist_position(course.course_id, student.student_id)
                
                return AllocationResult(
                    student_id=student.student_id,
                    course_id=course.course_id,
                    success=True,
                    status=RegistrationStatus.WAITLISTED,
                    message="Added to waitlist for late enrollment.",
                    waitlist_position=position,
                    score=application.composite_score
                )
            else:
                self.waitlist.add_to_waitlist(application)
                position = self.waitlist.get_waitlist_position(course.course_id, student.student_id)
                
                return AllocationResult(
                    student_id=student.student_id,
                    course_id=course.course_id,
                    success=True,
                    status=RegistrationStatus.WAITLISTED,
                    message="Course full and started. Added to waitlist for dropout fill.",
                    waitlist_position=position,
                    score=application.composite_score
                )
        
        else:  # COURSE_COMPLETED
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="Course registration is closed.",
                score=application.composite_score
            )
    
    def manual_register(
        self,
        student: Student,
        course: Course
    ) -> AllocationResult:
        """
        Attempt immediate manual registration (only if vacancy and booking open).
        
        This bypasses the batch allocation for immediate enrollment.
        """
        # Manual registration only allowed when:
        # 1. Booking is open
        # 2. There's a vacancy
        if course.booking_state != CourseBookingState.BOOKING_OPEN:
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="Manual registration not available. Use apply_for_course instead."
            )
        
        if not course.has_vacancy:
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="No vacancy available for manual registration."
            )
        
        # Check prerequisites
        if not self._check_prerequisites(student, course):
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="Prerequisites not met."
            )
        
        # Acquire lock for thread safety
        if not self.waitlist.acquire_course_lock(course.course_id):
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=False,
                status=RegistrationStatus.WAITLISTED,
                message="System busy. Please try again."
            )
        
        try:
            # Double-check vacancy after acquiring lock
            if not course.has_vacancy:
                return AllocationResult(
                    student_id=student.student_id,
                    course_id=course.course_id,
                    success=False,
                    status=RegistrationStatus.WAITLISTED,
                    message="Vacancy filled while processing. Added to waitlist."
                )
            
            # Register the student
            self._enroll_student(student.student_id, course.course_id)
            course.current_enrollment += 1
            
            # Remove from waitlist if they were there
            self.waitlist.remove_from_waitlist(course.course_id, student.student_id)
            
            return AllocationResult(
                student_id=student.student_id,
                course_id=course.course_id,
                success=True,
                status=RegistrationStatus.REGISTERED,
                message="Successfully registered!"
            )
        
        finally:
            self.waitlist.release_course_lock(course.course_id)
    
    def run_batch_allocation(
        self,
        courses: list[Course],
        student_preferences: dict[str, StudentCoursePreferences],
        students: dict[str, Student]
    ) -> dict[str, list[AllocationResult]]:
        """
        Run batch allocation for multiple courses.
        
        This is the main allocation algorithm that runs periodically
        or when bookings open.
        
        Uses a balanced approach:
        1. For each course, get all waitlisted students with scores
        2. Sort globally by score
        3. Process in order, respecting student preferences and course capacity
        """
        results: dict[str, list[AllocationResult]] = defaultdict(list)
        
        # Track allocations in this batch
        batch_allocations: dict[str, str] = {}  # student_id -> course_id
        course_fills: dict[str, int] = defaultdict(int)  # course_id -> allocated count
        
        if self.config.strategy == AllocationStrategy.BALANCED:
            results = self._balanced_allocation(
                courses, student_preferences, students,
                batch_allocations, course_fills
            )
        elif self.config.strategy == AllocationStrategy.STUDENT_OPTIMAL:
            results = self._student_optimal_allocation(
                courses, student_preferences, students,
                batch_allocations, course_fills
            )
        else:
            results = self._greedy_allocation(
                courses, student_preferences, students,
                batch_allocations, course_fills
            )
        
        return results
    
    def _balanced_allocation(
        self,
        courses: list[Course],
        student_preferences: dict[str, StudentCoursePreferences],
        students: dict[str, Student],
        batch_allocations: dict[str, str],
        course_fills: dict[str, int]
    ) -> dict[str, list[AllocationResult]]:
        """
        Balanced allocation that considers both student and course preferences.
        
        Algorithm:
        1. Collect all (student, course, score) tuples
        2. Sort by score (best matches first)
        3. Process in order, skip if student already allocated or course full
        4. For ties, prefer student's higher-priority courses
        """
        results: dict[str, list[AllocationResult]] = defaultdict(list)
        
        # Collect all applications
        all_applications: list[tuple[str, str, float, int]] = []  # (student_id, course_id, score, priority)
        
        for course in courses:
            if course.booking_state not in [CourseBookingState.BOOKING_OPEN, CourseBookingState.BOOKING_CLOSED]:
                continue
            
            waitlisted = self.waitlist.get_all_waitlisted(course.course_id)
            
            for student_id, score in waitlisted:
                prefs = student_preferences.get(student_id)
                priority = prefs.get_priority(course.course_id) if prefs else 999
                all_applications.append((student_id, course.course_id, score, priority))
        
        # Sort by score (descending), then by student priority (ascending)
        all_applications.sort(key=lambda x: (-x[2], x[3]))
        
        # Build course lookup
        course_map = {c.course_id: c for c in courses}
        
        # Process allocations
        for student_id, course_id, score, priority in all_applications:
            # Skip if student already allocated in this batch
            if student_id in batch_allocations:
                continue
            
            course = course_map.get(course_id)
            if not course:
                continue
            
            # Check capacity
            current_enrollment = course.current_enrollment + course_fills[course_id]
            max_capacity = int(course.capacity * (1 + self.config.allow_oversubscription))
            
            if current_enrollment >= max_capacity:
                # Course is full
                position = self.waitlist.get_waitlist_position(course_id, student_id)
                results[student_id].append(AllocationResult(
                    student_id=student_id,
                    course_id=course_id,
                    success=False,
                    status=RegistrationStatus.WAITLISTED,
                    message="Course capacity reached. Remaining on waitlist.",
                    waitlist_position=position,
                    score=score
                ))
                continue
            
            # Allocate!
            batch_allocations[student_id] = course_id
            course_fills[course_id] += 1
            
            # Update actual enrollment
            self._enroll_student(student_id, course_id)
            course.current_enrollment += 1
            
            # Remove from waitlist
            self.waitlist.remove_from_waitlist(course_id, student_id)
            
            results[student_id].append(AllocationResult(
                student_id=student_id,
                course_id=course_id,
                success=True,
                status=RegistrationStatus.REGISTERED,
                message=f"Allocated to course (priority #{priority})",
                score=score
            ))
            
            logger.info(
                f"Allocated student {student_id} to course {course_id} "
                f"(score: {score:.4f}, priority: {priority})"
            )
        
        return results
    
    def _student_optimal_allocation(
        self,
        courses: list[Course],
        student_preferences: dict[str, StudentCoursePreferences],
        students: dict[str, Student],
        batch_allocations: dict[str, str],
        course_fills: dict[str, int]
    ) -> dict[str, list[AllocationResult]]:
        """
        Student-optimal allocation using deferred acceptance.
        
        Students "propose" to their top choice, courses tentatively accept
        the best proposers up to capacity. Rejected students propose to
        their next choice. Repeat until stable.
        """
        results: dict[str, list[AllocationResult]] = defaultdict(list)
        course_map = {c.course_id: c for c in courses}
        
        # Initialize: each student's current proposal index
        student_proposal_idx: dict[str, int] = defaultdict(int)
        
        # Tentative allocations: course_id -> list of (student_id, score)
        tentative: dict[str, list[tuple[str, float]]] = defaultdict(list)
        
        # Students who need to propose
        active_students = set(student_preferences.keys())
        
        # Get student scores for each course
        student_scores: dict[str, dict[str, float]] = defaultdict(dict)
        for course in courses:
            waitlisted = self.waitlist.get_all_waitlisted(course.course_id)
            for student_id, score in waitlisted:
                student_scores[student_id][course.course_id] = score
        
        while active_students:
            new_active = set()
            
            for student_id in active_students:
                prefs = student_preferences.get(student_id)
                if not prefs:
                    continue
                
                idx = student_proposal_idx[student_id]
                if idx >= len(prefs.course_ids):
                    # Student has exhausted all preferences
                    continue
                
                course_id = prefs.course_ids[idx]
                student_proposal_idx[student_id] = idx + 1
                
                course = course_map.get(course_id)
                if not course:
                    new_active.add(student_id)
                    continue
                
                score = student_scores[student_id].get(course_id, 0)
                tentative[course_id].append((student_id, score))
            
            # Each course keeps the best candidates
            for course_id, proposals in tentative.items():
                course = course_map.get(course_id)
                if not course:
                    continue
                
                max_capacity = int(course.capacity * (1 + self.config.allow_oversubscription))
                
                # Sort by score (descending)
                proposals.sort(key=lambda x: -x[1])
                
                # Keep the best up to capacity
                accepted = proposals[:max_capacity]
                rejected = proposals[max_capacity:]
                
                # Update tentative
                tentative[course_id] = accepted
                
                # Rejected students become active again
                for student_id, _ in rejected:
                    new_active.add(student_id)
            
            active_students = new_active
        
        # Finalize allocations
        for course_id, accepted in tentative.items():
            for student_id, score in accepted:
                batch_allocations[student_id] = course_id
                course = course_map[course_id]
                
                self._enroll_student(student_id, course_id)
                course.current_enrollment += 1
                self.waitlist.remove_from_waitlist(course_id, student_id)
                
                prefs = student_preferences.get(student_id)
                priority = prefs.get_priority(course_id) if prefs else 999
                
                results[student_id].append(AllocationResult(
                    student_id=student_id,
                    course_id=course_id,
                    success=True,
                    status=RegistrationStatus.REGISTERED,
                    message=f"Allocated to course (priority #{priority})",
                    score=score
                ))
        
        return results
    
    def _greedy_allocation(
        self,
        courses: list[Course],
        student_preferences: dict[str, StudentCoursePreferences],
        students: dict[str, Student],
        batch_allocations: dict[str, str],
        course_fills: dict[str, int]
    ) -> dict[str, list[AllocationResult]]:
        """
        Simple greedy allocation by score.
        """
        # Use balanced allocation (which is essentially greedy)
        return self._balanced_allocation(
            courses, student_preferences, students,
            batch_allocations, course_fills
        )
    
    def fill_vacancy(self, course: Course) -> Optional[AllocationResult]:
        """
        Fill a single vacancy from the waitlist.
        
        Called when a student drops a course.
        """
        if not course.has_vacancy:
            return None
        
        # Acquire lock
        if not self.waitlist.acquire_course_lock(course.course_id):
            logger.warning(f"Could not acquire lock for course {course.course_id}")
            return None
        
        try:
            # Get top candidate
            result = self.waitlist.pop_top_candidate(course.course_id)
            
            if not result:
                logger.info(f"No candidates in waitlist for {course.course_id}")
                return None
            
            student_id, score = result
            
            # Enroll the student
            self._enroll_student(student_id, course.course_id)
            course.current_enrollment += 1
            
            logger.info(
                f"Filled vacancy in {course.course_id} with student {student_id} "
                f"(score: {score:.4f})"
            )
            
            return AllocationResult(
                student_id=student_id,
                course_id=course.course_id,
                success=True,
                status=RegistrationStatus.REGISTERED,
                message="Auto-registered from waitlist!",
                score=score
            )
        
        finally:
            self.waitlist.release_course_lock(course.course_id)
    
    def process_dropout(self, student_id: str, course: Course) -> Optional[AllocationResult]:
        """
        Process a student dropping a course.
        
        Triggers vacancy fill from waitlist.
        """
        if student_id not in self._enrollments.get(course.course_id, set()):
            return None
        
        # Remove enrollment
        self._enrollments[course.course_id].discard(student_id)
        self._student_courses[student_id].discard(course.course_id)
        course.current_enrollment -= 1
        
        logger.info(f"Student {student_id} dropped course {course.course_id}")
        
        # Fill the vacancy
        return self.fill_vacancy(course)
    
    def _check_prerequisites(self, student: Student, course: Course) -> bool:
        """Check if student has completed all prerequisites."""
        if not course.prerequisites:
            return True
        
        completed = set(student.completed_courses)
        required = set(course.prerequisites)
        
        return required.issubset(completed)
    
    def _enroll_student(self, student_id: str, course_id: str) -> None:
        """Record student enrollment."""
        self._enrollments[course_id].add(student_id)
        self._student_courses[student_id].add(course_id)
    
    def get_student_enrollments(self, student_id: str) -> set[str]:
        """Get all courses a student is enrolled in."""
        return self._student_courses.get(student_id, set()).copy()
    
    def get_course_enrollments(self, course_id: str) -> set[str]:
        """Get all students enrolled in a course."""
        return self._enrollments.get(course_id, set()).copy()