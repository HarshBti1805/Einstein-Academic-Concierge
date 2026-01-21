"""
Registration Service - Main orchestrator for the auto-registration system.

This service provides the high-level API for:
- Student course applications
- Batch allocation processing
- Vacancy fills on dropout
- Status queries
"""

import logging
from datetime import datetime
from typing import Optional
from dataclasses import dataclass
from collections import defaultdict
import threading
import time

from models.entities import (
    Student, Course, CourseApplication, AllocationResult,
    RegistrationStatus, CourseBookingState, StudentCoursePreferences
)
from core.scoring import ScoringEngine, ScoringWeights
from core.waitlist import WaitlistManager
from core.allocation import AllocationEngine, BatchAllocationConfig, AllocationStrategy

logger = logging.getLogger(__name__)


@dataclass
class RegistrationConfig:
    """Configuration for the registration service."""
    scoring_weights: ScoringWeights = None
    allocation_config: BatchAllocationConfig = None
    batch_interval_seconds: int = 300  # 5 minutes
    enable_auto_batch: bool = True
    time_decay_hours: float = 168.0  # 1 week
    
    def __post_init__(self):
        if self.scoring_weights is None:
            self.scoring_weights = ScoringWeights()
        if self.allocation_config is None:
            self.allocation_config = BatchAllocationConfig()


