"""
Comprehensive tests and demo for the Auto-Registration System.

This file demonstrates the full workflow:
1. Setting up courses and students
2. Students applying for courses
3. Running batch allocation
4. Handling dropouts
5. Checking status
"""

import sys
import os
from datetime import datetime, timedelta
import random

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.entities import (
    Student, Course, StudentCoursePreferences,
    CourseBookingState, RegistrationStatus
)
from core.scoring import ScoringEngine, ScoringWeights
from core.allocation import AllocationStrategy
from services.registration_service import RegistrationService, create_registration_service


def create_sample_data():
    """Create sample students and courses for testing."""
    
    courses = [
        Course(
            course_id="CS101", name="Introduction to Computer Science",
            department="Computer Science", capacity=30,
            tags=["programming", "algorithms", "cs", "beginner"],
            booking_state=CourseBookingState.BOOKING_CLOSED,
            min_gpa=2.0, preferred_years=[1, 2]
        ),
        Course(
            course_id="CS201", name="Data Structures and Algorithms",
            department="Computer Science", capacity=25,
            prerequisites=["CS101"],
            tags=["algorithms", "data-structures", "programming", "cs"],
            booking_state=CourseBookingState.BOOKING_CLOSED,
            min_gpa=2.5, preferred_years=[2, 3]
        ),
        Course(
            course_id="ML301", name="Introduction to Machine Learning",
            department="Computer Science", capacity=20,
            prerequisites=["CS201"],
            tags=["machine-learning", "ai", "data-science", "python"],
            booking_state=CourseBookingState.BOOKING_CLOSED,
            min_gpa=3.0, preferred_years=[3, 4]
        ),
        Course(
            course_id="MATH201", name="Linear Algebra",
            department="Mathematics", capacity=40,
            tags=["math", "linear-algebra", "matrices"],
            booking_state=CourseBookingState.BOOKING_CLOSED,
            min_gpa=2.5, preferred_years=[2, 3]
        ),
        Course(
            course_id="STAT301", name="Statistical Methods",
            department="Statistics", capacity=25,
            prerequisites=["MATH201"],
            tags=["statistics", "data-science", "math"],
            booking_state=CourseBookingState.BOOKING_CLOSED,
            min_gpa=2.5, preferred_years=[3, 4]
        ),
    ]
    
    students = [
        Student(student_id="S001", name="Alice Chen", email="alice@university.edu",
                gpa=3.9, major="Computer Science", year=3,
                interests=["machine-learning", "ai", "python", "data-science"],
                completed_courses=["CS101", "CS201", "MATH201"]),
        Student(student_id="S002", name="Bob Smith", email="bob@university.edu",
                gpa=3.5, major="Computer Science", year=3,
                interests=["algorithms", "data-structures", "programming"],
                completed_courses=["CS101", "CS201"]),
        Student(student_id="S003", name="Carol Davis", email="carol@university.edu",
                gpa=3.7, major="Data Science", year=3,
                interests=["machine-learning", "statistics", "data-science", "python"],
                completed_courses=["CS101", "CS201", "MATH201"]),
        Student(student_id="S004", name="David Lee", email="david@university.edu",
                gpa=3.2, major="Computer Science", year=2,
                interests=["programming", "algorithms", "cs"],
                completed_courses=["CS101"]),
        Student(student_id="S005", name="Eva Martinez", email="eva@university.edu",
                gpa=3.8, major="Mathematics", year=3,
                interests=["math", "linear-algebra", "statistics"],
                completed_courses=["CS101", "CS201", "MATH201"]),
        Student(student_id="S006", name="Frank Wilson", email="frank@university.edu",
                gpa=2.9, major="Computer Science", year=4,
                interests=["machine-learning", "ai"],
                completed_courses=["CS101", "CS201", "MATH201"]),
        Student(student_id="S007", name="Grace Kim", email="grace@university.edu",
                gpa=3.95, major="Computer Science", year=4,
                interests=["machine-learning", "ai", "data-science", "algorithms"],
                completed_courses=["CS101", "CS201", "MATH201"]),
        Student(student_id="S008", name="Henry Brown", email="henry@university.edu",
                gpa=3.1, major="Statistics", year=3,
                interests=["statistics", "data-science", "math"],
                completed_courses=["CS101", "MATH201"]),
    ]
    
    preferences = [
        StudentCoursePreferences(student_id="S001", course_ids=["ML301", "STAT301", "CS201", "MATH201", "CS101"]),
        StudentCoursePreferences(student_id="S002", course_ids=["CS201", "ML301", "MATH201", "CS101", "STAT301"]),
        StudentCoursePreferences(student_id="S003", course_ids=["ML301", "STAT301", "MATH201", "CS201", "CS101"]),
        StudentCoursePreferences(student_id="S004", course_ids=["CS201", "MATH201", "CS101", "ML301", "STAT301"]),
        StudentCoursePreferences(student_id="S005", course_ids=["STAT301", "MATH201", "ML301", "CS201", "CS101"]),
        StudentCoursePreferences(student_id="S006", course_ids=["ML301", "CS201", "STAT301", "MATH201", "CS101"]),
        StudentCoursePreferences(student_id="S007", course_ids=["ML301", "STAT301", "CS201", "MATH201", "CS101"]),
        StudentCoursePreferences(student_id="S008", course_ids=["STAT301", "MATH201", "CS101", "CS201", "ML301"]),
    ]
    
    return courses, students, preferences


