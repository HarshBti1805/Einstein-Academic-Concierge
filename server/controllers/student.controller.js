import prisma from "../db.js";

export const getStudentProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { studentId: id },
      include: {
        academic: {
          include: { subjects: true }
        },
        behavioral: true,
        dashboard: true,
        enrollments: {
            include: { course: true }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    res.json(student);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};

export const getAllStudents = async (req, res) => {
  try {
    const students = await prisma.student.findMany();
    res.json(students);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