class RegistrationService:
    """
    Main service for managing course registrations.
    
    Usage:
        service = RegistrationService()
        
        # Add students and courses
        service.add_student(student)
        service.add_course(course)
        
        # Student applies for courses
        result = service.apply(student_id, course_id, preferences)
        
        # Run batch allocation
        results = service.run_allocation()
        
        # Handle dropout
        service.process_dropout(student_id, course_id)
    """
    
    def __init__(self, config: Optional[RegistrationConfig] = None):
        self.config = config or RegistrationConfig()
        
        # Initialize components
        self.waitlist_manager = WaitlistManager()
        self.scoring_engine = ScoringEngine(
            weights=self.config.scoring_weights,
            time_decay_hours=self.config.time_decay_hours
        )
        self.allocation_engine = AllocationEngine(
            waitlist_manager=self.waitlist_manager,
            scoring_engine=self.scoring_engine,
            config=self.config.allocation_config
        )
        
        # Data stores (in production, use database)
        self._students: dict[str, Student] = {}
        self._courses: dict[str, Course] = {}
        self._preferences: dict[str, StudentCoursePreferences] = {}
        
        # Batch processing
        self._batch_thread: Optional[threading.Thread] = None
        self._stop_batch = threading.Event()
        
        logger.info("RegistrationService initialized")
    
    # ==================== Data Management ====================
    
    def add_student(self, student: Student) -> None:
        """Add or update a student in the system."""
        self._students[student.student_id] = student
        logger.debug(f"Added student: {student.student_id}")
    
    def add_course(self, course: Course) -> None:
        """Add or update a course in the system."""
        self._courses[course.course_id] = course
        
        # Set booking open time for scoring
        if course.booking_opens_at:
            self.scoring_engine.set_booking_open_time(
                course.course_id, 
                course.booking_opens_at
            )
        
        logger.debug(f"Added course: {course.course_id}")
    
    def set_preferences(self, preferences: StudentCoursePreferences) -> None:
        """Set a student's course preferences (from your recommendation system)."""
        self._preferences[preferences.student_id] = preferences
        logger.debug(f"Set preferences for student: {preferences.student_id}")
    
    def get_student(self, student_id: str) -> Optional[Student]:
        """Get a student by ID."""
        return self._students.get(student_id)
    
    def get_course(self, course_id: str) -> Optional[Course]:
        """Get a course by ID."""
        return self._courses.get(course_id)
    
    # ==================== Registration Operations ====================
    
    def apply(
        self,
        student_id: str,
        course_id: str,
        applied_at: Optional[datetime] = None
    ) -> AllocationResult:
        """
        Submit a course application for a student.
        
        The student will be added to the waitlist and scored based on
        GPA, interest match, application time, and other factors.
        
        Args:
            student_id: The student's ID
            course_id: The course to apply for
            applied_at: Application timestamp (default: now)
        
        Returns:
            AllocationResult with status and waitlist position
        """
        student = self._students.get(student_id)
        if not student:
            return AllocationResult(
                student_id=student_id,
                course_id=course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="Student not found"
            )
        
        course = self._courses.get(course_id)
        if not course:
            return AllocationResult(
                student_id=student_id,
                course_id=course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="Course not found"
            )
        
        preferences = self._preferences.get(student_id)
        if not preferences:
            # Create default preferences with just this course
            preferences = StudentCoursePreferences(
                student_id=student_id,
                course_ids=[course_id]
            )
        
        return self.allocation_engine.apply_for_course(
            student=student,
            course=course,
            preferences=preferences,
            applied_at=applied_at
        )
    
    def apply_all(
        self,
        student_id: str,
        applied_at: Optional[datetime] = None
    ) -> list[AllocationResult]:
        """
        Apply for all courses in a student's preferences.
        
        Args:
            student_id: The student's ID
            applied_at: Application timestamp (default: now)
        
        Returns:
            List of AllocationResults for each course
        """
        preferences = self._preferences.get(student_id)
        if not preferences:
            return [AllocationResult(
                student_id=student_id,
                course_id="",
                success=False,
                status=RegistrationStatus.REJECTED,
                message="No preferences set for student"
            )]
        
        results = []
        for course_id in preferences.course_ids:
            result = self.apply(student_id, course_id, applied_at)
            results.append(result)
        
        return results
    
    def manual_register(
        self,
        student_id: str,
        course_id: str
    ) -> AllocationResult:
        """
        Attempt immediate manual registration.
        
        Only works if:
        - Booking is open
        - There is a vacancy
        
        Args:
            student_id: The student's ID
            course_id: The course to register for
        
        Returns:
            AllocationResult with registration status
        """
        student = self._students.get(student_id)
        if not student:
            return AllocationResult(
                student_id=student_id,
                course_id=course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="Student not found"
            )
        
        course = self._courses.get(course_id)
        if not course:
            return AllocationResult(
                student_id=student_id,
                course_id=course_id,
                success=False,
                status=RegistrationStatus.REJECTED,
                message="Course not found"
            )
        
        return self.allocation_engine.manual_register(student, course)
    
    # ==================== Batch Allocation ====================
    
    def run_allocation(
        self,
        course_ids: Optional[list[str]] = None
    ) -> dict[str, list[AllocationResult]]:
        """
        Run batch allocation for specified courses (or all courses).
        
        This processes waitlists and allocates students based on scores.
        
        Args:
            course_ids: Specific courses to allocate (default: all)
        
        Returns:
            Dict mapping student_id to list of allocation results
        """
        if course_ids:
            courses = [self._courses[cid] for cid in course_ids if cid in self._courses]
        else:
            courses = list(self._courses.values())
        
        # Filter to courses accepting applications
        eligible_courses = [
            c for c in courses 
            if c.booking_state in [
                CourseBookingState.BOOKING_OPEN,
                CourseBookingState.BOOKING_CLOSED
            ]
        ]
        
        logger.info(f"Running batch allocation for {len(eligible_courses)} courses")
        
        results = self.allocation_engine.run_batch_allocation(
            courses=eligible_courses,
            student_preferences=self._preferences,
            students=self._students
        )
        
        logger.info(f"Batch allocation complete. Allocated {len(results)} students")
        
        return results
    
    def start_auto_batch(self) -> None:
        """Start automatic batch processing in background thread."""
        if self._batch_thread and self._batch_thread.is_alive():
            logger.warning("Auto-batch already running")
            return
        
        self._stop_batch.clear()
        self._batch_thread = threading.Thread(target=self._batch_loop, daemon=True)
        self._batch_thread.start()
        logger.info(f"Started auto-batch processing (interval: {self.config.batch_interval_seconds}s)")
    
    def stop_auto_batch(self) -> None:
        """Stop automatic batch processing."""
        self._stop_batch.set()
        if self._batch_thread:
            self._batch_thread.join(timeout=5)
        logger.info("Stopped auto-batch processing")
    
    def _batch_loop(self) -> None:
        """Background loop for periodic batch allocation."""
        while not self._stop_batch.is_set():
            try:
                self.run_allocation()
            except Exception as e:
                logger.error(f"Error in batch allocation: {e}")
            
            # Wait for next interval
            self._stop_batch.wait(timeout=self.config.batch_interval_seconds)
    
    # ==================== Dropout and Vacancy Fill ====================
    
    def process_dropout(
        self,
        student_id: str,
        course_id: str
    ) -> Optional[AllocationResult]:
        """
        Process a student dropping a course.
        
        Automatically fills the vacancy from the waitlist.
        
        Args:
            student_id: The dropping student's ID
            course_id: The course being dropped
        
        Returns:
            AllocationResult for the student who filled the vacancy (if any)
        """
        course = self._courses.get(course_id)
        if not course:
            logger.error(f"Course not found: {course_id}")
            return None
        
        result = self.allocation_engine.process_dropout(student_id, course)
        
        if result:
            logger.info(
                f"Vacancy in {course_id} filled by student {result.student_id}"
            )
        
        return result
    
    # ==================== Status Queries ====================
    
    def get_waitlist_status(
        self,
        student_id: str,
        course_id: str
    ) -> dict:
        """
        Get a student's waitlist status for a course.
        
        Returns:
            Dict with position, score, and waitlist size
        """
        position = self.waitlist_manager.get_waitlist_position(course_id, student_id)
        score = self.waitlist_manager.get_student_score(course_id, student_id)
        size = self.waitlist_manager.get_waitlist_size(course_id)
        
        course = self._courses.get(course_id)
        
        return {
            "student_id": student_id,
            "course_id": course_id,
            "position": position,
            "score": score,
            "waitlist_size": size,
            "available_seats": course.available_seats if course else 0,
            "is_enrolled": student_id in self.allocation_engine.get_course_enrollments(course_id)
        }
    
    def get_student_status(self, student_id: str) -> dict:
        """
        Get comprehensive status for a student.
        
        Returns:
            Dict with enrollments and waitlist positions
        """
        enrolled = self.allocation_engine.get_student_enrollments(student_id)
        preferences = self._preferences.get(student_id)
        
        waitlist_positions = {}
        if preferences:
            for course_id in preferences.course_ids:
                if course_id not in enrolled:
                    pos = self.waitlist_manager.get_waitlist_position(course_id, student_id)
                    if pos:
                        waitlist_positions[course_id] = pos
        
        return {
            "student_id": student_id,
            "enrolled_courses": list(enrolled),
            "waitlist_positions": waitlist_positions,
            "preferences": preferences.course_ids if preferences else []
        }
    
    def get_course_status(self, course_id: str) -> dict:
        """
        Get comprehensive status for a course.
        
        Returns:
            Dict with enrollment info and waitlist stats
        """
        course = self._courses.get(course_id)
        if not course:
            return {"error": "Course not found"}
        
        enrolled = self.allocation_engine.get_course_enrollments(course_id)
        waitlist_size = self.waitlist_manager.get_waitlist_size(course_id)
        top_candidates = self.waitlist_manager.get_top_candidates(course_id, 10)
        
        return {
            "course_id": course_id,
            "course_name": course.name,
            "capacity": course.capacity,
            "current_enrollment": course.current_enrollment,
            "available_seats": course.available_seats,
            "booking_state": course.booking_state.value,
            "waitlist_size": waitlist_size,
            "top_waitlisted": [
                {"student_id": sid, "score": score} 
                for sid, score in top_candidates
            ],
            "enrolled_students": list(enrolled)
        }
    
    # ==================== Course State Management ====================
    
    def open_booking(self, course_id: str) -> bool:
        """Open booking for a course."""
        course = self._courses.get(course_id)
        if not course:
            return False
        
        course.booking_state = CourseBookingState.BOOKING_OPEN
        course.booking_opens_at = datetime.utcnow()
        self.scoring_engine.set_booking_open_time(course_id, course.booking_opens_at)
        
        logger.info(f"Opened booking for course: {course_id}")
        return True
    
    def close_booking(self, course_id: str) -> bool:
        """Close booking for a course (course started)."""
        course = self._courses.get(course_id)
        if not course:
            return False
        
        course.booking_state = CourseBookingState.COURSE_STARTED
        logger.info(f"Closed booking for course: {course_id}")
        return True
    
    def complete_course(self, course_id: str) -> bool:
        """Mark a course as completed."""
        course = self._courses.get(course_id)
        if not course:
            return False
        
        course.booking_state = CourseBookingState.COURSE_COMPLETED
        logger.info(f"Marked course as completed: {course_id}")
        return True