def test_scoring_engine():
    """Test the scoring engine in isolation."""
    print("\n" + "="*60)
    print("TEST: Scoring Engine")
    print("="*60)
    
    engine = ScoringEngine()
    
    student = Student(
        student_id="TEST001", name="Test Student", email="test@test.edu",
        gpa=3.5, major="CS", year=3,
        interests=["machine-learning", "ai", "python"],
        completed_courses=["CS101", "CS201"]
    )
    
    course = Course(
        course_id="ML301", name="Machine Learning", department="CS",
        capacity=20, prerequisites=["CS101", "CS201"],
        tags=["machine-learning", "ai", "python", "data-science"],
        min_gpa=3.0, preferred_years=[3, 4]
    )
    
    booking_open = datetime.utcnow() - timedelta(hours=1)
    engine.set_booking_open_time("ML301", booking_open)
    
    application = engine.compute_score(
        student=student, course=course,
        applied_at=datetime.utcnow(), student_priority=1
    )
    
    print(f"\nStudent: {student.name} (GPA: {student.gpa})")
    print(f"Course: {course.name}")
    print(f"\nScore Breakdown:")
    print(f"  GPA Score:          {application.gpa_score:.4f}")
    print(f"  Interest Score:     {application.interest_score:.4f}")
    print(f"  Time Score:         {application.time_score:.4f}")
    print(f"  Year Fit Score:     {application.year_score:.4f}")
    print(f"  --------------------------")
    print(f"  Composite Score:    {application.composite_score:.4f}")
    
    print("\n  Time Score Decay Test:")
    for hours in [0, 6, 24, 72, 168]:
        applied_at = booking_open + timedelta(hours=hours)
        app = engine.compute_score(student, course, applied_at, 1)
        print(f"    +{hours:3d} hours: {app.time_score:.4f}")


