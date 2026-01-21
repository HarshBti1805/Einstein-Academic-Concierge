/**
 * Registration Service
 * 
 * Main orchestrator for the course registration system.
 * Handles seat booking, waitlist management, and auto-registration.
 */

import ScoringService from './ScoringService.js';
import WaitlistService from './WaitlistService.js';

class RegistrationService {
  constructor(prisma) {
    this.prisma = prisma;
    this.scoringService = new ScoringService(prisma);
    this.waitlistService = new WaitlistService(prisma, this.scoringService);
    this.wsService = null;
  }

  /**
   * Set WebSocket service for real-time updates
   */
  setWebSocketService(wsService) {
    this.wsService = wsService;
  }

  /**
   * Initialize the service (load waitlists into memory)
   */
  async initialize() {
    await this.waitlistService.loadWaitlists();
  }

  // ==================== COURSE APPLICATION ====================

  /**
   * Apply for a course (main entry point)
   */
  async applyForCourse({ studentId, courseId, preferredSeat, autoRegister }) {
    // Get student and course
    const [student, course] = await Promise.all([
      this.prisma.student.findUnique({
        where: { id: studentId },
        include: { academic: true, enrollments: { include: { course: true } } }
      }),
      this.prisma.course.findUnique({
        where: { id: courseId },
        include: { seatConfig: true }
      })
    ]);

    if (!student) {
      return this.failResult(studentId, courseId, 'Student not found');
    }

    if (!course) {
      return this.failResult(studentId, courseId, 'Course not found');
    }

    // Note: Prerequisites and GPA are used for scoring/priority only, not as hard requirements
    // This allows students to apply even if they don't meet prerequisites
    // In case of low enrollment, the system can accept students who don't meet all requirements

    // Check if already enrolled
    const existingEnrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId }
      }
    });

    if (existingEnrollment?.status === 'ENROLLED') {
      return this.failResult(studentId, courseId, 'Already enrolled in this course');
    }

    const seatConfig = course.seatConfig;
    if (!seatConfig) {
      return this.failResult(studentId, courseId, 'Course seat configuration not found');
    }

    // Route based on booking status
    switch (seatConfig.bookingStatus) {
      case 'CLOSED':
        return this.handleBookingClosed(studentId, courseId, preferredSeat);

      case 'OPEN':
        if (preferredSeat && !autoRegister) {
          // Manual seat selection
          return this.bookSpecificSeat(studentId, courseId, preferredSeat);
        } else {
          // Add to waitlist for batch allocation
          return this.handleBookingOpen(studentId, courseId, preferredSeat);
        }

      case 'WAITLIST_ONLY':
        return this.handleWaitlistOnly(studentId, courseId, preferredSeat);

      case 'STARTED':
        return this.handleCourseStarted(studentId, courseId, preferredSeat);

      case 'COMPLETED':
        return this.failResult(studentId, courseId, 'Course registration is closed');

      default:
        return this.failResult(studentId, courseId, 'Invalid booking status');
    }
  }

  /**
   * Handle application when booking is closed
   */
  async handleBookingClosed(studentId, courseId, preferredSeat) {
    const entry = await this.waitlistService.addToWaitlist(studentId, courseId, preferredSeat);
    await this.logEvent('APPLIED', studentId, courseId, { status: 'waitlisted_booking_closed' });

    return {
      studentId,
      courseId,
      success: true,
      status: 'WAITLISTED',
      message: 'Added to waitlist. Booking not yet open.',
      waitlistPosition: entry.position,
      score: entry.compositeScore,
    };
  }

  /**
   * Handle application when booking is open
   */
  async handleBookingOpen(studentId, courseId, preferredSeat) {
    const available = await this.getAvailableSeatsCount(courseId);

    if (available > 0) {
      const entry = await this.waitlistService.addToWaitlist(studentId, courseId, preferredSeat);

      return {
        studentId,
        courseId,
        success: true,
        status: 'WAITLISTED',
        message: 'Application received. You can select a seat or wait for auto-allocation.',
        waitlistPosition: entry.position,
        score: entry.compositeScore,
      };
    } else {
      const entry = await this.waitlistService.addToWaitlist(studentId, courseId, preferredSeat);

      return {
        studentId,
        courseId,
        success: true,
        status: 'WAITLISTED',
        message: 'Course is full. Added to waitlist.',
        waitlistPosition: entry.position,
        score: entry.compositeScore,
      };
    }
  }

  /**
   * Handle application when only waitlist is available
   */
  async handleWaitlistOnly(studentId, courseId, preferredSeat) {
    const entry = await this.waitlistService.addToWaitlist(studentId, courseId, preferredSeat);

    return {
      studentId,
      courseId,
      success: true,
      status: 'WAITLISTED',
      message: 'Course is full. Added to waitlist for auto-registration.',
      waitlistPosition: entry.position,
      score: entry.compositeScore,
    };
  }

  /**
   * Handle application when course has started
   */
  async handleCourseStarted(studentId, courseId, preferredSeat) {
    const entry = await this.waitlistService.addToWaitlist(studentId, courseId, preferredSeat);

    return {
      studentId,
      courseId,
      success: true,
      status: 'WAITLISTED',
      message: 'Added to waitlist for late enrollment or dropout fill.',
      waitlistPosition: entry.position,
      score: entry.compositeScore,
    };
  }

  // ==================== SEAT BOOKING ====================

  /**
   * Book a specific seat (manual registration)
   */
  async bookSpecificSeat(studentId, courseId, seatNumber) {
    // Get course and seat config
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: { seatConfig: true }
    });

    if (!course?.seatConfig) {
      return this.failResult(studentId, courseId, 'Course not found');
    }

    // Check booking status - allow OPEN, CLOSED (early registration), and STARTED (late registration)
    const allowedStatuses = ['OPEN', 'CLOSED', 'STARTED'];
    if (!allowedStatuses.includes(course.seatConfig.bookingStatus)) {
      if (course.seatConfig.bookingStatus === 'WAITLIST_ONLY') {
        // Add to waitlist instead of rejecting
        const entry = await this.waitlistService.addToWaitlist(studentId, courseId, seatNumber);
        return {
          studentId,
          courseId,
          success: true,
          status: 'WAITLISTED',
          message: 'Course is full. You have been added to the waitlist.',
          waitlistPosition: entry.position,
          score: entry.compositeScore,
        };
      }
      if (course.seatConfig.bookingStatus === 'COMPLETED') {
        return this.failResult(studentId, courseId, 'Registration for this course has ended');
      }
      return this.failResult(studentId, courseId, 'Booking not available for this course');
    }

    // Check if seat is available
    const existingBooking = await this.prisma.seatBooking.findFirst({
      where: {
        seatConfigId: course.seatConfig.id,
        seatNumber,
        isActive: true
      }
    });

    if (existingBooking) {
      return this.failResult(studentId, courseId, 'Seat is already taken');
    }

    // Check if student already has a seat in this course
    const existingSeatForStudent = await this.prisma.seatBooking.findFirst({
      where: {
        courseId,
        studentId,
        isActive: true
      }
    });

    if (existingSeatForStudent) {
      return this.failResult(studentId, courseId, 'You already have a seat in this course');
    }

    // Parse seat number (e.g., "A5" -> row="A", column=5)
    const { row, column } = this.parseSeatNumber(seatNumber);

    // Use transaction for atomic booking
    const result = await this.prisma.$transaction(async (tx) => {
      // Create seat booking
      const booking = await tx.seatBooking.create({
        data: {
          seatConfigId: course.seatConfig.id,
          courseId,
          studentId,
          seatNumber,
          row,
          column,
          isActive: true,
        }
      });

      // Create/update enrollment
      await tx.enrollment.upsert({
        where: {
          courseId_studentId: { courseId, studentId }
        },
        update: {
          status: 'ENROLLED',
          seatNumber,
          enrolledAt: new Date(),
        },
        create: {
          courseId,
          studentId,
          status: 'ENROLLED',
          seatNumber,
          enrolledAt: new Date(),
        }
      });

      // Remove from waitlist if present
      await tx.waitlistEntry.updateMany({
        where: {
          studentId,
          courseId,
          status: 'WAITING'
        },
        data: {
          status: 'ALLOCATED',
          processedAt: new Date()
        }
      });

      return booking;
    });

    // Log event
    await this.logEvent('SEAT_BOOKED', studentId, courseId, { seatNumber });

    // Broadcast via WebSocket
    if (this.wsService) {
      const student = await this.prisma.student.findUnique({
        where: { id: studentId },
        select: { name: true, studentId: true }
      });

      this.wsService.broadcastToCourse(courseId, {
        type: 'SEAT_BOOKED',
        courseId,
        payload: {
          seatNumber,
          studentId: student?.studentId,
          studentName: student?.name,
        },
        timestamp: new Date(),
      });
    }

    return {
      studentId,
      courseId,
      success: true,
      status: 'ENROLLED',
      message: 'Successfully booked seat!',
      seatNumber,
    };
  }

  // ==================== DROP COURSE ====================

  /**
   * Process a student dropping a course
   */
  async dropCourse(studentId, courseId) {
    // Get current enrollment
    const enrollment = await this.prisma.enrollment.findUnique({
      where: {
        courseId_studentId: { courseId, studentId }
      }
    });

    if (!enrollment || enrollment.status !== 'ENROLLED') {
      return this.failResult(studentId, courseId, 'Not enrolled in this course');
    }

    const seatNumber = enrollment.seatNumber;

    // Use transaction
    await this.prisma.$transaction(async (tx) => {
      // Update enrollment
      await tx.enrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'DROPPED',
          droppedAt: new Date()
        }
      });

      // Release seat
      if (seatNumber) {
        await tx.seatBooking.updateMany({
          where: {
            courseId,
            studentId,
            isActive: true
          },
          data: {
            isActive: false
          }
        });
      }
    });

    // Log event
    await this.logEvent('DROPPED', studentId, courseId, { seatNumber });

    // Broadcast seat release
    if (this.wsService) {
      this.wsService.broadcastToCourse(courseId, {
        type: 'SEAT_RELEASED',
        courseId,
        payload: {
          seatNumber,
          previousStudentId: studentId,
        },
        timestamp: new Date(),
      });
    }

    // Fill vacancy from waitlist
    const fillResult = await this.fillVacancy(courseId, seatNumber);

    return {
      studentId,
      courseId,
      success: true,
      status: 'DROPPED',
      message: 'Successfully dropped course',
      seatNumber,
      vacancyFilledBy: fillResult,
    };
  }

  /**
   * Fill a vacancy from the waitlist
   */
  async fillVacancy(courseId, seatNumber) {
    // Get top candidate from waitlist
    const topCandidate = await this.waitlistService.popTopCandidate(courseId);

    if (!topCandidate) {
      return null;
    }

    // Get an available seat if not specified
    let assignedSeat = seatNumber;
    if (!assignedSeat) {
      const availableSeat = await this.getFirstAvailableSeat(courseId);
      assignedSeat = availableSeat;
    }

    if (!assignedSeat) {
      // No seat available, revert waitlist status
      await this.prisma.waitlistEntry.updateMany({
        where: {
          studentId: topCandidate.studentId,
          courseId,
          status: 'PROCESSING'
        },
        data: {
          status: 'WAITING'
        }
      });
      return null;
    }

    // Book the seat for the waitlisted student
    const bookResult = await this.bookSpecificSeat(
      topCandidate.studentId,
      courseId,
      assignedSeat
    );

    if (bookResult.success) {
      // Mark as allocated
      await this.waitlistService.markAllocated(topCandidate.studentId, courseId);

      // Get student info
      const student = await this.prisma.student.findUnique({
        where: { id: topCandidate.studentId },
        select: { name: true, studentId: true }
      });

      // Log event
      await this.logEvent('AUTO_ALLOCATED', topCandidate.studentId, courseId, {
        seatNumber: assignedSeat,
        fromWaitlist: true,
        score: topCandidate.compositeScore
      });

      // Broadcast
      if (this.wsService) {
        this.wsService.broadcastToCourse(courseId, {
          type: 'STUDENT_AUTO_ENROLLED',
          courseId,
          payload: {
            studentId: student?.studentId,
            studentName: student?.name,
            seatNumber: assignedSeat,
            fromWaitlist: true,
          },
          timestamp: new Date(),
        });

        // Update waitlist
        const waitlistSize = await this.waitlistService.getWaitlistSize(courseId);
        const topCandidates = await this.waitlistService.getTopCandidates(courseId, 5);

        this.wsService.broadcastToCourse(courseId, {
          type: 'WAITLIST_UPDATED',
          courseId,
          payload: {
            waitlistSize,
            topCandidates: topCandidates.map((c, i) => ({
              position: i + 1,
              studentId: c.student.studentId,
              score: c.compositeScore,
            })),
          },
          timestamp: new Date(),
        });
      }

      return {
        studentId: topCandidate.studentId,
        studentName: student?.name,
        seatNumber: assignedSeat,
        score: topCandidate.compositeScore,
      };
    }

    return null;
  }

  // ==================== CLASSROOM STATE ====================

  /**
   * Get complete classroom state for real-time view
   */
  async getClassroomState(courseId) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        seatConfig: {
          include: {
            seatBookings: {
              where: { isActive: true },
              include: {
                student: {
                  select: { studentId: true, name: true }
                }
              }
            }
          }
        }
      }
    });

    if (!course?.seatConfig) {
      return null;
    }

    const { seatConfig } = course;
    const { rows, seatsPerRow, totalSeats, seatBookings, bookingStatus } = seatConfig;

    // Build seat map
    const bookedSeats = new Map();
    seatBookings.forEach(booking => {
      bookedSeats.set(booking.seatNumber, {
        studentId: booking.student.studentId,
        studentName: booking.student.name,
      });
    });

    // Generate all seats
    const seats = [];
    const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, rows);

    for (const rowLetter of rowLetters) {
      for (let col = 1; col <= seatsPerRow; col++) {
        const seatNumber = `${rowLetter}${col}`;
        const booking = bookedSeats.get(seatNumber);

        seats.push({
          seatNumber,
          row: rowLetter,
          column: col,
          isOccupied: !!booking,
          studentId: booking?.studentId,
          studentName: booking?.studentName,
        });
      }
    }

    const occupiedCount = seatBookings.length;

    return {
      courseId,
      courseName: course.name,
      totalSeats,
      availableSeats: totalSeats - occupiedCount,
      occupiedSeats: occupiedCount,
      bookingStatus,
      seats,
      lastUpdated: new Date(),
    };
  }

  // ==================== STUDENT STATUS ====================

  /**
   * Get comprehensive status for a student
   */
  async getStudentStatus(studentId) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      include: {
        enrollments: {
          include: {
            course: {
              select: { courseId: true, name: true }
            }
          }
        },
        coursePreferences: {
          include: {
            course: {
              select: { courseId: true, name: true }
            }
          },
          orderBy: { priority: 'asc' }
        },
        waitlistEntries: {
          where: { status: 'WAITING' },
          include: {
            course: {
              select: { courseId: true, name: true }
            }
          }
        }
      }
    });

    if (!student) {
      return null;
    }

    return {
      studentId: student.studentId,
      name: student.name,
      enrolledCourses: student.enrollments
        .filter(e => e.status === 'ENROLLED')
        .map(e => ({
          courseId: e.course.courseId,
          courseName: e.course.name,
          seatNumber: e.seatNumber,
          status: e.status,
        })),
      waitlistedCourses: student.waitlistEntries.map(w => ({
        courseId: w.course.courseId,
        courseName: w.course.name,
        position: w.position,
        score: w.compositeScore,
      })),
      preferences: student.coursePreferences.map(p => ({
        courseId: p.course.courseId,
        courseName: p.course.name,
        priority: p.priority,
        matchReason: p.matchReason,
      })),
    };
  }

  // ==================== BOOKING STATUS MANAGEMENT ====================

  /**
   * Open booking for a course
   */
  async openBooking(courseId) {
    try {
      await this.prisma.seatConfig.update({
        where: { courseId },
        data: {
          bookingStatus: 'OPEN',
          bookingOpensAt: new Date()
        }
      });

      // Set booking open time for scoring
      this.scoringService.setBookingOpenTime(courseId, new Date());

      // Broadcast
      if (this.wsService) {
        this.wsService.broadcastToCourse(courseId, {
          type: 'BOOKING_STATUS_CHANGED',
          courseId,
          payload: { status: 'OPEN' },
          timestamp: new Date(),
        });
      }

      return true;
    } catch (error) {
      console.error('Error opening booking:', error);
      return false;
    }
  }

  /**
   * Close booking (set to waitlist only)
   */
  async closeBooking(courseId) {
    try {
      await this.prisma.seatConfig.update({
        where: { courseId },
        data: {
          bookingStatus: 'WAITLIST_ONLY',
          bookingClosesAt: new Date()
        }
      });

      if (this.wsService) {
        this.wsService.broadcastToCourse(courseId, {
          type: 'BOOKING_STATUS_CHANGED',
          courseId,
          payload: { status: 'WAITLIST_ONLY' },
          timestamp: new Date(),
        });
      }

      return true;
    } catch (error) {
      console.error('Error closing booking:', error);
      return false;
    }
  }

  // ==================== HELPER METHODS ====================

  async getAvailableSeatsCount(courseId) {
    const seatConfig = await this.prisma.seatConfig.findUnique({
      where: { courseId },
      include: {
        seatBookings: {
          where: { isActive: true }
        }
      }
    });

    if (!seatConfig) return 0;
    return seatConfig.totalSeats - seatConfig.seatBookings.length;
  }

  async getFirstAvailableSeat(courseId) {
    const seatConfig = await this.prisma.seatConfig.findUnique({
      where: { courseId },
      include: {
        seatBookings: {
          where: { isActive: true },
          select: { seatNumber: true }
        }
      }
    });

    if (!seatConfig) return null;

    const bookedSeats = new Set(seatConfig.seatBookings.map(b => b.seatNumber));
    const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.slice(0, seatConfig.rows);

    for (const row of rowLetters) {
      for (let col = 1; col <= seatConfig.seatsPerRow; col++) {
        const seatNumber = `${row}${col}`;
        if (!bookedSeats.has(seatNumber)) {
          return seatNumber;
        }
      }
    }

    return null;
  }

  parseSeatNumber(seatNumber) {
    const match = seatNumber.match(/^([A-Z]+)(\d+)$/i);
    if (!match) {
      throw new Error(`Invalid seat number: ${seatNumber}`);
    }
    return {
      row: match[1].toUpperCase(),
      column: parseInt(match[2], 10)
    };
  }

  async logEvent(eventType, studentId, courseId, metadata = {}) {
    try {
      await this.prisma.registrationEvent.create({
        data: {
          eventType,
          studentId,
          courseId,
          metadata,
        }
      });
    } catch (error) {
      console.error('Error logging event:', error);
    }
  }

  failResult(studentId, courseId, message) {
    return {
      studentId,
      courseId,
      success: false,
      status: 'REJECTED',
      message,
    };
  }
}

export default RegistrationService;
