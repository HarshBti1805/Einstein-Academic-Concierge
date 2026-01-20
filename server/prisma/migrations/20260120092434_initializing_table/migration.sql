-- CreateTable
CREATE TABLE "Student" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rollNumber" TEXT NOT NULL,
    "universityName" TEXT NOT NULL,
    "branch" TEXT NOT NULL,
    "enrollmentYear" INTEGER NOT NULL,
    "expectedGraduation" INTEGER NOT NULL,
    "yearOfStudy" INTEGER NOT NULL,
    "age" INTEGER NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYear" TEXT NOT NULL,
    "totalCredits" INTEGER NOT NULL,
    "creditsThisSemester" INTEGER NOT NULL,
    "overallGpa" DOUBLE PRECISION NOT NULL,
    "attendancePercentage" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "AcademicRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SubjectRecord" (
    "id" TEXT NOT NULL,
    "academicRecordId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "marks" DOUBLE PRECISION NOT NULL,
    "grade" TEXT NOT NULL,
    "attendance" DOUBLE PRECISION NOT NULL,
    "teacherRemarks" TEXT,

    CONSTRAINT "SubjectRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BehavioralRecord" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "participationScore" DOUBLE PRECISION NOT NULL,
    "disciplineScore" DOUBLE PRECISION NOT NULL,
    "extracurricular" TEXT[],

    CONSTRAINT "BehavioralRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Instructor" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "toughnessRating" TEXT NOT NULL,
    "generalRemarks" TEXT NOT NULL,

    CONSTRAINT "Instructor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "prerequisites" TEXT[],
    "description" TEXT NOT NULL,
    "skillsDeveloped" TEXT[],
    "careerPaths" TEXT[],
    "idealFor" TEXT NOT NULL,
    "minGpaRecommended" DOUBLE PRECISION NOT NULL,
    "keywords" TEXT[],
    "classroomNumber" TEXT NOT NULL,
    "schedule" JSONB NOT NULL,
    "instructorId" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Enrollment" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Dashboard" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,

    CONSTRAINT "Dashboard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WeeklyActivity" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "day" TEXT NOT NULL,
    "attendance" INTEGER NOT NULL,
    "studyHours" INTEGER NOT NULL,

    CONSTRAINT "WeeklyActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SemesterProgress" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "semester" TEXT NOT NULL,
    "gpa" DOUBLE PRECISION NOT NULL,
    "credits" INTEGER NOT NULL,

    CONSTRAINT "SemesterProgress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Deadline" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "course" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "type" TEXT NOT NULL,
    "priority" TEXT NOT NULL,

    CONSTRAINT "Deadline_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Achievement" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "date" TIMESTAMP(3),
    "unlocked" BOOLEAN NOT NULL,

    CONSTRAINT "Achievement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecentActivity" (
    "id" TEXT NOT NULL,
    "dashboardId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "details" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecentActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SeatConfig" (
    "id" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "totalSeats" INTEGER NOT NULL,
    "occupiedSeats" INTEGER[],
    "bookingStatus" TEXT NOT NULL,

    CONSTRAINT "SeatConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Student_studentId_key" ON "Student"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_email_key" ON "Student"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_rollNumber_key" ON "Student"("rollNumber");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicRecord_studentId_key" ON "AcademicRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "BehavioralRecord_studentId_key" ON "BehavioralRecord"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Instructor_email_key" ON "Instructor"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Course_courseId_key" ON "Course"("courseId");

-- CreateIndex
CREATE UNIQUE INDEX "Dashboard_studentId_key" ON "Dashboard"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "SeatConfig_courseId_key" ON "SeatConfig"("courseId");

-- AddForeignKey
ALTER TABLE "AcademicRecord" ADD CONSTRAINT "AcademicRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectRecord" ADD CONSTRAINT "SubjectRecord_academicRecordId_fkey" FOREIGN KEY ("academicRecordId") REFERENCES "AcademicRecord"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BehavioralRecord" ADD CONSTRAINT "BehavioralRecord_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "Instructor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dashboard" ADD CONSTRAINT "Dashboard_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WeeklyActivity" ADD CONSTRAINT "WeeklyActivity_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SemesterProgress" ADD CONSTRAINT "SemesterProgress_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Deadline" ADD CONSTRAINT "Deadline_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Achievement" ADD CONSTRAINT "Achievement_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecentActivity" ADD CONSTRAINT "RecentActivity_dashboardId_fkey" FOREIGN KEY ("dashboardId") REFERENCES "Dashboard"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SeatConfig" ADD CONSTRAINT "SeatConfig_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
