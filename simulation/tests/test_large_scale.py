"""
Large-scale stress test: 800 students competing for 200 seats.

This demonstrates how the system handles high contention scenarios
where the university must select the best candidates.
"""

import sys
import os
from datetime import datetime, timedelta
import random

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from models.entities import Student, Course, StudentCoursePreferences, CourseBookingState
from core.allocation import AllocationStrategy
from services.registration_service import create_registration_service


def generate_large_dataset(num_students=800, course_capacity=200):
    """Generate a large dataset for stress testing."""
    
    # Create a highly competitive course
    course = Course(
        course_id="ML500",
        name="Advanced Machine Learning (Limited Enrollment)",
        department="Computer Science",
        capacity=course_capacity,
        prerequisites=["CS201", "MATH201"],
        tags=["machine-learning", "ai", "deep-learning", "python", "data-science"],
        booking_state=CourseBookingState.BOOKING_CLOSED,
        min_gpa=2.5,
        preferred_years=[3, 4]
    )
    
    # Generate students with varying profiles
    students = []
    preferences = []
    
    interest_pool = [
        "machine-learning", "ai", "deep-learning", "python", "data-science",
        "algorithms", "statistics", "math", "programming", "research"
    ]
    
    for i in range(num_students):
        # Generate realistic GPA distribution (normal distribution around 3.0)
        gpa = min(4.0, max(2.0, random.gauss(3.0, 0.5)))
        gpa = round(gpa, 2)
        
        # Random year distribution
        year = random.choices([2, 3, 4], weights=[0.2, 0.5, 0.3])[0]
        
        # Random interests (2-5 interests per student)
        num_interests = random.randint(2, 5)
        interests = random.sample(interest_pool, num_interests)
        
        # Most students have completed prerequisites
        has_prereqs = random.random() < 0.85
        completed = ["CS101", "CS201", "MATH201"] if has_prereqs else ["CS101"]
        
        student = Student(
            student_id=f"STU{i:04d}",
            name=f"Student {i:04d}",
            email=f"student{i:04d}@university.edu",
            gpa=gpa,
            major="Computer Science",
            year=year,
            interests=interests,
            completed_courses=completed
        )
        students.append(student)
        
        # All students want this course as their top choice
        pref = StudentCoursePreferences(
            student_id=student.student_id,
            course_ids=["ML500"]
        )
        preferences.append(pref)
    
    return course, students, preferences


