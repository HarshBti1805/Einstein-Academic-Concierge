/**
 * Registration Routes
 * 
 * Express router for course registration API endpoints.
 */

import express from 'express';
import prisma from '../db.js';

const router = express.Router();

// Registration service will be set by the app
let registrationService = null;

export function setRegistrationService(service) {
  registrationService = service;
}

// ==================== COURSE APPLICATION ====================

/**
 * POST /api/registration/apply
 * Apply for a course
 */
router.post('/apply', async (req, res) => {
  try {
    const { studentId, courseId, preferredSeat, autoRegister } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'studentId and courseId are required',
      });
    }

    // Find student by studentId string (e.g., "STU001")
    let student = await prisma.student.findUnique({
      where: { studentId: studentId }
    });

    if (!student) {
      // Try finding by UUID
      student = await prisma.student.findUnique({
        where: { id: studentId }
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Find course by courseId string (e.g., "CS101")
    let course = await prisma.course.findUnique({
      where: { courseId: courseId }
    });

    if (!course) {
      // Try finding by UUID
      course = await prisma.course.findUnique({
        where: { id: courseId }
      });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const result = await registrationService.applyForCourse({
      studentId: student.id,
      courseId: course.id,
      preferredSeat,
      autoRegister,
    });

    res.json(result);
  } catch (error) {
    console.error('Error applying for course:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// ==================== SEAT BOOKING ====================

/**
 * POST /api/registration/book-seat
 * Book a specific seat (manual registration)
 */
router.post('/book-seat', async (req, res) => {
  try {
    const { studentId, courseId, seatNumber } = req.body;

    if (!studentId || !courseId || !seatNumber) {
      return res.status(400).json({
        success: false,
        message: 'studentId, courseId, and seatNumber are required',
      });
    }

    // Find student
    let student = await prisma.student.findUnique({
      where: { studentId: studentId }
    });

    if (!student) {
      student = await prisma.student.findUnique({
        where: { id: studentId }
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Find course
    let course = await prisma.course.findUnique({
      where: { courseId: courseId }
    });

    if (!course) {
      course = await prisma.course.findUnique({
        where: { id: courseId }
      });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const result = await registrationService.bookSpecificSeat(
      student.id,
      course.id,
      seatNumber
    );

    res.json(result);
  } catch (error) {
    console.error('Error booking seat:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// ==================== DROP COURSE ====================

/**
 * POST /api/registration/drop
 * Drop a course (triggers auto-fill from waitlist)
 */
router.post('/drop', async (req, res) => {
  try {
    const { studentId, courseId } = req.body;

    if (!studentId || !courseId) {
      return res.status(400).json({
        success: false,
        message: 'studentId and courseId are required',
      });
    }

    // Find student
    let student = await prisma.student.findUnique({
      where: { studentId: studentId }
    });

    if (!student) {
      student = await prisma.student.findUnique({
        where: { id: studentId }
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Find course
    let course = await prisma.course.findUnique({
      where: { courseId: courseId }
    });

    if (!course) {
      course = await prisma.course.findUnique({
        where: { id: courseId }
      });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const result = await registrationService.dropCourse(student.id, course.id);

    res.json(result);
  } catch (error) {
    console.error('Error dropping course:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// ==================== CLASSROOM STATE ====================

/**
 * GET /api/registration/classroom/:courseId
 * Get live classroom state
 */
router.get('/classroom/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;

    // First try to find by courseId string (e.g., "CS101")
    let course = await prisma.course.findUnique({
      where: { courseId: courseId }
    });

    if (!course) {
      // Try by UUID
      course = await prisma.course.findUnique({
        where: { id: courseId }
      });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const state = await registrationService.getClassroomState(course.id);

    if (!state) {
      return res.status(404).json({
        success: false,
        message: 'Classroom state not found',
      });
    }

    res.json({
      success: true,
      data: state,
    });
  } catch (error) {
    console.error('Error getting classroom state:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// ==================== STUDENT STATUS ====================

/**
 * GET /api/registration/student/:studentId/status
 * Get comprehensive status for a student
 */
router.get('/student/:studentId/status', async (req, res) => {
  try {
    const { studentId } = req.params;

    // Find student
    let student = await prisma.student.findUnique({
      where: { studentId: studentId }
    });

    if (!student) {
      student = await prisma.student.findUnique({
        where: { id: studentId }
      });
    }

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const status = await registrationService.getStudentStatus(student.id);

    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    console.error('Error getting student status:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// ==================== WAITLIST STATUS ====================

/**
 * GET /api/registration/waitlist/:courseId
 * Get waitlist for a course
 */
router.get('/waitlist/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    // Find course
    let course = await prisma.course.findUnique({
      where: { courseId: courseId }
    });

    if (!course) {
      course = await prisma.course.findUnique({
        where: { id: courseId }
      });
    }

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const waitlist = await prisma.waitlistEntry.findMany({
      where: {
        courseId: course.id,
        status: 'WAITING'
      },
      orderBy: {
        compositeScore: 'desc'
      },
      take: limit,
      include: {
        student: {
          select: {
            studentId: true,
            name: true,
          }
        }
      }
    });

    const totalWaitlisted = await prisma.waitlistEntry.count({
      where: {
        courseId: course.id,
        status: 'WAITING'
      }
    });

    res.json({
      success: true,
      data: {
        courseId: course.courseId,
        totalWaitlisted,
        entries: waitlist.map((entry, index) => ({
          position: index + 1,
          studentId: entry.student.studentId,
          studentName: entry.student.name,
          score: entry.compositeScore,
          appliedAt: entry.appliedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error getting waitlist:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// ==================== BOOKING STATUS MANAGEMENT ====================

/**
 * POST /api/registration/course/:courseId/open-booking
 * Open booking for a course (admin)
 */
router.post('/course/:courseId/open-booking', async (req, res) => {
  try {
    const { courseId } = req.params;

    let course = await prisma.course.findUnique({
      where: { courseId: courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const success = await registrationService.openBooking(course.id);

    res.json({
      success,
      message: success ? 'Booking opened' : 'Failed to open booking',
    });
  } catch (error) {
    console.error('Error opening booking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

/**
 * POST /api/registration/course/:courseId/close-booking
 * Close booking for a course (admin)
 */
router.post('/course/:courseId/close-booking', async (req, res) => {
  try {
    const { courseId } = req.params;

    let course = await prisma.course.findUnique({
      where: { courseId: courseId }
    });

    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found',
      });
    }

    const success = await registrationService.closeBooking(course.id);

    res.json({
      success,
      message: success ? 'Booking closed' : 'Failed to close booking',
    });
  } catch (error) {
    console.error('Error closing booking:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// ==================== COURSES LIST ====================

/**
 * GET /api/registration/courses
 * Get all courses with seat availability
 */
router.get('/courses', async (req, res) => {
  try {
    const courses = await prisma.course.findMany({
      include: {
        instructor: {
          select: {
            name: true,
            email: true,
          }
        },
        seatConfig: {
          include: {
            seatBookings: {
              where: { isActive: true },
              select: { id: true }
            }
          }
        },
        _count: {
          select: {
            waitlistEntries: true
          }
        }
      }
    });

    const result = courses.map(course => {
      const occupied = course.seatConfig?.seatBookings.length || 0;
      const total = course.seatConfig?.totalSeats || 0;

      return {
        id: course.id,
        courseId: course.courseId,
        name: course.name,
        category: course.category,
        difficulty: course.difficulty,
        instructor: course.instructor,
        schedule: course.schedule,
        classroomNumber: course.classroomNumber,
        minGpaRecommended: course.minGpaRecommended,
        prerequisites: course.prerequisites,
        seatConfig: {
          totalSeats: total,
          availableSeats: total - occupied,
          occupiedSeats: occupied,
          bookingStatus: course.seatConfig?.bookingStatus || 'CLOSED',
        },
        waitlistCount: course._count.waitlistEntries,
      };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting courses:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

// ==================== PREFERENCES ====================

/**
 * POST /api/registration/preferences
 * Set student course preferences (from recommendation system)
 */
router.post('/preferences', async (req, res) => {
  try {
    const { studentId, preferences } = req.body;

    if (!studentId || !preferences || !Array.isArray(preferences)) {
      return res.status(400).json({
        success: false,
        message: 'studentId and preferences array are required',
      });
    }

    // Find student
    let student = await prisma.student.findUnique({
      where: { studentId: studentId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    // Clear existing preferences
    await prisma.coursePreference.deleteMany({
      where: { studentId: student.id }
    });

    // Create new preferences
    for (const pref of preferences) {
      const course = await prisma.course.findUnique({
        where: { courseId: pref.courseId }
      });

      if (course) {
        await prisma.coursePreference.create({
          data: {
            studentId: student.id,
            courseId: course.id,
            priority: pref.priority,
            matchReason: pref.matchReason,
          }
        });
      }
    }

    res.json({
      success: true,
      message: 'Preferences saved',
    });
  } catch (error) {
    console.error('Error saving preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

/**
 * GET /api/registration/student/:studentId/preferences
 * Get student's course preferences
 */
router.get('/student/:studentId/preferences', async (req, res) => {
  try {
    const { studentId } = req.params;

    let student = await prisma.student.findUnique({
      where: { studentId: studentId }
    });

    if (!student) {
      return res.status(404).json({
        success: false,
        message: 'Student not found',
      });
    }

    const preferences = await prisma.coursePreference.findMany({
      where: { studentId: student.id },
      include: {
        course: {
          include: {
            instructor: { select: { name: true } },
            seatConfig: {
              include: {
                seatBookings: {
                  where: { isActive: true },
                  select: { id: true }
                }
              }
            }
          }
        }
      },
      orderBy: { priority: 'asc' }
    });

    const result = preferences.map(pref => {
      const occupied = pref.course.seatConfig?.seatBookings.length || 0;
      const total = pref.course.seatConfig?.totalSeats || 0;

      return {
        priority: pref.priority,
        matchReason: pref.matchReason,
        course: {
          id: pref.course.id,
          courseId: pref.course.courseId,
          name: pref.course.name,
          instructor: pref.course.instructor?.name,
          availableSeats: total - occupied,
          totalSeats: total,
          bookingStatus: pref.course.seatConfig?.bookingStatus || 'CLOSED',
        }
      };
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('Error getting preferences:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Server error',
    });
  }
});

export default router;
