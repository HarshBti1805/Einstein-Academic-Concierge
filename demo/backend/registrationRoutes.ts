/**
 * Registration Routes
 * 
 * Express router for course registration API endpoints.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { RegistrationService } from '../services/RegistrationService';
import { WebSocketService } from '../websocket/WebSocketService';

export function createRegistrationRouter(
  prisma: PrismaClient,
  wsService?: WebSocketService
): Router {
  const router = Router();
  const registrationService = new RegistrationService(prisma);

  if (wsService) {
    registrationService.setWebSocketService(wsService);
  }

  // ==================== COURSE APPLICATION ====================

  /**
   * POST /api/registration/apply
   * Apply for a course
   */
  router.post('/apply', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, courseId, preferredSeat, autoRegister } = req.body;

      if (!studentId || !courseId) {
        return res.status(400).json({
          success: false,
          message: 'studentId and courseId are required',
        });
      }

      const result = await registrationService.applyForCourse({
        studentId,
        courseId,
        preferredSeat,
        autoRegister,
      });

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // ==================== SEAT BOOKING ====================

  /**
   * POST /api/registration/book-seat
   * Book a specific seat (manual registration)
   */
  router.post('/book-seat', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, courseId, seatNumber } = req.body;

      if (!studentId || !courseId || !seatNumber) {
        return res.status(400).json({
          success: false,
          message: 'studentId, courseId, and seatNumber are required',
        });
      }

      const result = await registrationService.bookSpecificSeat(
        studentId,
        courseId,
        seatNumber
      );

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // ==================== DROP COURSE ====================

  /**
   * POST /api/registration/drop
   * Drop a course (triggers auto-fill from waitlist)
   */
  router.post('/drop', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, courseId } = req.body;

      if (!studentId || !courseId) {
        return res.status(400).json({
          success: false,
          message: 'studentId and courseId are required',
        });
      }

      const result = await registrationService.dropCourse(studentId, courseId);

      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  // ==================== CLASSROOM STATE ====================

  /**
   * GET /api/registration/classroom/:courseId
   * Get live classroom state
   */
  router.get('/classroom/:courseId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;

      // First try to find by UUID
      let state = await registrationService.getClassroomState(courseId);

      // If not found, try finding by courseId string (e.g., "CS101")
      if (!state) {
        const course = await prisma.course.findUnique({
          where: { courseId: courseId }
        });

        if (course) {
          state = await registrationService.getClassroomState(course.id);
        }
      }

      if (!state) {
        return res.status(404).json({
          success: false,
          message: 'Course not found',
        });
      }

      res.json({
        success: true,
        data: state,
      });
    } catch (error) {
      next(error);
    }
  });

  // ==================== STUDENT STATUS ====================

  /**
   * GET /api/registration/student/:studentId/status
   * Get comprehensive status for a student
   */
  router.get('/student/:studentId/status', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId } = req.params;

      // Try to find by UUID first, then by studentId string
      let student = await prisma.student.findUnique({
        where: { id: studentId }
      });

      if (!student) {
        student = await prisma.student.findUnique({
          where: { studentId: studentId }
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
      next(error);
    }
  });

  // ==================== WAITLIST STATUS ====================

  /**
   * GET /api/registration/waitlist/:courseId
   * Get waitlist for a course
   */
  router.get('/waitlist/:courseId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;
      const limit = parseInt(req.query.limit as string) || 10;

      // Find course
      let course = await prisma.course.findUnique({
        where: { id: courseId }
      });

      if (!course) {
        course = await prisma.course.findUnique({
          where: { courseId: courseId }
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
      next(error);
    }
  });

  // ==================== BOOKING STATUS MANAGEMENT ====================

  /**
   * POST /api/registration/course/:courseId/open-booking
   * Open booking for a course (admin)
   */
  router.post('/course/:courseId/open-booking', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { courseId } = req.params;

      // Find course
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
      next(error);
    }
  });

  /**
   * POST /api/registration/course/:courseId/close-booking
   * Close booking for a course (admin)
   */
  router.post('/course/:courseId/close-booking', async (req: Request, res: Response, next: NextFunction) => {
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
      next(error);
    }
  });

  // ==================== COURSES LIST ====================

  /**
   * GET /api/registration/courses
   * Get all courses with seat availability
   */
  router.get('/courses', async (req: Request, res: Response, next: NextFunction) => {
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
              waitlistEntries: {
                where: { status: 'WAITING' }
              }
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
      next(error);
    }
  });

  // ==================== PREFERENCES ====================

  /**
   * POST /api/registration/preferences
   * Set student course preferences (from recommendation system)
   */
  router.post('/preferences', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { studentId, preferences } = req.body;
      // preferences: [{ courseId: string, priority: number, matchReason?: string }]

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
      next(error);
    }
  });

  /**
   * GET /api/registration/student/:studentId/preferences
   * Get student's course preferences
   */
  router.get('/student/:studentId/preferences', async (req: Request, res: Response, next: NextFunction) => {
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
            bookingStatus: pref.course.seatConfig?.bookingStatus,
          }
        };
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

export default createRegistrationRouter;
