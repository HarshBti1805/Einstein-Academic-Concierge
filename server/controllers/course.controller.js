import prisma from "../db.js";

export const getAllCourses = async (req, res) => {
  try {
    const { category, search } = req.query;
    const where = {};

    if (category && category !== 'All') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { courseId: { contains: search, mode: 'insensitive' } }
      ];
    }

    const courses = await prisma.course.findMany({
      where,
      include: {
        instructor: true,
        enrollments: true, // simplified for checking count if needed
        seatConfig: true
      }
    });

    res.json({ courses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getCourseById = async (req, res) => {
  try {
    const { id } = req.params;
    const course = await prisma.course.findUnique({
      where: { courseId: id },
      include: {
        instructor: true,
        enrollments: true,
        seatConfig: true
      }
    });

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    res.json(course);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
