"""
Auto-Registration System - Main Entry Point

This module provides a simple API for integrating the registration system
with your existing application.

Usage:
    from main import AutoRegistrationSystem
    
    # Initialize
    system = AutoRegistrationSystem()
    
    # Add your data
    system.add_student(student_data)
    system.add_course(course_data)
    system.set_student_preferences(student_id, course_ids)
    
    # Student applies
    result = system.apply(student_id, course_id)
    
    # Run allocation
    system.run_allocation()
    
    # Handle dropout
    system.process_dropout(student_id, course_id)
"""

from datetime import datetime
from typing import Optional
from dataclasses import dataclass

from models.entities import (
    Student, Course, StudentCoursePreferences,
    CourseBookingState, RegistrationStatus, AllocationResult
)
from core.allocation import AllocationStrategy
from services.registration_service import (
    RegistrationService, create_registration_service, RegistrationConfig
)


class AutoRegistrationSystem:
    """
    High-level API for the auto-registration system.
    
    This class wraps the internal services and provides a clean interface
    for integration with your existing application.
    """
    
    def __init__(
        self,
        gpa_weight: float = 0.35,
        interest_weight: float = 0.30,
        time_weight: float = 0.20,
        year_weight: float = 0.10,
        prereq_weight: float = 0.05,
        strategy: str = "balanced",
        batch_interval_seconds: int = 300
    ):
        """
        Initialize the auto-registration system.
        
        Args:
            gpa_weight: Weight for GPA in scoring (0-1)
            interest_weight: Weight for interest match (0-1)
            time_weight: Weight for early application bonus (0-1)
            year_weight: Weight for year fit (0-1)
            prereq_weight: Weight for prerequisite completion (0-1)
            strategy: Allocation strategy ("balanced", "student_optimal", "greedy")
            batch_interval_seconds: Interval for automatic batch processing
        """
        strategy_map = {
            "balanced": AllocationStrategy.BALANCED,
            "student_optimal": AllocationStrategy.STUDENT_OPTIMAL,
            "greedy": AllocationStrategy.GREEDY,
            "course_optimal": AllocationStrategy.COURSE_OPTIMAL,
        }
        
        self._service = create_registration_service(
            gpa_weight=gpa_weight,
            interest_weight=interest_weight,
            time_weight=time_weight,
            year_weight=year_weight,
            prereq_weight=prereq_weight,
            allocation_strategy=strategy_map.get(strategy, AllocationStrategy.BALANCED),
            batch_interval_seconds=batch_interval_seconds
        )
    
    # ==================== Student Management ====================
    
    def add_student(
        self,
        student_id: str,
        name: str,
        email: str,
        gpa: float,
        major: str,
        year: int,
        interests: list[str] = None,
        completed_courses: list[str] = None
    ) -> None:
        """Add a student to the system."""
        student = Student(
            student_id=student_id,
            name=name,
            email=email,
            gpa=gpa,
            major=major,
            year=year,
            interests=interests or [],
            completed_courses=completed_courses or []
        )
        self._service.add_student(student)
    
    def add_student_from_dict(self, data: dict) -> None:
        """Add a student from a dictionary (e.g., from your database)."""
        student = Student(
            student_id=data["student_id"],
            name=data.get("name", ""),
            email=data.get("email", ""),
            gpa=data.get("gpa", 0.0),
            major=data.get("major", ""),
            year=data.get("year", 1),
            interests=data.get("interests", []),
            completed_courses=data.get("completed_courses", [])
        )
        self._service.add_student(student)
    
    # ==================== Course Management ====================
    
    def add_course(
        self,
        course_id: str,
        name: str,
        department: str,
        capacity: int,
        prerequisites: list[str] = None,
        tags: list[str] = None,
        min_gpa: float = 0.0,
        preferred_years: list[int] = None
    ) -> None:
        """Add a course to the system."""
        course = Course(
            course_id=course_id,
            name=name,
            department=department,
            capacity=capacity,
            prerequisites=prerequisites or [],
            tags=tags or [],
            min_gpa=min_gpa,
            preferred_years=preferred_years or [1, 2, 3, 4],
            booking_state=CourseBookingState.BOOKING_CLOSED
        )
        self._service.add_course(course)
    
    def add_course_from_dict(self, data: dict) -> None:
        """Add a course from a dictionary."""
        course = Course(
            course_id=data["course_id"],
            name=data.get("name", ""),
            department=data.get("department", ""),
            capacity=data.get("capacity", 30),
            prerequisites=data.get("prerequisites", []),
            tags=data.get("tags", []),
            min_gpa=data.get("min_gpa", 0.0),
            preferred_years=data.get("preferred_years", [1, 2, 3, 4]),
            booking_state=CourseBookingState.BOOKING_CLOSED
        )
        self._service.add_course(course)
    
    def open_booking(self, course_id: str) -> bool:
        """Open booking for a course."""
        return self._service.open_booking(course_id)
    
    def close_booking(self, course_id: str) -> bool:
        """Close booking (course started)."""
        return self._service.close_booking(course_id)
    
    # ==================== Preferences ====================
    
    def set_student_preferences(
        self,
        student_id: str,
        course_ids: list[str]
    ) -> None:
        """
        Set a student's course preferences.
        
        This should be called with the output from your recommendation system.
        course_ids should be ordered by priority (first = most preferred).
        """
        preferences = StudentCoursePreferences(
            student_id=student_id,
            course_ids=course_ids
        )
        self._service.set_preferences(preferences)
    
    # ==================== Registration ====================
    
    def apply(
        self,
        student_id: str,
        course_id: str,
        applied_at: datetime = None
    ) -> dict:
        """
        Submit a course application.
        
        Returns dict with:
            - success: bool
            - status: "registered", "waitlisted", "rejected", "dropped"
            - message: str
            - waitlist_position: int or None
            - score: float or None
        """
        result = self._service.apply(student_id, course_id, applied_at)
        return self._result_to_dict(result)
    
    def apply_all(self, student_id: str) -> list[dict]:
        """Apply for all courses in student's preferences."""
        results = self._service.apply_all(student_id)
        return [self._result_to_dict(r) for r in results]
    
    def manual_register(self, student_id: str, course_id: str) -> dict:
        """
        Attempt immediate registration (only if vacancy exists and booking open).
        """
        result = self._service.manual_register(student_id, course_id)
        return self._result_to_dict(result)
    
    # ==================== Allocation ====================
    
    def run_allocation(self, course_ids: list[str] = None) -> dict:
        """
        Run batch allocation.
        
        Returns dict mapping student_id to list of allocation results.
        """
        results = self._service.run_allocation(course_ids)
        return {
            student_id: [self._result_to_dict(r) for r in student_results]
            for student_id, student_results in results.items()
        }
    
    def start_auto_allocation(self) -> None:
        """Start automatic batch allocation in background."""
        self._service.start_auto_batch()
    
    def stop_auto_allocation(self) -> None:
        """Stop automatic batch allocation."""
        self._service.stop_auto_batch()
    
    # ==================== Dropout ====================
    
    def process_dropout(self, student_id: str, course_id: str) -> dict:
        """
        Process a student dropping a course.
        
        Returns the allocation result for the student who filled the vacancy,
        or None if no one was waiting.
        """
        result = self._service.process_dropout(student_id, course_id)
        if result:
            return self._result_to_dict(result)
        return None
    
    # ==================== Status Queries ====================
    
    def get_student_status(self, student_id: str) -> dict:
        """Get comprehensive status for a student."""
        return self._service.get_student_status(student_id)
    
    def get_course_status(self, course_id: str) -> dict:
        """Get comprehensive status for a course."""
        return self._service.get_course_status(course_id)
    
    def get_waitlist_position(self, student_id: str, course_id: str) -> dict:
        """Get a student's waitlist position for a specific course."""
        return self._service.get_waitlist_status(student_id, course_id)
    
    # ==================== Helpers ====================
    
    def _result_to_dict(self, result: AllocationResult) -> dict:
        """Convert AllocationResult to dictionary."""
        return {
            "student_id": result.student_id,
            "course_id": result.course_id,
            "success": result.success,
            "status": result.status.value,
            "message": result.message,
            "waitlist_position": result.waitlist_position,
            "score": result.score
        }


