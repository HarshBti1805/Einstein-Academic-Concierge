"""
Scoring Engine for computing student-course fit scores.

The composite score determines a student's priority in the waitlist.
Higher scores = higher priority = better chance of getting the course.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
import math
from typing import Optional

from models.entities import Student, Course, CourseApplication


@dataclass
class ScoringWeights:
    """
    Configurable weights for the scoring formula.
    All weights should sum to 1.0 for normalized scoring.
    """
    gpa_weight: float = 0.35
    interest_weight: float = 0.30
    time_weight: float = 0.20
    year_fit_weight: float = 0.10
    prerequisite_weight: float = 0.05
    
    def __post_init__(self):
        total = (
            self.gpa_weight + 
            self.interest_weight + 
            self.time_weight + 
            self.year_fit_weight + 
            self.prerequisite_weight
        )
        if not (0.99 <= total <= 1.01):
            raise ValueError(f"Weights must sum to 1.0, got {total}")


class ScoringEngine:
    """
    Computes composite scores for student-course applications.
    
    Score Formula:
        score = (w1 × gpa_score) + (w2 × interest_score) + 
                (w3 × time_score) + (w4 × year_score) + (w5 × prereq_score)
    
    All component scores are normalized to [0, 1].
    Final composite score is in [0, 1], higher is better.
    """
    
    def __init__(
        self, 
        weights: Optional[ScoringWeights] = None,
        time_decay_hours: float = 168.0,  # 1 week
        max_time_bonus: float = 1.0
    ):
        self.weights = weights or ScoringWeights()
        self.time_decay_hours = time_decay_hours
        self.max_time_bonus = max_time_bonus
        self._booking_open_times: dict[str, datetime] = {}
    
    def set_booking_open_time(self, course_id: str, open_time: datetime) -> None:
        """Set when booking opened for a course (for time score calculation)."""
        self._booking_open_times[course_id] = open_time
    
    def compute_score(
        self,
        student: Student,
        course: Course,
        applied_at: datetime,
        student_priority: int = 1
    ) -> CourseApplication:
        """
        Compute the composite score for a student-course application.
        
        Args:
            student: The applying student
            course: The target course
            applied_at: When the application was submitted
            student_priority: Student's preference rank for this course (1 = top choice)
        
        Returns:
            CourseApplication with all scores computed
        """
        # Compute individual score components
        gpa_score = self._compute_gpa_score(student, course)
        interest_score = self._compute_interest_score(student, course)
        time_score = self._compute_time_score(course.course_id, applied_at)
        year_score = self._compute_year_score(student, course)
        prereq_score = self._compute_prerequisite_score(student, course)
        
        # Compute weighted composite score
        composite_score = (
            self.weights.gpa_weight * gpa_score +
            self.weights.interest_weight * interest_score +
            self.weights.time_weight * time_score +
            self.weights.year_fit_weight * year_score +
            self.weights.prerequisite_weight * prereq_score
        )
        
        # Create and return the application
        return CourseApplication(
            student_id=student.student_id,
            course_id=course.course_id,
            priority_rank=student_priority,
            applied_at=applied_at,
            gpa_score=gpa_score,
            interest_score=interest_score,
            time_score=time_score,
            year_score=year_score,
            composite_score=composite_score
        )
    
    def _compute_gpa_score(self, student: Student, course: Course) -> float:
        """
        Compute GPA component score.
        
        - Normalized to [0, 1] assuming 4.0 scale
        - Bonus for exceeding minimum requirements
        - Zero if below minimum GPA requirement
        """
        if student.gpa < course.min_gpa:
            return 0.0  # Doesn't meet minimum requirement
        
        # Normalize GPA to [0, 1]
        base_score = student.gpa / 4.0
        
        # Small bonus for exceeding minimum by a lot
        excess = student.gpa - course.min_gpa
        bonus = min(0.1, excess * 0.05)  # Up to 0.1 bonus
        
        return min(1.0, base_score + bonus)
    
    def _compute_interest_score(self, student: Student, course: Course) -> float:
        """
        Compute interest match score using Jaccard similarity.
        
        Measures overlap between student interests and course tags.
        """
        if not student.interests or not course.tags:
            return 0.5  # Neutral score if no data
        
        student_interests = set(tag.lower() for tag in student.interests)
        course_tags = set(tag.lower() for tag in course.tags)
        
        intersection = len(student_interests & course_tags)
        union = len(student_interests | course_tags)
        
        if union == 0:
            return 0.5
        
        return intersection / union
    
    def _compute_time_score(self, course_id: str, applied_at: datetime) -> float:
        """
        Compute time-based score with exponential decay.
        
        Early applications get higher scores, but the advantage decays
        over time to prevent pure FCFS behavior.
        
        Formula: score = max_bonus × e^(-λ × hours_since_open)
        """
        booking_open = self._booking_open_times.get(course_id)
        
        if booking_open is None:
            # If we don't know when booking opened, assume it just opened
            booking_open = applied_at
        
        hours_since_open = max(0, (applied_at - booking_open).total_seconds() / 3600)
        
        # Exponential decay: λ = ln(2) / half_life_hours
        # After time_decay_hours, the bonus is halved
        decay_rate = math.log(2) / self.time_decay_hours
        
        return self.max_time_bonus * math.exp(-decay_rate * hours_since_open)
    
    def _compute_year_score(self, student: Student, course: Course) -> float:
        """
        Compute year-fit score.
        
        - 1.0 if student's year is in preferred years
        - 0.5 if adjacent to preferred years
        - 0.25 otherwise
        """
        if student.year in course.preferred_years:
            return 1.0
        
        # Check if adjacent to a preferred year
        for preferred in course.preferred_years:
            if abs(student.year - preferred) == 1:
                return 0.5
        
        return 0.25
    
    def _compute_prerequisite_score(self, student: Student, course: Course) -> float:
        """
        Compute prerequisite completion score.
        
        - 1.0 if all prerequisites completed
        - Proportional score based on completion ratio
        """
        if not course.prerequisites:
            return 1.0  # No prerequisites required
        
        completed = set(student.completed_courses)
        required = set(course.prerequisites)
        
        completed_prereqs = len(completed & required)
        total_prereqs = len(required)
        
        return completed_prereqs / total_prereqs
    
    def recompute_all_scores(
        self,
        applications: list[CourseApplication],
        students: dict[str, Student],
        courses: dict[str, Course]
    ) -> list[CourseApplication]:
        """
        Recompute scores for a batch of applications.
        Useful for periodic recalculation or when weights change.
        """
        updated = []
        for app in applications:
            student = students.get(app.student_id)
            course = courses.get(app.course_id)
            
            if student and course:
                new_app = self.compute_score(
                    student=student,
                    course=course,
                    applied_at=app.applied_at,
                    student_priority=app.priority_rank
                )
                new_app.application_id = app.application_id
                new_app.status = app.status
                updated.append(new_app)
            else:
                updated.append(app)
        
        return updated


# Example scoring configuration for different scenarios
COMPETITIVE_WEIGHTS = ScoringWeights(
    gpa_weight=0.45,
    interest_weight=0.25,
    time_weight=0.15,
    year_fit_weight=0.10,
    prerequisite_weight=0.05
)

INTEREST_FOCUSED_WEIGHTS = ScoringWeights(
    gpa_weight=0.25,
    interest_weight=0.45,
    time_weight=0.15,
    year_fit_weight=0.10,
    prerequisite_weight=0.05
)

FCFS_LEANING_WEIGHTS = ScoringWeights(
    gpa_weight=0.25,
    interest_weight=0.20,
    time_weight=0.40,
    year_fit_weight=0.10,
    prerequisite_weight=0.05
)