# Convenience function for creating a configured service
def create_registration_service(
    gpa_weight: float = 0.35,
    interest_weight: float = 0.30,
    time_weight: float = 0.20,
    year_weight: float = 0.10,
    prereq_weight: float = 0.05,
    allocation_strategy: AllocationStrategy = AllocationStrategy.BALANCED,
    max_courses_per_student: int = 5,
    batch_interval_seconds: int = 300
) -> RegistrationService:
    """
    Create a registration service with custom configuration.
    
    Args:
        gpa_weight: Weight for GPA in scoring (default: 0.35)
        interest_weight: Weight for interest match (default: 0.30)
        time_weight: Weight for early application bonus (default: 0.20)
        year_weight: Weight for year fit (default: 0.10)
        prereq_weight: Weight for prerequisite completion (default: 0.05)
        allocation_strategy: Strategy for batch allocation
        max_courses_per_student: Maximum courses a student can be allocated
        batch_interval_seconds: Interval between automatic batch runs
    
    Returns:
        Configured RegistrationService instance
    """
    config = RegistrationConfig(
        scoring_weights=ScoringWeights(
            gpa_weight=gpa_weight,
            interest_weight=interest_weight,
            time_weight=time_weight,
            year_fit_weight=year_weight,
            prerequisite_weight=prereq_weight
        ),
        allocation_config=BatchAllocationConfig(
            strategy=allocation_strategy,
            max_courses_per_student=max_courses_per_student
        ),
        batch_interval_seconds=batch_interval_seconds
    )
    
    return RegistrationService(config)