def run_large_scale_test():
    """Run the 800 students / 200 seats test."""
    print("\n" + "="*70)
    print("STRESS TEST: 800 Students Competing for 200 Seats")
    print("="*70)
    
    # Create service
    service = create_registration_service(
        gpa_weight=0.40,      # University values academic performance
        interest_weight=0.25,  # Interest match matters
        time_weight=0.20,      # Early birds get some advantage
        year_weight=0.10,      # Slight preference for upperclassmen
        prereq_weight=0.05,    # Must have prerequisites
        allocation_strategy=AllocationStrategy.BALANCED
    )
    
    # Generate data
    print("\nGenerating 800 students...")
    course, students, preferences = generate_large_dataset(800, 200)
    
    # Setup
    service.add_course(course)
    for student in students:
        service.add_student(student)
    for pref in preferences:
        service.set_preferences(pref)
    
    # Open booking
    service.open_booking(course.course_id)
    
    # Students apply over a 24-hour period (simulating realistic behavior)
    print("Students applying over 24-hour period...")
    base_time = datetime.utcnow()
    
    for i, student in enumerate(students):
        # Spread applications over 24 hours with some clustering
        hours_offset = random.gauss(12, 6)  # Most apply around hour 12
        hours_offset = max(0, min(24, hours_offset))
        applied_at = base_time + timedelta(hours=hours_offset)
        
        service.apply(student.student_id, course.course_id, applied_at)
    
    # Check waitlist before allocation
    print("\n--- Pre-Allocation Statistics ---")
    status = service.get_course_status(course.course_id)
    print(f"Course: {course.name}")
    print(f"Capacity: {status['capacity']}")
    print(f"Total applicants: {status['waitlist_size']}")
    
    # Show top 10 candidates
    print("\nTop 10 candidates before allocation:")
    print("-" * 50)
    for i, candidate in enumerate(status['top_waitlisted'][:10], 1):
        student = service.get_student(candidate['student_id'])
        print(f"  {i:2d}. {candidate['student_id']} | GPA: {student.gpa:.2f} | "
              f"Year: {student.year} | Score: {candidate['score']:.4f}")
    
    # Run allocation
    print("\n--- Running Batch Allocation ---")
    import time
    start = time.time()
    results = service.run_allocation()
    elapsed = time.time() - start
    print(f"Allocation completed in {elapsed:.3f} seconds")
    
    # Post-allocation statistics
    print("\n--- Post-Allocation Statistics ---")
    status = service.get_course_status(course.course_id)
    print(f"Enrolled: {status['current_enrollment']}/{status['capacity']}")
    print(f"Remaining on waitlist: {status['waitlist_size']}")
    
    # Analyze admitted students
    enrolled_ids = status['enrolled_students']
    enrolled_students = [service.get_student(sid) for sid in enrolled_ids]
    
    gpas = [s.gpa for s in enrolled_students]
    years = [s.year for s in enrolled_students]
    
    print(f"\n--- Admitted Student Profile ---")
    print(f"GPA Statistics:")
    print(f"  Mean: {sum(gpas)/len(gpas):.3f}")
    print(f"  Min:  {min(gpas):.2f}")
    print(f"  Max:  {max(gpas):.2f}")
    
    print(f"\nYear Distribution:")
    for y in [2, 3, 4]:
        count = years.count(y)
        pct = count / len(years) * 100
        print(f"  Year {y}: {count} students ({pct:.1f}%)")
    
    # Compare with rejected students
    rejected_ids = [s.student_id for s in students if s.student_id not in enrolled_ids]
    rejected_students = [service.get_student(sid) for sid in rejected_ids[:100]]  # Sample
    rejected_gpas = [s.gpa for s in rejected_students if s]
    
    print(f"\n--- Comparison with Rejected Students (sample of 100) ---")
    if rejected_gpas:
        print(f"Rejected GPA Mean: {sum(rejected_gpas)/len(rejected_gpas):.3f}")
        print(f"Admitted GPA Mean: {sum(gpas)/len(gpas):.3f}")
        print(f"Difference: {sum(gpas)/len(gpas) - sum(rejected_gpas)/len(rejected_gpas):.3f}")
    
    # Show cutoff score
    print(f"\n--- Admission Cutoff ---")
    waitlisted = service.waitlist_manager.get_all_waitlisted(course.course_id)
    if waitlisted:
        top_waitlisted_score = waitlisted[0][1]
        bottom_enrolled = min(
            service.waitlist_manager.get_student_score(course.course_id, sid) or 0
            for sid in enrolled_ids
        )
        print(f"Lowest admitted score: ~{bottom_enrolled:.4f} (approx)")
        print(f"Highest waitlisted score: {top_waitlisted_score:.4f}")
    
    # Test dropout scenario
    print("\n--- Dropout Simulation ---")
    if enrolled_ids:
        dropout_id = enrolled_ids[0]
        dropout_student = service.get_student(dropout_id)
        print(f"Student {dropout_id} (GPA: {dropout_student.gpa:.2f}) dropping course...")
        
        fill_result = service.process_dropout(dropout_id, course.course_id)
        
        if fill_result:
            new_student = service.get_student(fill_result.student_id)
            print(f"Vacancy auto-filled by: {fill_result.student_id}")
            print(f"  GPA: {new_student.gpa:.2f}, Year: {new_student.year}")
            print(f"  Score: {fill_result.score:.4f}")
    
    print("\n" + "="*70)
    print("STRESS TEST COMPLETED")
    print("="*70)


if __name__ == "__main__":
    run_large_scale_test()