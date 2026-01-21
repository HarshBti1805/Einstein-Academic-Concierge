/**
 * Scoring Engine for computing student-course fit scores.
 * 
 * The composite score determines a student's priority in the waitlist.
 * Higher scores = higher priority = better chance of getting the course.
 * 
 * Score Formula:
 *   score = (w1 × gpa_score) + (w2 × interest_score) + 
 *           (w3 × time_score) + (w4 × year_score) + (w5 × prereq_score)
 */

// Default scoring weights
const DEFAULT_WEIGHTS = {
  gpaWeight: 0.35,
  interestWeight: 0.30,
  timeWeight: 0.20,
  yearWeight: 0.10,
  prereqWeight: 0.05,
};

class ScoringService {
  constructor(prisma, weights = {}) {
    this.prisma = prisma;
    this.weights = { ...DEFAULT_WEIGHTS, ...weights };
    this.bookingOpenTimes = new Map(); // courseId -> Date
    this.timeDecayHours = 168; // 1 week
    this.maxTimeBonus = 1.0;
  }

  /**
   * Set when booking opened for a course (for time score calculation)
   */
  setBookingOpenTime(courseId, openTime) {
    this.bookingOpenTimes.set(courseId, openTime);
  }

  /**
   * Compute the composite score for a student-course application
   */
  async computeScore(studentId, courseId, appliedAt = new Date()) {
    // Fetch student with academic record
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        academic: true,
        behavioral: true,
        enrollments: {
          include: {
            course: { select: { courseId: true } }
          }
        }
      }
    });

    // Fetch course
    const course = await this.prisma.course.findUnique({
      where: { id: courseId }
    });

    if (!student || !course) {
      throw new Error('Student or course not found');
    }

    // Compute individual score components
    const gpaScore = this.computeGpaScore(student, course);
    const interestScore = this.computeInterestScore(student, course);
    const timeScore = this.computeTimeScore(courseId, appliedAt);
    const yearScore = this.computeYearScore(student, course);
    const prereqScore = this.computePrerequisiteScore(student, course);

    // Compute weighted composite score
    const compositeScore = (
      this.weights.gpaWeight * gpaScore +
      this.weights.interestWeight * interestScore +
      this.weights.timeWeight * timeScore +
      this.weights.yearWeight * yearScore +
      this.weights.prereqWeight * prereqScore
    );

    return {
      gpaScore,
      interestScore,
      timeScore,
      yearScore,
      prereqScore,
      compositeScore,
      appliedAt
    };
  }

  /**
   * Compute GPA component score
   * - Normalized to [0, 1] assuming 4.0 scale
   * - Bonus for exceeding minimum requirements
   * - Zero if below minimum GPA requirement
   */
  computeGpaScore(student, course) {
    const studentGpa = student.academic?.overallGpa || 0;
    
    if (studentGpa < course.minGpaRecommended) {
      return 0.0; // Doesn't meet minimum requirement
    }

    // Normalize GPA to [0, 1]
    const baseScore = studentGpa / 4.0;

    // Small bonus for exceeding minimum by a lot
    const excess = studentGpa - course.minGpaRecommended;
    const bonus = Math.min(0.1, excess * 0.05); // Up to 0.1 bonus

    return Math.min(1.0, baseScore + bonus);
  }

  /**
   * Compute interest match score using Jaccard similarity
   * Measures overlap between student interests and course keywords
   */
  computeInterestScore(student, course) {
    // Get student interests from behavioral record and branch
    const studentInterests = new Set([
      ...(student.behavioral?.extracurricular || []).map(s => s.toLowerCase()),
      student.branch?.toLowerCase() || ''
    ].filter(Boolean));

    // Get course keywords
    const courseKeywords = new Set(
      (course.keywords || []).map(k => k.toLowerCase())
    );

    if (studentInterests.size === 0 || courseKeywords.size === 0) {
      return 0.5; // Neutral score if no data
    }

    // Jaccard similarity
    const intersection = new Set(
      [...studentInterests].filter(x => courseKeywords.has(x))
    );
    const union = new Set([...studentInterests, ...courseKeywords]);

    if (union.size === 0) {
      return 0.5;
    }

    return intersection.size / union.size;
  }

  /**
   * Compute time-based score with exponential decay
   * Early applications get higher scores, but the advantage decays
   * over time to prevent pure FCFS behavior.
   * 
   * Formula: score = max_bonus × e^(-λ × hours_since_open)
   */
  computeTimeScore(courseId, appliedAt) {
    let bookingOpen = this.bookingOpenTimes.get(courseId);

    if (!bookingOpen) {
      // If we don't know when booking opened, assume it just opened
      bookingOpen = appliedAt;
    }

    const hoursSinceOpen = Math.max(
      0,
      (appliedAt.getTime() - bookingOpen.getTime()) / (1000 * 60 * 60)
    );

    // Exponential decay: λ = ln(2) / half_life_hours
    // After timeDecayHours, the bonus is halved
    const decayRate = Math.log(2) / this.timeDecayHours;

    return this.maxTimeBonus * Math.exp(-decayRate * hoursSinceOpen);
  }

  /**
   * Compute year-fit score
   * - 1.0 if student's year is ideal for the course
   * - 0.5 if one year off
   * - 0.25 otherwise
   */
  computeYearScore(student, course) {
    const studentYear = student.yearOfStudy;
    
    // Determine preferred years based on course difficulty
    const preferredYears = this.getPreferredYears(course.difficulty);

    if (preferredYears.includes(studentYear)) {
      return 1.0;
    }

    // Check if adjacent to a preferred year
    for (const preferred of preferredYears) {
      if (Math.abs(studentYear - preferred) === 1) {
        return 0.5;
      }
    }

    return 0.25;
  }

  /**
   * Get preferred years based on course difficulty
   */
  getPreferredYears(difficulty) {
    switch (difficulty?.toLowerCase()) {
      case 'beginner':
        return [1, 2];
      case 'intermediate':
        return [2, 3];
      case 'advanced':
        return [3, 4];
      default:
        return [1, 2, 3, 4];
    }
  }

  /**
   * Compute prerequisite completion score
   * - 1.0 if all prerequisites completed
   * - Proportional score based on completion ratio
   */
  computePrerequisiteScore(student, course) {
    const prerequisites = course.prerequisites || [];

    if (prerequisites.length === 0) {
      return 1.0; // No prerequisites required
    }

    // Get completed course IDs
    const completedCourseIds = new Set(
      student.enrollments
        ?.filter(e => e.status === 'ENROLLED')
        .map(e => e.course.courseId) || []
    );

    const completedPrereqs = prerequisites.filter(p => 
      completedCourseIds.has(p)
    ).length;

    return completedPrereqs / prerequisites.length;
  }

  /**
   * Check if student meets prerequisites
   */
  async checkPrerequisites(studentId, prerequisites) {
    if (!prerequisites || prerequisites.length === 0) {
      return { met: true, missing: [] };
    }

    const completedEnrollments = await this.prisma.enrollment.findMany({
      where: {
        studentId,
        status: 'ENROLLED'
      },
      include: {
        course: { select: { courseId: true } }
      }
    });

    const completed = new Set(completedEnrollments.map(e => e.course.courseId));
    const missing = prerequisites.filter(p => !completed.has(p));

    return {
      met: missing.length === 0,
      missing
    };
  }

  /**
   * Update weights dynamically
   */
  updateWeights(newWeights) {
    this.weights = { ...this.weights, ...newWeights };
    
    // Validate weights sum to ~1.0
    const total = Object.values(this.weights).reduce((a, b) => a + b, 0);
    if (total < 0.99 || total > 1.01) {
      console.warn(`Scoring weights sum to ${total}, should be 1.0`);
    }
  }
}

export default ScoringService;
