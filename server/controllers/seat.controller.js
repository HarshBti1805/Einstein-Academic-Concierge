import prisma from "../db.js";

/**
 * Get seat configuration by course ID (internal UUID)
 */
export const getSeatConfig = async (req, res) => {
    try {
        const { courseId } = req.params;
        const config = await prisma.seatConfig.findUnique({
            where: { courseId: courseId }
        });
        
        if (!config) {
            return res.status(404).json({ 
                success: false,
                message: "Seat config not found" 
            });
        }
        
        res.json({
            success: true,
            ...config
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            message: "Server error" 
        });
    }
};

/**
 * Get seat configuration by course code (e.g., CS101)
 */
export const getSeatConfigByCode = async (req, res) => {
    try {
        const { courseCode } = req.params;
        
        // First find the course by courseId (code)
        const course = await prisma.course.findUnique({
            where: { courseId: courseCode },
            include: { seatConfig: true }
        });
        
        if (!course) {
            return res.status(404).json({ 
                success: false,
                message: "Course not found" 
            });
        }

        if (!course.seatConfig) {
            // Return default config if none exists
            return res.json({
                success: true,
                courseCode,
                totalSeats: 30,
                occupiedSeats: [],
                bookingStatus: "open"
            });
        }
        
        res.json({
            success: true,
            courseCode,
            totalSeats: course.seatConfig.totalSeats,
            occupiedSeats: course.seatConfig.occupiedSeats,
            bookingStatus: course.seatConfig.bookingStatus
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            message: "Server error" 
        });
    }
};

/**
 * Get all seat configurations (for bookings page)
 */
export const getAllSeatConfigs = async (req, res) => {
    try {
        const courses = await prisma.course.findMany({
            include: { seatConfig: true }
        });

        const seatsData = {};
        courses.forEach(course => {
            if (course.seatConfig) {
                seatsData[course.courseId] = {
                    totalSeats: course.seatConfig.totalSeats,
                    occupiedSeats: course.seatConfig.occupiedSeats,
                    bookingStatus: course.seatConfig.bookingStatus
                };
            }
        });

        res.json({
            success: true,
            courses: seatsData
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            message: "Server error" 
        });
    }
};

/**
 * Book a seat for a course
 */
export const bookSeat = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { seatNumbers, studentId } = req.body;
        
        // Handle both single seat and multiple seats
        const seatsToBook = Array.isArray(seatNumbers) ? seatNumbers : [seatNumbers];
        
        // Find course by code
        const course = await prisma.course.findUnique({
            where: { courseId: courseId },
            include: { seatConfig: true }
        });
        
        if (!course || !course.seatConfig) {
            return res.status(404).json({ 
                success: false,
                message: "Course or seat config not found" 
            });
        }

        if (course.seatConfig.bookingStatus !== 'open') {
            return res.status(400).json({ 
                success: false,
                message: "Bookings are not open for this course" 
            });
        }
        
        // Check if any seat is already occupied
        const alreadyOccupied = seatsToBook.filter(seat => 
            course.seatConfig.occupiedSeats.includes(seat)
        );

        if (alreadyOccupied.length > 0) {
            return res.status(400).json({ 
                success: false,
                message: `Seat(s) ${alreadyOccupied.join(', ')} already occupied` 
            });
        }
        
        // Update seat config
        const updatedConfig = await prisma.seatConfig.update({
            where: { courseId: course.seatConfig.courseId },
            data: {
                occupiedSeats: {
                    push: seatsToBook
                }
            }
        });

        // Create enrollment if studentId provided
        if (studentId) {
            const student = await prisma.student.findUnique({
                where: { studentId: studentId }
            });

            if (student) {
                await prisma.enrollment.upsert({
                    where: {
                        courseId_studentId: {
                            courseId: course.id,
                            studentId: student.id
                        }
                    },
                    update: {
                        status: 'ENROLLED'
                    },
                    create: {
                        status: 'ENROLLED',
                        courseId: course.id,
                        studentId: student.id
                    }
                });
            }
        }
        
        res.json({
            success: true,
            message: `Successfully booked ${seatsToBook.length} seat(s)`,
            bookedSeats: seatsToBook,
            updatedConfig: {
                totalSeats: updatedConfig.totalSeats,
                occupiedSeats: updatedConfig.occupiedSeats,
                bookingStatus: updatedConfig.bookingStatus
            }
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            message: "Server error" 
        });
    }
};

/**
 * Release a seat (for cancellation)
 */
export const releaseSeat = async (req, res) => {
    try {
        const { courseId } = req.params;
        const { seatNumber } = req.body;
        
        const course = await prisma.course.findUnique({
            where: { courseId: courseId },
            include: { seatConfig: true }
        });
        
        if (!course || !course.seatConfig) {
            return res.status(404).json({ 
                success: false,
                message: "Course not found" 
            });
        }
        
        const newOccupiedSeats = course.seatConfig.occupiedSeats.filter(
            seat => seat !== seatNumber
        );
        
        const updatedConfig = await prisma.seatConfig.update({
            where: { courseId: course.seatConfig.courseId },
            data: {
                occupiedSeats: newOccupiedSeats
            }
        });
        
        res.json({
            success: true,
            message: `Seat ${seatNumber} released successfully`,
            updatedConfig
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ 
            success: false,
            message: "Server error" 
        });
      }
}
