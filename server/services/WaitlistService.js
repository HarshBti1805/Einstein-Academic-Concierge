/**
 * Waitlist Service
 * 
 * Manages course waitlists using in-memory sorted data structures.
 * Uses a priority queue approach where higher composite scores get higher priority.
 * 
 * In production, this could be backed by Redis sorted sets for
 * O(log N) insertion and O(1) rank queries.
 */

class WaitlistService {
  constructor(prisma, scoringService) {
    this.prisma = prisma;
    this.scoringService = scoringService;
    
    // In-memory sorted waitlists (for quick access)
    // courseId -> Map<studentId, score>
    this.waitlists = new Map();
    
    // Locks for concurrent access
    this.courseLocks = new Map();
  }

  /**
   * Add a student to a course's waitlist
   */
  async addToWaitlist(studentId, courseId, preferredSeat = null) {
    // Compute score
    const scores = await this.scoringService.computeScore(studentId, courseId);

    // Create or update waitlist entry in database
    const entry = await this.prisma.waitlistEntry.upsert({
      where: {
        studentId_courseId: { studentId, courseId }
      },
      update: {
        gpaScore: scores.gpaScore,
        interestScore: scores.interestScore,
        timeScore: scores.timeScore,
        yearScore: scores.yearScore,
        compositeScore: scores.compositeScore,
        preferredSeat,
        status: 'WAITING',
        appliedAt: scores.appliedAt,
        updatedAt: new Date()
      },
      create: {
        studentId,
        courseId,
        gpaScore: scores.gpaScore,
        interestScore: scores.interestScore,
        timeScore: scores.timeScore,
        yearScore: scores.yearScore,
        compositeScore: scores.compositeScore,
        preferredSeat,
        status: 'WAITING',
        appliedAt: scores.appliedAt
      }
    });

    // Update in-memory waitlist
    if (!this.waitlists.has(courseId)) {
      this.waitlists.set(courseId, new Map());
    }
    this.waitlists.get(courseId).set(studentId, scores.compositeScore);

    // Calculate position
    const position = await this.getWaitlistPosition(courseId, studentId);

    console.log(`Added student ${studentId} to waitlist for ${courseId} with score ${scores.compositeScore.toFixed(4)}, position ${position}`);

    return {
      ...entry,
      position,
      compositeScore: scores.compositeScore
    };
  }

  /**
   * Remove a student from a course's waitlist
   */
  async removeFromWaitlist(courseId, studentId) {
    // Update database
    await this.prisma.waitlistEntry.updateMany({
      where: {
        studentId,
        courseId,
        status: 'WAITING'
      },
      data: {
        status: 'CANCELLED',
        processedAt: new Date()
      }
    });

    // Update in-memory
    const courseWaitlist = this.waitlists.get(courseId);
    if (courseWaitlist) {
      courseWaitlist.delete(studentId);
    }

    console.log(`Removed student ${studentId} from waitlist for ${courseId}`);
    return true;
  }