def test_waitlist_manager():
    """Test the waitlist manager."""
    print("\n" + "="*60)
    print("TEST: Waitlist Manager")
    print("="*60)
    
    from core.waitlist import WaitlistManager
    from models.entities import CourseApplication
    
    manager = WaitlistManager()
    course_id = "TEST_COURSE"
    
    applications = [
        CourseApplication(student_id="S1", course_id=course_id, composite_score=0.85),
        CourseApplication(student_id="S2", course_id=course_id, composite_score=0.92),
        CourseApplication(student_id="S3", course_id=course_id, composite_score=0.78),
        CourseApplication(student_id="S4", course_id=course_id, composite_score=0.88),
        CourseApplication(student_id="S5", course_id=course_id, composite_score=0.95),
    ]
    
    print("\nAdding applications to waitlist...")
    for app in applications:
        manager.add_to_waitlist(app)
        print(f"  Added {app.student_id} with score {app.composite_score}")
    
    print(f"\nWaitlist size: {manager.get_waitlist_size(course_id)}")
    
    print("\nWaitlist positions (highest score = position 1):")
    for app in applications:
        pos = manager.get_waitlist_position(course_id, app.student_id)
        score = manager.get_student_score(course_id, app.student_id)
        print(f"  {app.student_id}: Position {pos}, Score {score:.4f}")
    
    print("\nTop 3 candidates:")
    for student_id, score in manager.get_top_candidates(course_id, 3):
        print(f"  {student_id}: {score:.4f}")
    
    print("\nPopping top candidate...")
    popped = manager.pop_top_candidate(course_id)
    if popped:
        print(f"  Removed: {popped[0]} (score: {popped[1]:.4f})")
    
    print(f"\nNew waitlist size: {manager.get_waitlist_size(course_id)}")


def test_full_workflow():
    """Test the complete registration workflow."""
    print("\n" + "="*60)
    print("TEST: Full Registration Workflow")
    print("="*60)
    
    service = create_registration_service(
        gpa_weight=0.35, interest_weight=0.30, time_weight=0.20,
        year_weight=0.10, prereq_weight=0.05,
        allocation_strategy=AllocationStrategy.BALANCED
    )
    
    courses, students, preferences = create_sample_data()
    
    print("\n--- Setting up data ---")
    for course in courses:
        service.add_course(course)
        print(f"Added course: {course.course_id} ({course.name})")
    
    for student in students:
        service.add_student(student)
    print(f"Added {len(students)} students")
    
    for pref in preferences:
        service.set_preferences(pref)
    
    print("\n--- Opening bookings ---")
    for course in courses:
        service.open_booking(course.course_id)
    
    print("\n--- Students applying ---")
    base_time = datetime.utcnow()
    
    for i, student in enumerate(students):
        applied_at = base_time + timedelta(minutes=i * 5)
        results = service.apply_all(student.student_id, applied_at)
        
        print(f"\n{student.name} (GPA: {student.gpa}):")
        for result in results:
            if result.status == RegistrationStatus.WAITLISTED:
                print(f"  {result.course_id}: pos {result.waitlist_position}, score {result.score:.4f}")
    
    print("\n--- Running Batch Allocation ---")
    results = service.run_allocation()
    
    print("\nAllocation Results:")
    for student_id, student_results in results.items():
        student = service.get_student(student_id)
        print(f"\n{student.name}:")
        for result in student_results:
            if result.success:
                print(f"  ✓ REGISTERED for {result.course_id}")
            else:
                print(f"  ○ Waitlisted for {result.course_id} (pos: {result.waitlist_position})")
    
    print("\n--- Final Status ---")
    for course in courses:
        status = service.get_course_status(course.course_id)
        print(f"\n{course.course_id}: {status['current_enrollment']}/{status['capacity']} enrolled, "
              f"{status['waitlist_size']} waitlisted")
    
    # Simulate dropout
    print("\n--- Simulating Dropout ---")
    ml301_status = service.get_course_status("ML301")
    if ml301_status['enrolled_students']:
        dropout = ml301_status['enrolled_students'][0]
        print(f"{dropout} dropping ML301...")
        fill_result = service.process_dropout(dropout, "ML301")
        if fill_result:
            print(f"Vacancy filled by: {fill_result.student_id}")


if __name__ == "__main__":
    test_scoring_engine()
    test_waitlist_manager()
    test_full_workflow()
    print("\n" + "="*60)
    print("ALL TESTS COMPLETED")
    print("="*60)