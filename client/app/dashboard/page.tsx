"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import gsap from "gsap";
import {
  Calendar,
  BookOpen,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  Bell,
  Sparkles,
  Target,
  Zap,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { AnimatedCard, GradientCard } from "@/components/ui/animated-card";
import { ProgressRing } from "@/components/ui/progress-ring";
import { AnimatedProgressBar, AnimatedDonutChart } from "@/components/ui/charts";
import { GridBackground } from "@/components/ui/background-beams";
import { cn } from "@/lib/utils";

// Import mock data
import studentData from "@/lib/mock-data/student.json";
import coursesData from "@/lib/mock-data/courses.json";
import dashboardData from "@/lib/mock-data/dashboard.json";

interface StudentInfo {
  name: string;
  rollNumber: string;
  email: string;
}

interface Course {
  code: string;
  name: string;
  credits: number;
  grade: string;
  gradePoints: number;
  attendance: number;
  instructor: string;
  schedule: string;
  status: string;
}

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  const statsRef = useRef<HTMLDivElement>(null);

  const courses: Course[] = coursesData.currentCourses;
  const { academicStats } = studentData;
  const { upcomingDeadlines, achievements, semesterProgress } = dashboardData;

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = sessionStorage.getItem("studentData");
      if (data) {
        try {
          const parsed = JSON.parse(data);
          setStudentInfo(parsed);
          setMounted(true);
        } catch {
          router.push("/");
        }
      } else {
        router.push("/");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (mounted && heroRef.current) {
      // GSAP animations for hero section
      gsap.fromTo(
        ".hero-text",
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.8, stagger: 0.1, ease: "power3.out" }
      );

      // Animate stats cards
      gsap.fromTo(
        ".stat-card",
        { opacity: 0, y: 20, scale: 0.95 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: 0.5,
          stagger: 0.1,
          ease: "back.out(1.7)",
          delay: 0.3,
        }
      );
    }
  }, [mounted]);

  if (!mounted || !studentInfo) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full"
        />
      </div>
    );
  }

  // Calculate grade distribution
  const gradeDistribution = courses.reduce((acc, course) => {
    acc[course.grade] = (acc[course.grade] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const gradeColors: Record<string, string> = {
    A: "#22c55e",
    "A-": "#4ade80",
    "B+": "#fbbf24",
    B: "#fb923c",
    "B-": "#f97316",
    C: "#ef4444",
  };

  const donutData = Object.entries(gradeDistribution).map(([label, value]) => ({
    label,
    value,
    color: gradeColors[label] || "#6366f1",
  }));

  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      <GridBackground />

      <Header
        title="Dashboard"
        subtitle="Welcome back to your academic portal"
        userName={studentInfo.name}
        userRole="Student"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 relative z-10">
        {/* Hero Section */}
        <div ref={heroRef} className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8"
          >
            <div className="absolute inset-0 bg-black/20" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10 flex flex-col lg:flex-row items-center justify-between gap-6">
              <div>
                <h2 className="hero-text text-3xl lg:text-4xl font-bold text-white mb-2">
                  Hello, {studentInfo.name.split(" ")[0]}!
                </h2>
                <p className="hero-text text-white/80 text-lg mb-4">
                  Ready to book your next courses?
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => router.push("/assistant")}
                  className="hero-text inline-flex items-center gap-2 px-6 py-3 bg-white text-indigo-600 font-semibold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                >
                  <Sparkles className="h-5 w-5" />
                  AI Course Assistant
                  <ChevronRight className="h-5 w-5" />
                </motion.button>
              </div>

              <div className="flex gap-4">
                <div className="stat-card glass-light rounded-xl p-4 text-center min-w-[120px]">
                  <div className="text-3xl font-bold text-white">
                    {academicStats.currentGPA}
                  </div>
                  <div className="text-white/70 text-sm">Current GPA</div>
                </div>
                <div className="stat-card glass-light rounded-xl p-4 text-center min-w-[120px]">
                  <div className="text-3xl font-bold text-white">
                    {academicStats.overallAttendance}%
                  </div>
                  <div className="text-white/70 text-sm">Attendance</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Stats Cards */}
        <div ref={statsRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <AnimatedCard delay={0.1} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-indigo-500/10">
                <Calendar className="h-6 w-6 text-indigo-400" />
              </div>
              <span className="text-xs text-zinc-500 font-medium">
                {academicStats.academicYear}
              </span>
            </div>
            <div className="text-2xl font-bold text-white">Semester 5</div>
            <div className="text-sm text-zinc-400 mt-1">Current Semester</div>
          </AnimatedCard>

          <AnimatedCard delay={0.2} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-green-500/10">
                <BookOpen className="h-6 w-6 text-green-400" />
              </div>
              <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                +2 this sem
              </span>
            </div>
            <div className="text-2xl font-bold text-white">{courses.length}</div>
            <div className="text-sm text-zinc-400 mt-1">Active Courses</div>
          </AnimatedCard>

          <AnimatedCard delay={0.3} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-purple-500/10">
                <Target className="h-6 w-6 text-purple-400" />
              </div>
              <span className="text-xs text-purple-400 font-medium">On Track</span>
            </div>
            <div className="text-2xl font-bold text-white">{totalCredits}</div>
            <div className="text-sm text-zinc-400 mt-1">Total Credits</div>
          </AnimatedCard>

          <AnimatedCard delay={0.4} className="stat-card">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Award className="h-6 w-6 text-amber-400" />
              </div>
              <span className="text-xs text-amber-400 font-medium">Dean&apos;s List</span>
            </div>
            <div className="text-2xl font-bold text-white">
              {academicStats.standing}
            </div>
            <div className="text-sm text-zinc-400 mt-1">Academic Standing</div>
          </AnimatedCard>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Attendance Analytics */}
          <GradientCard delay={0.2} className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Course Attendance
                </h3>
                <p className="text-sm text-zinc-400">Your attendance by course</p>
              </div>
              <div className="p-2 rounded-lg bg-green-500/10">
                <TrendingUp className="h-5 w-5 text-green-400" />
              </div>
            </div>
            <div className="space-y-4">
              {courses.map((course, index) => (
                <motion.div
                  key={course.code}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                >
                  <AnimatedProgressBar
                    value={course.attendance}
                    label={`${course.code} - ${course.name}`}
                    color={
                      course.attendance >= 90
                        ? "green"
                        : course.attendance >= 80
                        ? "yellow"
                        : "red"
                    }
                  />
                </motion.div>
              ))}
            </div>
          </GradientCard>

          {/* Grade Distribution */}
          <GradientCard delay={0.3}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Grade Distribution
                </h3>
                <p className="text-sm text-zinc-400">This semester</p>
              </div>
            </div>
            <div className="flex justify-center">
              <AnimatedDonutChart data={donutData} size={180} strokeWidth={24} />
            </div>
            <div className="flex flex-wrap justify-center gap-4 mt-6">
              {donutData.map((item) => (
                <div key={item.label} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-zinc-400">
                    {item.label}: {item.value}
                  </span>
                </div>
              ))}
            </div>
          </GradientCard>
        </div>

        {/* Performance & Progress */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Progress Rings */}
          <GradientCard delay={0.4}>
            <h3 className="text-lg font-semibold text-white mb-6">
              Key Metrics
            </h3>
            <div className="flex flex-wrap justify-center gap-6">
              <ProgressRing
                percentage={academicStats.overallAttendance}
                size={100}
                strokeWidth={8}
                color="green"
                label="Attendance"
                value={`${academicStats.overallAttendance}%`}
              />
              <ProgressRing
                percentage={(academicStats.currentGPA / 4.0) * 100}
                size={100}
                strokeWidth={8}
                color="purple"
                label="GPA"
                value={academicStats.currentGPA}
              />
            </div>
          </GradientCard>

          {/* Semester Progress */}
          <GradientCard delay={0.5} className="lg:col-span-2">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  GPA Trend
                </h3>
                <p className="text-sm text-zinc-400">
                  Your academic progress over semesters
                </p>
              </div>
              <div className="p-2 rounded-lg bg-indigo-500/10">
                <Zap className="h-5 w-5 text-indigo-400" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2 h-40">
              {semesterProgress.map((sem, index) => {
                const height = (sem.gpa / 4.0) * 100;
                return (
                  <motion.div
                    key={sem.semester}
                    className="flex-1 flex flex-col items-center gap-2"
                    initial={{ height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ delay: 0.1 * index, duration: 0.8 }}
                  >
                    <div
                      className={cn(
                        "w-full rounded-t-lg relative overflow-hidden",
                        index === semesterProgress.length - 1
                          ? "bg-gradient-to-t from-indigo-600 to-indigo-400"
                          : "bg-gradient-to-t from-zinc-700 to-zinc-600"
                      )}
                      style={{ height: `${height}%`, minHeight: 20 }}
                    >
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-white">
                          {sem.gpa}
                        </span>
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500 text-center">
                      {sem.semester.split(" ")[0].slice(0, 2)}{" "}
                      {sem.semester.split(" ")[1].slice(2)}
                    </span>
                  </motion.div>
                );
              })}
            </div>
          </GradientCard>
        </div>

        {/* Upcoming Deadlines & Achievements */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Upcoming Deadlines */}
          <GradientCard delay={0.6}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Upcoming Deadlines
                </h3>
                <p className="text-sm text-zinc-400">Next 2 weeks</p>
              </div>
              <div className="p-2 rounded-lg bg-red-500/10">
                <Clock className="h-5 w-5 text-red-400" />
              </div>
            </div>
            <div className="space-y-3">
              {upcomingDeadlines.slice(0, 4).map((deadline, index) => (
                <motion.div
                  key={deadline.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 * index }}
                  className={cn(
                    "flex items-center gap-4 p-3 rounded-lg",
                    "bg-white/5 border border-white/5 hover:bg-white/10 transition-colors"
                  )}
                >
                  <div
                    className={cn(
                      "h-2 w-2 rounded-full",
                      deadline.priority === "high"
                        ? "bg-red-500"
                        : deadline.priority === "medium"
                        ? "bg-yellow-500"
                        : "bg-green-500"
                    )}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {deadline.title}
                    </p>
                    <p className="text-xs text-zinc-500">{deadline.course}</p>
                  </div>
                  <span className="text-xs text-zinc-400 whitespace-nowrap">
                    {new Date(deadline.dueDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </motion.div>
              ))}
            </div>
          </GradientCard>

          {/* Achievements */}
          <GradientCard delay={0.7}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold text-white">
                  Achievements
                </h3>
                <p className="text-sm text-zinc-400">Your accomplishments</p>
              </div>
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Award className="h-5 w-5 text-amber-400" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {achievements.map((achievement, index) => (
                <motion.div
                  key={achievement.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.1 * index }}
                  className={cn(
                    "flex flex-col items-center p-4 rounded-xl text-center",
                    achievement.unlocked
                      ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20"
                      : "bg-white/5 border border-white/5 opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center mb-2",
                      achievement.unlocked
                        ? "bg-amber-500/20"
                        : "bg-zinc-800"
                    )}
                  >
                    <Award
                      className={cn(
                        "h-5 w-5",
                        achievement.unlocked
                          ? "text-amber-400"
                          : "text-zinc-600"
                      )}
                    />
                  </div>
                  <p className="text-sm font-medium text-white">
                    {achievement.title}
                  </p>
                  <p className="text-xs text-zinc-500 mt-1">
                    {achievement.description}
                  </p>
                </motion.div>
              ))}
            </div>
          </GradientCard>
        </div>

        {/* Courses Table */}
        <GradientCard delay={0.8}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-white">My Courses</h3>
              <p className="text-sm text-zinc-400">
                Current semester enrollment
              </p>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => router.push("/assistant")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/10 text-indigo-400 text-sm font-medium hover:bg-indigo-500/20 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Book More
            </motion.button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Course
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Instructor
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Schedule
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Grade
                  </th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Attendance
                  </th>
                </tr>
              </thead>
              <tbody>
                {courses.map((course, index) => (
                  <motion.tr
                    key={course.code}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 * index }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <td className="py-4 px-4">
                      <div>
                        <p className="font-medium text-white">{course.code}</p>
                        <p className="text-sm text-zinc-400">{course.name}</p>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-zinc-300">
                      {course.instructor}
                    </td>
                    <td className="py-4 px-4 text-sm text-zinc-400">
                      {course.schedule}
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={cn(
                          "inline-flex px-2.5 py-1 rounded-full text-xs font-semibold",
                          course.grade.startsWith("A")
                            ? "bg-green-500/10 text-green-400"
                            : course.grade.startsWith("B")
                            ? "bg-yellow-500/10 text-yellow-400"
                            : "bg-red-500/10 text-red-400"
                        )}
                      >
                        {course.grade}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${course.attendance}%` }}
                            transition={{ delay: 0.5, duration: 0.8 }}
                            className={cn(
                              "h-full rounded-full",
                              course.attendance >= 90
                                ? "bg-green-500"
                                : course.attendance >= 80
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                          />
                        </div>
                        <span className="text-sm text-zinc-300">
                          {course.attendance}%
                        </span>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </GradientCard>
      </main>
    </div>
  );
}