  /**
   * Get a student's position in the waitlist (1-indexed)
   * Position 1 = highest priority (will be allocated first)
   */
  async getWaitlistPosition(courseId, studentId) {
    // Get all waiting entries sorted by score
    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        courseId,
        status: 'WAITING'
      },
      orderBy: {
        compositeScore: 'desc'
      },
      select: {
        studentId: true,
        compositeScore: true
      }
    });

    const index = entries.findIndex(e => e.studentId === studentId);
    return index === -1 ? null : index + 1;
  }

  /**
   * Get the top N candidates from a course's waitlist
   */
  async getTopCandidates(courseId, count = 5) {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: {
        courseId,
        status: 'WAITING'
      },
      orderBy: {
        compositeScore: 'desc'
      },
      take: count,
      include: {
        student: {
          select: {
            studentId: true,
            name: true
          }
        }
      }
    });

    return entries;
  }

  /**
   * Pop the top candidate from waitlist (atomic get and update status)
   */
  async popTopCandidate(courseId) {
    // Use transaction for atomicity
    const result = await this.prisma.$transaction(async (tx) => {
      // Get top candidate
      const topCandidate = await tx.waitlistEntry.findFirst({
        where: {
          courseId,
          status: 'WAITING'
        },
        orderBy: {
          compositeScore: 'desc'
        }
      });

      if (!topCandidate) {
        return null;
      }

      // Update status to processing
      await tx.waitlistEntry.update({
        where: { id: topCandidate.id },
        data: { status: 'PROCESSING' }
      });

      return topCandidate;
    });

    // Update in-memory if successful
    if (result) {
      const courseWaitlist = this.waitlists.get(courseId);
      if (courseWaitlist) {
        courseWaitlist.delete(result.studentId);
      }
    }

    return result;
  }

  /**
   * Mark a waitlist entry as allocated
   */
  async markAllocated(studentId, courseId) {
    await this.prisma.waitlistEntry.updateMany({
      where: {
        studentId,
        courseId,
        status: { in: ['WAITING', 'PROCESSING'] }
      },
      data: {
        status: 'ALLOCATED',
        processedAt: new Date()
      }
    });

    // Update in-memory
    const courseWaitlist = this.waitlists.get(courseId);
    if (courseWaitlist) {
      courseWaitlist.delete(studentId);
    }
  }

  /**
   * Get the size of a course's waitlist
   */
  async getWaitlistSize(courseId) {
    return await this.prisma.waitlistEntry.count({
      where: {
        courseId,
        status: 'WAITING'
      }
    });
  }

  /**
   * Get all waitlisted students for a course
   */
  async getAllWaitlisted(courseId) {
    return await this.prisma.waitlistEntry.findMany({
      where: {
        courseId,
        status: 'WAITING'
      },
      orderBy: {
        compositeScore: 'desc'
      },
      include: {
        student: {
          select: {
            studentId: true,
            name: true,
            email: true
          }
        }
      }
    });
  }

  /**
   * Update a student's score in the waitlist
   */
  async updateScore(courseId, studentId) {
    // Recompute score
    const scores = await this.scoringService.computeScore(studentId, courseId);

    // Update database
    await this.prisma.waitlistEntry.updateMany({
      where: {
        studentId,
        courseId,
        status: 'WAITING'
      },
      data: {
        gpaScore: scores.gpaScore,
        interestScore: scores.interestScore,
        timeScore: scores.timeScore,
        yearScore: scores.yearScore,
        compositeScore: scores.compositeScore,
        updatedAt: new Date()
      }
    });

    // Update in-memory
    const courseWaitlist = this.waitlists.get(courseId);
    if (courseWaitlist) {
      courseWaitlist.set(studentId, scores.compositeScore);
    }

    return scores;
  }

  /**
   * Acquire a lock for a course (for concurrent vacancy filling)
   */
  acquireCourseLock(courseId) {
    if (this.courseLocks.get(courseId)) {
      return false;
    }
    this.courseLocks.set(courseId, true);
    
    // Auto-release after 30 seconds
    setTimeout(() => {
      this.releaseCourseLock(courseId);
    }, 30000);
    
    return true;
  }

  /**
   * Release a course lock
   */
  releaseCourseLock(courseId) {
    this.courseLocks.delete(courseId);
  }

  /**
   * Get student's waitlist entries across multiple courses
   */
  async getStudentWaitlists(studentId) {
    return await this.prisma.waitlistEntry.findMany({
      where: {
        studentId,
        status: 'WAITING'
      },
      include: {
        course: {
          select: {
            courseId: true,
            name: true
          }
        }
      },
      orderBy: {
        compositeScore: 'desc'
      }
    });
  }

  /**
   * Load waitlists from database into memory (call on startup)
   */
  async loadWaitlists() {
    const entries = await this.prisma.waitlistEntry.findMany({
      where: { status: 'WAITING' },
      select: {
        courseId: true,
        studentId: true,
        compositeScore: true
      }
    });

    for (const entry of entries) {
      if (!this.waitlists.has(entry.courseId)) {
        this.waitlists.set(entry.courseId, new Map());
      }
      this.waitlists.get(entry.courseId).set(entry.studentId, entry.compositeScore);
    }

    console.log(`Loaded ${entries.length} waitlist entries into memory`);
  }
}

export default WaitlistService;
