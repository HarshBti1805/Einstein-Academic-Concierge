import { createRequire } from "module";
import "dotenv/config";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import fs from 'fs/promises';
import path from 'path';

const require = createRequire(import.meta.url);
const { PrismaClient } = require("@prisma/client");

const connectionString = process.env.DATABASE_URL;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Paths to the test data files
// Note: Adjusted paths assuming the script is run from server root
const TEST_DATA_DIR = path.resolve(process.cwd(), 'test-data');

// Map JSON bookingStatus strings to Prisma enum values
const mapBookingStatus = (status) => {
  const statusMap = {
    'open': 'OPEN',
    'closed': 'CLOSED',
    'not_started': 'CLOSED',
    'waitlist_only': 'WAITLIST_ONLY',
    'started': 'STARTED',
    'completed': 'COMPLETED'
  };
  return statusMap[status?.toLowerCase()] || 'CLOSED';
};

async function main() {
  console.log('Start seeding ...');

  // Read data files
  const studentsData = JSON.parse(await fs.readFile(path.join(TEST_DATA_DIR, 'students_data.json'), 'utf-8'));
  const coursesData = JSON.parse(await fs.readFile(path.join(TEST_DATA_DIR, 'courses_data.json'), 'utf-8'));
  const dashboardData = JSON.parse(await fs.readFile(path.join(TEST_DATA_DIR, 'dashboard_data.json'), 'utf-8'));
  const seatsData = JSON.parse(await fs.readFile(path.join(TEST_DATA_DIR, 'seats_data.json'), 'utf-8'));

  // 1. Seed Students & key records
  console.log('Seeding Students...');
  for (const stu of studentsData.students) {
    const student = await prisma.student.upsert({
      where: { studentId: stu.student_id },
      update: {},
      create: {
        studentId: stu.student_id,
        name: stu.name,
        email: stu.email,
        rollNumber: stu.roll_number,
        universityName: stu.university_name,
        branch: stu.branch,
        enrollmentYear: stu.enrollment_year,
        expectedGraduation: stu.expectedGraduation,
        yearOfStudy: stu.year_of_study,
        age: stu.age,
      },
    });

    // Academic Record
    if (stu.academic_data) {
      await prisma.academicRecord.upsert({
        where: { studentId: student.id },
        update: {},
        create: {
          studentId: student.id,
          academicYear: stu.academic_data.academic_year,
          totalCredits: stu.academic_data.totalCredits,
          creditsThisSemester: stu.academic_data.creditsThisSemester,
          overallGpa: stu.academic_data.overall_gpa,
          attendancePercentage: stu.academic_data.attendance_percentage,
          subjects: {
            create: stu.academic_data.subjects.map(sub => ({
              name: sub.name,
              marks: sub.marks,
              grade: sub.grade,
              attendance: sub.attendance,
              teacherRemarks: sub.teacher_remarks
            }))
          }
        }
      });
    }

    // Behavioral Record
    if (stu.behavioral_data) {
      await prisma.behavioralRecord.upsert({
        where: { studentId: student.id },
        update: {},
        create: {
          studentId: student.id,
          participationScore: stu.behavioral_data.participation_score,
          disciplineScore: stu.behavioral_data.discipline_score,
          extracurricular: stu.behavioral_data.extracurricular
        }
      });
    }

    // Dashboard Data
    const dData = dashboardData[stu.student_id];
    if (dData) {
      await prisma.dashboard.upsert({
        where: { studentId: student.id },
        update: {},
        create: {
          studentId: student.id,
          weeklyActivity: {
            create: dData.weeklyActivity.map(wa => ({
              day: wa.day,
              attendance: wa.attendance,
              studyHours: wa.studyHours
            }))
          },
          semesterProgress: {
            create: dData.semesterProgress.map(sp => ({
              semester: sp.semester,
              gpa: sp.gpa,
              credits: sp.credits
            }))
          },
          upcomingDeadlines: {
            create: dData.upcomingDeadlines.map(ud => ({
              title: ud.title,
              course: ud.course,
              dueDate: new Date(ud.dueDate),
              type: ud.type,
              priority: ud.priority
            }))
          },
          achievements: {
            create: dData.achievements.map(ach => ({
              title: ach.title,
              description: ach.description,
              icon: ach.icon,
              date: ach.date ? new Date(ach.date) : null,
              unlocked: ach.unlocked
            }))
          },
          recentActivity: {
            create: dData.recentActivity.map(ra => ({
              action: ra.action,
              details: ra.details,
              timestamp: new Date(ra.timestamp)
            }))
          }
        }
      });
    }
  }

  // 2. Seed Courses & Instructors
  console.log('Seeding Courses & Instructors...');
  for (const c of coursesData.courses) {
    // Instructor
    let instructorId;
    if (c.instructor) {
      const instructor = await prisma.instructor.upsert({
        where: { email: c.instructor.email },
        update: {},
        create: {
          name: c.instructor.name,
          email: c.instructor.email,
          department: c.instructor.department,
          toughnessRating: c.instructor.toughness_rating,
          generalRemarks: c.instructor.general_remarks
        }
      });
      instructorId = instructor.id;
    }

    // Course
    const course = await prisma.course.upsert({
      where: { courseId: c.course_id },
      update: {},
      create: {
        courseId: c.course_id,
        name: c.name,
        category: c.category,
        difficulty: c.difficulty,
        prerequisites: c.prerequisites,
        description: c.description,
        skillsDeveloped: c.skills_developed,
        careerPaths: c.career_paths,
        idealFor: c.ideal_for,
        minGpaRecommended: c.min_gpa_recommended,
        keywords: c.keywords,
        classroomNumber: c.classroom_number,
        schedule: c.schedule,
        instructorId: instructorId
      }
    });

    // Seat Config
    const sData = seatsData.courses[c.course_id];
    if (sData) {
        const bookingStatusEnum = mapBookingStatus(sData.bookingStatus);
        await prisma.seatConfig.upsert({
            where: { courseId: course.id },
            update: {
                totalSeats: sData.totalSeats,
                occupiedSeats: sData.occupiedSeats,
                bookingStatus: bookingStatusEnum,
                rows: seatsData.seatConfig?.rowsPerSection || 13,
                seatsPerRow: seatsData.seatConfig?.seatsPerRow || 20
            },
            create: {
                courseId: course.id,
                totalSeats: sData.totalSeats,
                occupiedSeats: sData.occupiedSeats,
                bookingStatus: bookingStatusEnum,
                rows: seatsData.seatConfig?.rowsPerSection || 13,
                seatsPerRow: seatsData.seatConfig?.seatsPerRow || 20
            }
        });
    }
  }

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