# Example usage
if __name__ == "__main__":
    # Initialize system
    system = AutoRegistrationSystem(
        gpa_weight=0.35,
        interest_weight=0.30,
        time_weight=0.20,
        year_weight=0.10,
        prereq_weight=0.05,
        strategy="balanced"
    )
    
    # Add a course
    system.add_course(
        course_id="ML301",
        name="Machine Learning",
        department="CS",
        capacity=20,
        prerequisites=["CS201"],
        tags=["machine-learning", "ai", "python"],
        min_gpa=3.0,
        preferred_years=[3, 4]
    )
    
    # Add a student
    system.add_student(
        student_id="S001",
        name="Alice",
        email="alice@uni.edu",
        gpa=3.8,
        major="CS",
        year=3,
        interests=["machine-learning", "ai"],
        completed_courses=["CS101", "CS201"]
    )
    
    # Set preferences (from your recommendation system)
    system.set_student_preferences("S001", ["ML301"])
    
    # Open booking
    system.open_booking("ML301")
    
    # Student applies
    result = system.apply("S001", "ML301")
    print(f"Application result: {result}")
    
    # Run allocation
    allocations = system.run_allocation()
    print(f"Allocations: {allocations}")
    
    # Check status
    status = system.get_student_status("S001")
    print(f"Student status: {status}")