import prisma from "../db.js";

export const getDashboardData = async (req, res) => {
  try {
    const { id } = req.params; // Student ID e.g., STU001

    const student = await prisma.student.findUnique({
      where: { studentId: id },
      include: {
        dashboard: {
            include: {
                weeklyActivity: true,
                semesterProgress: true,
                upcomingDeadlines: true,
                achievements: true,
                recentActivity: true
            }
        }
      }
    });

    if (!student || !student.dashboard) {
      return res.status(404).json({ message: "Dashboard not found for student" });
    }

    // Transform to match the exact JSON structure if needed, or return as is
    // The test data structure was: { weeklyActivity: [], semesterProgress: [], ... } inside the student object in JSON
    // Here we return the dashboard object directly.
    
    // Sort items if necessary (e.g. deadlines by date)
    const dashboard = student.dashboard;
    
    res.json(dashboard);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
};
