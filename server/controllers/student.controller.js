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

/**
 * Get full student data for dashboard (includes academic, behavioral, dashboard data)
 * This is used by the dashboard page to display all student information
 */
export const getStudentDashboardData = async (req, res) => {
  try {
    // Get student ID from authenticated user (set by auth middleware)
    const studentId = req.user?.studentId || req.params.id;

    if (!studentId) {
      return res.status(400).json({ 
        success: false,
        message: "Student ID is required" 
      });
    }

    const student = await prisma.student.findUnique({
      where: { studentId: studentId },
      include: {
        academic: {
          include: { 
            subjects: true 
          }
        },
        behavioral: true,
        dashboard: {
          include: {
            weeklyActivity: true,
            semesterProgress: true,
            upcomingDeadlines: {
              orderBy: { dueDate: 'asc' }
            },
            achievements: true,
            recentActivity: {
              orderBy: { timestamp: 'desc' },
              take: 10
            }
          }
        },
        enrollments: {
          include: { 
            course: {
              include: {
                instructor: true
              }
            }
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ 
        success: false,
        message: "Student not found" 
      });
    }

    // Transform data to match frontend expected format
    const responseData = {
      success: true,
      student: {
        student_id: student.studentId,
        name: student.name,
        email: student.email,
        roll_number: student.rollNumber,
        university_name: student.universityName,
        branch: student.branch,
        enrollment_year: student.enrollmentYear,
        expectedGraduation: student.expectedGraduation,
        year_of_study: student.yearOfStudy,
        age: student.age,
        academic_data: student.academic ? {
          academic_year: student.academic.academicYear,
          totalCredits: student.academic.totalCredits,
          creditsThisSemester: student.academic.creditsThisSemester,
          overall_gpa: student.academic.overallGpa,
          attendance_percentage: student.academic.attendancePercentage,
          subjects: student.academic.subjects.map(sub => ({
            name: sub.name,
            marks: sub.marks,
            grade: sub.grade,
            attendance: sub.attendance,
            teacher_remarks: sub.teacherRemarks || ""
          }))
        } : null,
        behavioral_data: student.behavioral ? {
          participation_score: student.behavioral.participationScore,
          discipline_score: student.behavioral.disciplineScore,
          extracurricular: student.behavioral.extracurricular
        } : null
      },
      dashboard: student.dashboard ? {
        weeklyActivity: student.dashboard.weeklyActivity.map(wa => ({
          day: wa.day,
          attendance: wa.attendance,
          studyHours: wa.studyHours
        })),
        semesterProgress: student.dashboard.semesterProgress.map(sp => ({
          semester: sp.semester,
          gpa: sp.gpa,
          credits: sp.credits
        })),
        upcomingDeadlines: student.dashboard.upcomingDeadlines.map(ud => ({
          id: ud.id,
          title: ud.title,
          course: ud.course,
          dueDate: ud.dueDate.toISOString().split('T')[0],
          type: ud.type,
          priority: ud.priority
        })),
        achievements: student.dashboard.achievements.map(ach => ({
          id: ach.id,
          title: ach.title,
          description: ach.description,
          icon: ach.icon,
          date: ach.date ? ach.date.toISOString().split('T')[0] : null,
          unlocked: ach.unlocked
        })),
        recentActivity: student.dashboard.recentActivity.map(ra => ({
          id: ra.id,
          action: ra.action,
          details: ra.details,
          timestamp: ra.timestamp.toISOString()
        }))
      } : null
    };

    res.json(responseData);

  } catch (error) {
    console.error("Error fetching student dashboard data:", error);
    res.status(500).json({ 
      success: false,
      message: "Server error while fetching dashboard data" 
    });
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
