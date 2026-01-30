"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fontVariables } from "@/lib/fonts";
import { LayoutDashboard, HelpCircle } from "lucide-react";

import {
  Calendar,
  BookOpen,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  Sparkles,
  Target,
  Zap,
  GraduationCap,
  Bell,
  Settings,
  LogOut,
  User,
  ChevronDown,
  BarChart3,
  CheckCircle2,
  AlertCircle,
  Flame,
  ChevronLeft,
  CalendarDays,
  MapPin,
  Users,
  TrendingDown,
  Activity,
  Lightbulb,
  BookMarked,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeft,
} from "lucide-react";
import { cn } from "@/lib/utils";

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// Type definitions for the JSON data
interface Subject {
  name: string;
  marks: number;
  grade: string;
  attendance: number;
  teacher_remarks: string;
}

interface StudentData {
  student_id: string;
  name: string;
  email: string;
  roll_number: string;
  university_name: string;
  branch: string;
  enrollment_year: number;
  expectedGraduation: number;
  year_of_study: number;
  age: number;
  academic_data: {
    academic_year: string;
    totalCredits: number;
    creditsThisSemester: number;
    overall_gpa: number;
    attendance_percentage: number;
    subjects: Subject[];
  };
  behavioral_data: {
    participation_score: number;
    discipline_score: number;
    extracurricular: string[];
  };
}

interface DashboardData {
  weeklyActivity: { day: string; attendance: number; studyHours: number }[];
  semesterProgress: { semester: string; gpa: number; credits: number }[];
  upcomingDeadlines: {
    id: number;
    title: string;
    course: string;
    dueDate: string;
    type: string;
    priority: string;
  }[];
  achievements: {
    id: number;
    title: string;
    description: string;
    icon: string;
    date: string | null;
    unlocked: boolean;
  }[];
  recentActivity: {
    id: number;
    action: string;
    details: string;
    timestamp: string;
  }[];
}

interface StudentInfo {
  name: string;
  rollNumber: string;
  email: string;
  student_id: string;
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

// Timetable interfaces
interface ScheduledClass {
  id: string;
  courseCode: string;
  courseName: string;
  instructor: string;
  room: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
  color: string;
}

// Sample timetable data based on courses
const generateTimetableData = (
  subjects: Subject[],
): Record<string, ScheduledClass[]> => {
  const colors = [
    "bg-blue-100 border-blue-300 text-blue-800",
    "bg-emerald-100 border-emerald-300 text-emerald-800",
    "bg-purple-100 border-purple-300 text-purple-800",
    "bg-amber-100 border-amber-300 text-amber-800",
    "bg-rose-100 border-rose-300 text-rose-800",
    "bg-cyan-100 border-cyan-300 text-cyan-800",
    "bg-indigo-100 border-indigo-300 text-indigo-800",
    "bg-orange-100 border-orange-300 text-orange-800",
  ];

  const schedules: { weekdays: string[]; start: string; end: string }[] = [
    {
      weekdays: ["Monday", "Wednesday", "Friday"],
      start: "09:00",
      end: "10:30",
    },
    { weekdays: ["Tuesday", "Thursday"], start: "10:00", end: "11:30" },
    { weekdays: ["Monday", "Wednesday"], start: "11:00", end: "12:30" },
    { weekdays: ["Tuesday", "Thursday"], start: "14:00", end: "15:30" },
    {
      weekdays: ["Monday", "Wednesday", "Friday"],
      start: "13:00",
      end: "14:30",
    },
    { weekdays: ["Tuesday", "Thursday"], start: "09:00", end: "10:30" },
    { weekdays: ["Wednesday", "Friday"], start: "15:00", end: "16:30" },
    { weekdays: ["Monday", "Thursday"], start: "16:00", end: "17:30" },
  ];

  const rooms = [
    "Room 101",
    "Room 205",
    "Lab 301",
    "Hall A",
    "Room 112",
    "Lab 204",
    "Room 308",
    "Hall B",
  ];
  const instructors = [
    "Dr. Smith",
    "Prof. Johnson",
    "Dr. Williams",
    "Prof. Brown",
    "Dr. Davis",
    "Prof. Miller",
    "Dr. Wilson",
    "Prof. Moore",
  ];

  const timetable: Record<string, ScheduledClass[]> = {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
  };

  subjects.forEach((subject, index) => {
    const schedule = schedules[index % schedules.length];
    const color = colors[index % colors.length];
    const room = rooms[index % rooms.length];
    const instructor = instructors[index % instructors.length];

    schedule.weekdays.forEach((day) => {
      if (timetable[day]) {
        timetable[day].push({
          id: `${subject.name}-${day}`,
          courseCode: `SUBJ${(index + 1).toString().padStart(3, "0")}`,
          courseName: subject.name,
          instructor,
          room,
          startTime: schedule.start,
          endTime: schedule.end,
          color,
        });
      }
    });
  });

  // Sort classes by start time for each day
  Object.keys(timetable).forEach((day) => {
    timetable[day].sort((a, b) => a.startTime.localeCompare(b.startTime));
  });

  return timetable;
};

// Time slots for the calendar (8 AM to 6 PM)
const timeSlots = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
];

const formatTime = (time: string): string => {
  const [hours, minutes] = time.split(":");
  const hour = parseInt(hours, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
};

const getTimePosition = (time: string): number => {
  const [hours, minutes] = time.split(":").map(Number);
  const startHour = 8; // Calendar starts at 8 AM
  return ((hours - startHour) * 60 + minutes) / 60;
};

const getClassHeight = (startTime: string, endTime: string): number => {
  const start = getTimePosition(startTime);
  const end = getTimePosition(endTime);
  return (end - start) * 60; // 60px per hour
};

// Custom Progress Ring Component
const ProgressRing = ({
  percentage,
  size = 120,
  strokeWidth = 10,
  color = "purple",
  label,
  value,
}: {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: "green" | "purple" | "blue" | "amber";
  label: string;
  value: string | number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorMap = {
    green: { stroke: "#22c55e", bg: "rgba(34, 197, 94, 0.1)" },
    purple: { stroke: "#a855f7", bg: "rgba(168, 85, 247, 0.1)" },
    blue: { stroke: "#3b82f6", bg: "rgba(59, 130, 246, 0.1)" },
    amber: { stroke: "#f59e0b", bg: "rgba(245, 158, 11, 0.1)" },
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="transform -rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(0,0,0,0.05)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorMap[color].stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1.5, ease: "easeOut", delay: 0.5 }}
            style={{
              strokeDasharray: circumference,
              filter: `drop-shadow(0 0 8px ${colorMap[color].stroke}40)`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-2xl font-bold text-gray-900"
            style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
          >
            {value}
          </span>
        </div>
      </div>
      <span className="text-sm text-gray-500">{label}</span>
    </div>
  );
};

// Animated Card Component
const AnimatedCard = ({
  children,
  className,
  delay = 0,
  hover = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "relative group rounded-2xl p-6 transition-all duration-300",
        className,
      )}
      style={{
        background: "rgba(255, 255, 255, 0.3)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.15) inset, inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px rounded-t-2xl pointer-events-none opacity-80"
        style={{
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
        }}
      />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
};

// Gradient Card Component
const GradientCard = ({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className={cn(
        "relative group rounded-2xl overflow-hidden transition-all duration-300",
        className,
      )}
      style={{
        background: "rgba(255, 255, 255, 0.3)",
        backdropFilter: "blur(24px) saturate(180%)",
        WebkitBackdropFilter: "blur(24px) saturate(180%)",
        border: "1px solid rgba(255, 255, 255, 0.5)",
        boxShadow:
          "0 8px 32px rgba(0,0,0,0.08), 0 0 0 1px rgba(255,255,255,0.15) inset, inset 0 1px 0 rgba(255,255,255,0.6)",
      }}
    >
      <div className="relative z-10 p-6">{children}</div>
    </motion.div>
  );
};

// Progress Bar Component
const AnimatedProgressBar = ({
  value,
  label,
  color = "purple",
}: {
  value: number;
  label: string;
  color?: "green" | "yellow" | "red" | "purple";
}) => {
  const colorMap = {
    green: "from-emerald-500 to-green-400",
    yellow: "from-amber-500 to-yellow-400",
    red: "from-red-500 to-rose-400",
    purple: "from-purple-500 to-violet-400",
  };

  const glowMap = {
    green: "shadow-emerald-500/30",
    yellow: "shadow-amber-500/30",
    red: "shadow-red-500/30",
    purple: "shadow-purple-500/30",
  };

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-gray-700 truncate pr-4">{label}</span>
        <span className="text-sm font-semibold text-gray-900">{value}%</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          className={cn(
            "h-full rounded-full bg-gradient-to-r shadow-lg",
            colorMap[color],
            glowMap[color],
          )}
        />
      </div>
    </div>
  );
};

// Donut Chart Component
const AnimatedDonutChart = ({
  data,
  size = 180,
  strokeWidth = 24,
}: {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const segments = data.map((item, index) => {
    const segmentLength = (item.value / total) * circumference;
    const previousOffset = data.slice(0, index).reduce((sum, prevItem) => {
      return sum + (prevItem.value / total) * circumference;
    }, 0);
    return {
      ...item,
      segmentLength,
      offset: previousOffset,
    };
  });

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(0,0,0,0.03)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {segments.map((segment, index) => (
          <motion.circle
            key={segment.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={segment.color}
            strokeWidth={strokeWidth - 4}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDasharray: `${segment.segmentLength - 4} ${circumference}`,
              strokeDashoffset: -segment.offset,
            }}
            transition={{ duration: 1, ease: "easeOut", delay: 0.2 * index }}
            style={{
              filter: `drop-shadow(0 0 6px ${segment.color}50)`,
            }}
          />
        ))}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span
          className="text-3xl font-bold text-gray-900"
          style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
        >
          {total}
        </span>
        <span className="text-xs text-gray-500">Subjects</span>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [currentStudent, setCurrentStudent] = useState<StudentData | null>(
    null,
  );
  const [currentDashboardData, setCurrentDashboardData] =
    useState<DashboardData | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  type NavKey = "dashboard" | "courses" | "schedule" | "grades";
  const [activeNav, setActiveNav] = useState<NavKey>("dashboard");
  const heroRef = useRef<HTMLDivElement>(null);

  const [particles, setParticles] = useState<
    Array<{
      x: number;
      y: number;
      duration: number;
      delay: number;
      left: string;
    }>
  >([]);

  // Timetable state
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [showMiniCalendar, setShowMiniCalendar] = useState(false);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const token = sessionStorage.getItem("authToken");
      const data = sessionStorage.getItem("studentData");

      if (!token || !data) {
        router.push("/");
        return;
      }

      try {
        const parsed = JSON.parse(data);
        setStudentInfo(parsed);

        // Fetch dashboard data from API
        const response = await fetch(
          `${API_BASE_URL}/api/students/${parsed.student_id}/dashboard`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (!response.ok) {
          if (response.status === 401) {
            // Token expired or invalid, redirect to login
            sessionStorage.removeItem("authToken");
            sessionStorage.removeItem("studentData");
            router.push("/");
            return;
          }
          throw new Error("Failed to fetch dashboard data");
        }

        const result = await response.json();

        if (result.success && result.student) {
          // Transform API response to match frontend types
          const studentData: StudentData = {
            student_id: result.student.student_id,
            name: result.student.name,
            email: result.student.email,
            roll_number: result.student.roll_number,
            university_name: result.student.university_name,
            branch: result.student.branch,
            enrollment_year: result.student.enrollment_year,
            expectedGraduation: result.student.expectedGraduation,
            year_of_study: result.student.year_of_study,
            age: result.student.age,
            academic_data: result.student.academic_data || {
              academic_year: "",
              totalCredits: 0,
              creditsThisSemester: 0,
              overall_gpa: 0,
              attendance_percentage: 0,
              subjects: [],
            },
            behavioral_data: result.student.behavioral_data || {
              participation_score: 0,
              discipline_score: 0,
              extracurricular: [],
            },
          };

          setCurrentStudent(studentData);

          if (result.dashboard) {
            setCurrentDashboardData(result.dashboard);
          }

          setMounted(true);
        } else {
          throw new Error("Invalid response data");
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        router.push("/");
      }
    };

    const timer = setTimeout(fetchDashboardData, 0);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setParticles(
        Array.from({ length: 20 }, () => ({
          x: Math.random() * window.innerWidth,
          y: window.innerHeight + 10,
          duration: 12 + Math.random() * 8,
          delay: Math.random() * 12,
          left: `${Math.random() * 100}%`,
        })),
      );
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      gsap.to(".orb-1", {
        x: 50,
        y: -30,
        duration: 10,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".orb-2", {
        x: -40,
        y: 40,
        duration: 12,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
      gsap.to(".orb-3", {
        scale: 1.2,
        duration: 8,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, [mounted]);

  if (!mounted || !studentInfo || !currentStudent || !currentDashboardData) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center relative overflow-hidden ${fontVariables}`}
        style={{
          background:
            "linear-gradient(165deg, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 60%, #e2e8f0 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
            backgroundSize: "40px 40px",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-10 w-10 border-2 border-white/50 border-t-slate-700 rounded-full"
          />
          <span
            className="text-slate-600 text-sm"
            style={{
              fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
            }}
          >
            Loading dashboard...
          </span>
        </div>
      </div>
    );
  }

  // Create academic stats from student data
  const academicStats = {
    currentGPA: currentStudent.academic_data.overall_gpa,
    overallAttendance: currentStudent.academic_data.attendance_percentage,
    totalCredits: currentStudent.academic_data.totalCredits,
    creditsThisSemester: currentStudent.academic_data.creditsThisSemester,
    academicYear: currentStudent.academic_data.academic_year,
    standing:
      currentStudent.academic_data.overall_gpa >= 3.5
        ? "Good Standing"
        : "Regular Standing",
  };

  // Map subjects to courses format for display
  const courses: Course[] = currentStudent.academic_data.subjects.map(
    (subject, index) => ({
      code: `SUBJ${(index + 1).toString().padStart(3, "0")}`,
      name: subject.name,
      credits: 3, // Default credits per subject
      grade: subject.grade,
      gradePoints:
        subject.marks >= 90
          ? 4.0
          : subject.marks >= 80
            ? 3.5
            : subject.marks >= 70
              ? 3.0
              : subject.marks >= 60
                ? 2.5
                : 2.0,
      attendance: subject.attendance,
      instructor: "Faculty", // Generic instructor
      schedule: "TBD",
      status: "active",
    }),
  );

  // Get dashboard-specific data
  const { upcomingDeadlines, achievements, semesterProgress } =
    currentDashboardData;

  const gradeDistribution = courses.reduce(
    (acc, course) => {
      acc[course.grade] = (acc[course.grade] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const gradeColors: Record<string, string> = {
    "A+": "#16a34a",
    A: "#22c55e",
    "A-": "#4ade80",
    "B+": "#fbbf24",
    B: "#fb923c",
    "B-": "#f97316",
    "C+": "#ef4444",
    C: "#dc2626",
    "C-": "#b91c1c",
  };

  const donutData = Object.entries(gradeDistribution).map(([label, value]) => ({
    label,
    value,
    color: gradeColors[label] || "#a855f7",
  }));

  const totalCredits = currentStudent.academic_data.creditsThisSemester;

  // Generate timetable data from subjects
  const timetableData = generateTimetableData(
    currentStudent.academic_data.subjects,
  );

  // Week navigation helpers
  const getWeekDates = (date: Date): Date[] => {
    const week: Date[] = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    startOfWeek.setDate(diff);

    for (let i = 0; i < 5; i++) {
      // Monday to Friday
      const weekDay = new Date(startOfWeek);
      weekDay.setDate(startOfWeek.getDate() + i);
      week.push(weekDay);
    }
    return week;
  };

  const weekDates = getWeekDates(selectedDate);
  const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

  const navigateWeek = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    setSelectedDate(newDate);
  };

  const goToToday = () => {
    setSelectedDate(new Date());
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const getMonthName = (): string => {
    const firstDay = weekDates[0];
    const lastDay = weekDates[4];

    if (firstDay.getMonth() === lastDay.getMonth()) {
      return firstDay.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    return `${firstDay.toLocaleDateString("en-US", { month: "short" })} - ${lastDay.toLocaleDateString("en-US", { month: "short", year: "numeric" })}`;
  };

  // Mini calendar helpers
  const getMonthDays = (date: Date): (Date | null)[] => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty slots for days before the first day of the month
    const startDay = firstDay.getDay() || 7; // Convert Sunday from 0 to 7
    for (let i = 1; i < startDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  };

  const miniCalendarMonth = new Date(selectedDate);
  const monthDays = getMonthDays(miniCalendarMonth);

  const scrollToSection = (id: string, navKey: NavKey) => {
    setActiveNav(navKey);
    const el = document.getElementById(id);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden  ${fontVariables}`}
      style={{
        background:
          "linear-gradient(165deg, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 60%, #e2e8f0 100%)",
      }}
    >
      {/* Grid - glassmorphism base */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>

      {/* Orbs - glassmorphism glow */}
      <div
        className="orb-1 fixed top-1/4 -left-32 w-[560px] h-[560px] rounded-full blur-[140px] pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(148,163,184,0.25) 40%, transparent 70%)",
        }}
      />
      <div
        className="orb-2 fixed bottom-1/4 -right-32 w-[480px] h-[480px] rounded-full blur-[120px] pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(148,163,184,0.2) 50%, transparent 70%)",
        }}
      />
      <div
        className="orb-3 fixed top-1/2 left-1/2 w-[720px] h-[720px] rounded-full blur-[160px] pointer-events-none opacity-50 -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(226,232,240,0.3) 50%, transparent 65%)",
        }}
      />

      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full bottom-0"
            initial={{ x: particle.x, y: particle.y }}
            animate={{ y: "-100vh", opacity: [0, 0.5, 0] }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear",
            }}
            style={{ left: particle.left }}
          />
        ))}
      </div>

      {/* Header - glass */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50"
      >
        <div
          className="absolute inset-0"
          style={{
            background: "rgba(255, 255, 255, 0.35)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.5)",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.05), inset 0 1px 0 rgba(255,255,255,0.6)",
          }}
        />
        <div
          className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-4">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/")}
                className="p-2.5 rounded-xl border transition-all"
                style={{
                  background: "rgba(255, 255, 255, 0.35)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                }}
                aria-label="Back to home"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </motion.button>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl blur opacity-30" />
                  <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black shadow-lg">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1
                    className="text-2xl font-bold text-gray-900 tracking-tight"
                    style={{
                      fontFamily:
                        "var(--font-montserrat), system-ui, sans-serif",
                    }}
                  >
                    Dashboard
                  </h1>
                </div>
              </div>

              <nav
                className="hidden lg:flex items-center ml-4"
                aria-label="Main"
              >
                <div
                  className="flex items-center gap-1 p-1 rounded-xl"
                  style={{
                    fontFamily: "var(--font-montserrat), system-ui, sans-serif",
                    background: "rgba(255, 255, 255, 0.35)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.5)",
                  }}
                >
                  {[
                    {
                      label: "Main",
                      icon: LayoutDashboard,
                      id: "section-hero" as const,
                      key: "dashboard" as const,
                    },
                    {
                      label: "Courses",
                      icon: BookOpen,
                      id: "section-courses" as const,
                      key: "courses" as const,
                    },
                    {
                      label: "Schedule",
                      icon: Calendar,
                      id: "section-schedule" as const,
                      key: "schedule" as const,
                    },
                    {
                      label: "Grades",
                      icon: BarChart3,
                      id: "section-grades" as const,
                      key: "grades" as const,
                    },
                  ].map((item) => (
                    <motion.button
                      key={item.key}
                      type="button"
                      onClick={() => scrollToSection(item.id, item.key)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                        activeNav === item.key
                          ? "text-gray-900 shadow-sm"
                          : "text-gray-600 hover:text-gray-900",
                        activeNav === item.key && "bg-white/60",
                      )}
                    >
                      <item.icon
                        className={cn(
                          "h-4 w-4",
                          activeNav === item.key && "text-gray-900",
                        )}
                      />
                      {item.label}
                    </motion.button>
                  ))}
                </div>
              </nav>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                type="button"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/assistant")}
                className="p-2.5 rounded-xl border transition-all group"
                style={{
                  background: "rgba(255, 255, 255, 0.35)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                }}
                aria-label="Open course assistant"
              >
                <Sparkles className="h-4 w-4 text-gray-700 group-hover:text-gray-900 transition-colors" />
              </motion.button>

              <div className="relative">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    setShowUserMenu(false);
                    setShowNotifications((prev) => !prev);
                  }}
                  className="relative p-2.5 rounded-xl border transition-all"
                  style={{
                    background: "rgba(255, 255, 255, 0.35)",
                    backdropFilter: "blur(12px)",
                    border: "1px solid rgba(255, 255, 255, 0.5)",
                  }}
                  aria-label="Notifications"
                  aria-expanded={showNotifications}
                >
                  <Bell className="h-4 w-4 text-gray-600" />
                  <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-gray-700 rounded-full animate-pulse" />
                </motion.button>
                <AnimatePresence>
                  {showNotifications && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowNotifications(false)}
                        aria-hidden
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{
                          duration: 0.2,
                          ease: [0.16, 1, 0.3, 1],
                        }}
                        className="absolute right-0 mt-2 w-80 rounded-2xl overflow-hidden z-50 p-4"
                        style={{
                          background: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(24px)",
                          border: "1px solid rgba(255, 255, 255, 0.6)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                        }}
                        role="menu"
                        aria-label="Notifications"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-sm font-semibold text-gray-900">
                            Notifications
                          </span>
                        </div>
                        {upcomingDeadlines.length === 0 ? (
                          <div className="text-sm text-gray-500 py-4 text-center">
                            No new notifications
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {upcomingDeadlines.slice(0, 3).map((d) => (
                              <div
                                key={d.id}
                                className="py-2 px-3 rounded-lg bg-gray-50 border border-gray-100 text-left"
                              >
                                <p className="text-xs font-medium text-gray-900 truncate">
                                  {d.title}
                                </p>
                                <p className="text-[11px] text-gray-500">
                                  {d.course} ·{" "}
                                  {new Date(d.dueDate).toLocaleDateString(
                                    "en-US",
                                    { month: "short", day: "numeric" },
                                  )}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>

              <div className="hidden sm:block w-[1px] h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-1" />

              <div className="relative">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowNotifications(false);
                    setShowUserMenu((prev) => !prev);
                  }}
                  className={cn(
                    "flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-all",
                    "bg-gray-50 border border-gray-200/60",
                    "hover:bg-gray-100 hover:border-gray-300",
                    showUserMenu && "bg-gray-100 border-gray-300",
                  )}
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-sm">
                    {studentInfo.name.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {studentInfo.name.split(" ")[0]}
                    </p>
                    <p className="text-xs text-gray-500">Student</p>
                  </div>
                  <ChevronDown
                    className={cn(
                      "hidden sm:block h-4 w-4 text-gray-400 transition-transform duration-300",
                      showUserMenu && "rotate-180",
                    )}
                  />
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />

                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden z-50"
                        style={{
                          background: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(24px)",
                          border: "1px solid rgba(255, 255, 255, 0.6)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                        }}
                      >
                        <div
                          className="p-4"
                          style={{ background: "rgba(248, 250, 252, 0.6)" }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-gray-500/30">
                              {studentInfo.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-base font-bold text-gray-900 truncate"
                                style={{
                                  fontFamily:
                                    "var(--font-syne), system-ui, sans-serif",
                                }}
                              >
                                {studentInfo.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {studentInfo.email}
                              </p>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Now
                            </span>
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-gray-100 border border-gray-300 text-xs font-medium text-gray-700">
                              <Zap className="h-3 w-3" />
                              Pro
                            </span>
                          </div>
                        </div>

                        <div className="p-2">
                          {[
                            {
                              icon: User,
                              label: "My Profile",
                              description: "View and edit profile",
                              action: () => setShowUserMenu(false),
                            },
                            {
                              icon: Settings,
                              label: "Settings",
                              description: "Preferences & privacy",
                              action: () => setShowUserMenu(false),
                            },
                            {
                              icon: HelpCircle,
                              label: "Help Center",
                              description: "Get support",
                              action: () => {
                                setShowUserMenu(false);
                                router.push("/assistant");
                              },
                            },
                          ].map((item, index) => (
                            <motion.button
                              key={item.label}
                              type="button"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.05 }}
                              whileHover={{ x: 4 }}
                              onClick={item.action}
                              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-gray-50 transition-all group"
                            >
                              <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-gray-200 transition-colors">
                                <item.icon className="h-4 w-4 text-gray-500 group-hover:text-gray-900 transition-colors" />
                              </div>
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  {item.label}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {item.description}
                                </p>
                              </div>
                            </motion.button>
                          ))}
                        </div>

                        <div className="mx-3 h-[1px] bg-gradient-to-r from-transparent via-gray-200 to-transparent" />

                        <div className="p-2">
                          <motion.button
                            whileHover={{ x: 4 }}
                            onClick={() => {
                              sessionStorage.removeItem("authToken");
                              sessionStorage.removeItem("studentData");
                              router.push("/");
                            }}
                            className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-red-50 transition-all group"
                          >
                            <div className="p-2 rounded-lg bg-gray-100 group-hover:bg-red-100 transition-colors">
                              <LogOut className="h-4 w-4 text-gray-500 group-hover:text-red-600 transition-colors" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-700 group-hover:text-red-600 transition-colors">
                                Sign Out
                              </p>
                              <p className="text-xs text-gray-500">
                                End your session
                              </p>
                            </div>
                          </motion.button>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Hero Section */}
          <motion.div
            id="section-hero"
            variants={itemVariants}
            ref={heroRef}
            className="mb-8"
          >
            <motion.div
              className="relative overflow-hidden rounded-3xl"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              style={{
                background: "rgba(255, 255, 255, 0.35)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.5)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.6)",
              }}
            >
              <div
                className="absolute inset-x-0 top-0 h-px pointer-events-none opacity-80"
                style={{
                  background:
                    "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
                }}
              />
              <div
                className="absolute inset-0 pointer-events-none rounded-3xl opacity-50"
                style={{
                  background:
                    "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.6), transparent 70%)",
                }}
              />

              <div className="relative z-10 p-8 md:p-12">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="text-center lg:text-left">
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{
                        delay: 0.2,
                        type: "spring",
                        stiffness: 100,
                      }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-5 text-slate-600 text-sm border"
                      style={{
                        background: "rgba(255, 255, 255, 0.5)",
                        backdropFilter: "blur(12px)",
                        border: "1px solid rgba(255, 255, 255, 0.6)",
                      }}
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Flame className="h-4 w-4 text-amber-500" />
                      </motion.div>
                      <span
                        style={{
                          fontFamily:
                            "var(--font-manrope), system-ui, sans-serif",
                        }}
                      >
                        5 day streak!
                      </span>
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{
                        delay: 0.3,
                        duration: 0.6,
                        ease: [0.16, 1, 0.3, 1],
                      }}
                      className="text-3xl lg:text-5xl font-bold text-slate-800 mb-4"
                      style={{
                        fontFamily:
                          "var(--font-vonique), system-ui, sans-serif",
                      }}
                    >
                      <span className="inline-block">
                        Hello, {studentInfo.name.split(" ")[0]}!
                      </span>
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="text-slate-600 text-lg mb-8 max-w-md"
                      style={{
                        fontFamily:
                          "var(--font-vonique), system-ui, sans-serif",
                      }}
                    >
                      Ready to book your next courses?
                    </motion.p>

                    <motion.button
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.5, duration: 0.5 }}
                      whileHover={{ scale: 1.05, y: -3 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={() => router.push("/assistant")}
                      className="group relative inline-flex items-center gap-3 px-6 py-4 text-white font-bold rounded-2xl overflow-hidden"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                        background: "rgba(51, 65, 85, 0.85)",
                        backdropFilter: "blur(14px)",
                        border: "1px solid rgba(255, 255, 255, 0.25)",
                        boxShadow:
                          "0 8px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
                      }}
                    >
                      <motion.div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                      <Sparkles className="h-5 w-5 relative z-10" />
                      <span className="relative z-10">BOOK COURSES</span>
                      <ChevronRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                    </motion.button>
                  </div>

                  <div className="flex gap-5">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        delay: 0.5,
                        type: "spring",
                        stiffness: 100,
                        damping: 12,
                      }}
                      whileHover={{ y: -6, scale: 1.03 }}
                      className="relative rounded-2xl p-6 text-center min-w-[140px] overflow-hidden group"
                      style={{
                        background: "rgba(255, 255, 255, 0.4)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255, 255, 255, 0.55)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                      }}
                    >
                      <motion.div
                        className="text-4xl font-bold text-slate-800 mb-2 relative z-10"
                        style={{
                          fontFamily:
                            "var(--font-raleway), system-ui, sans-serif",
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.7,
                          type: "spring",
                          stiffness: 200,
                        }}
                      >
                        {academicStats.currentGPA}
                      </motion.div>
                      <div
                        className="text-slate-600 text-sm relative z-10"
                        style={{
                          fontFamily:
                            "var(--font-raleway), system-ui, sans-serif",
                        }}
                      >
                        Current GPA
                      </div>
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{
                        delay: 0.6,
                        type: "spring",
                        stiffness: 100,
                        damping: 12,
                      }}
                      whileHover={{ y: -6, scale: 1.03 }}
                      className="relative rounded-2xl p-6 text-center min-w-[140px] overflow-hidden group"
                      style={{
                        background: "rgba(255, 255, 255, 0.4)",
                        backdropFilter: "blur(16px)",
                        border: "1px solid rgba(255, 255, 255, 0.55)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                      }}
                    >
                      <motion.div
                        className="text-4xl font-bold text-slate-800 mb-2 relative z-10"
                        style={{
                          fontFamily:
                            "var(--font-raleway), system-ui, sans-serif",
                        }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{
                          delay: 0.8,
                          type: "spring",
                          stiffness: 200,
                        }}
                      >
                        {academicStats.overallAttendance}%
                      </motion.div>
                      <div
                        className="text-slate-600 text-sm relative z-10"
                        style={{
                          fontFamily:
                            "var(--font-raleway), system-ui, sans-serif",
                        }}
                      >
                        Attendance
                      </div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: Calendar,
                label: "Year of Study",
                value: `Year ${currentStudent.year_of_study}`,
                badge: academicStats.academicYear,
                color: "purple",
                delay: 0.1,
              },
              {
                icon: BookOpen,
                label: "Active Courses",
                value: courses.length.toString(),
                badge: `${currentStudent.branch}`,
                badgeColor: "text-emerald-600",
                color: "green",
                delay: 0.15,
              },
              {
                icon: Target,
                label: "Total Credits",
                value: academicStats.totalCredits.toString(),
                badge: `${totalCredits} this sem`,
                badgeColor: "text-gray-600",
                color: "blue",
                delay: 0.2,
              },
              {
                icon: Award,
                label: "Academic Standing",
                value: academicStats.standing,
                badge:
                  academicStats.currentGPA >= 3.5 ? "Dean's List" : "Regular",
                badgeColor: "text-amber-600",
                color: "amber",
                delay: 0.25,
              },
            ].map((stat) => (
              <motion.div key={stat.label} variants={itemVariants}>
                <AnimatedCard delay={stat.delay}>
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={cn(
                        "p-3 rounded-xl",
                        stat.color === "purple" && "bg-gray-100",
                        stat.color === "green" && "bg-emerald-100",
                        stat.color === "blue" && "bg-blue-100",
                        stat.color === "amber" && "bg-amber-100",
                      )}
                    >
                      <stat.icon
                        className={cn(
                          "h-5 w-5",
                          stat.color === "purple" && "text-gray-900",
                          stat.color === "green" && "text-emerald-600",
                          stat.color === "blue" && "text-blue-600",
                          stat.color === "amber" && "text-amber-600",
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        stat.badgeColor === "text-purple-600"
                          ? "text-gray-600"
                          : stat.badgeColor || "text-gray-500",
                      )}
                    >
                      {stat.badge.includes("+") && (
                        <TrendingUp className="h-3 w-3" />
                      )}
                      {stat.badge}
                    </span>
                  </div>
                  <div
                    className="text-2xl font-bold text-gray-900 mb-1"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    {stat.label}
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <GradientCard delay={0.2}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-gray-900"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Subject Attendance
                    </h3>
                    <p
                      className="text-sm text-gray-500"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Your attendance by subject
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-100">
                    <BarChart3 className="h-5 w-5 text-emerald-600" />
                  </div>
                </div>
                <div className="space-y-5">
                  {currentStudent.academic_data.subjects
                    .slice(0, 6)
                    .map((subject, index) => (
                      <motion.div
                        key={subject.name}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * index + 0.3 }}
                      >
                        <AnimatedProgressBar
                          value={subject.attendance}
                          label={subject.name}
                          color={
                            subject.attendance >= 90
                              ? "green"
                              : subject.attendance >= 80
                                ? "yellow"
                                : "red"
                          }
                        />
                      </motion.div>
                    ))}
                </div>
              </GradientCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GradientCard delay={0.3}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-gray-900"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Grade Distribution
                    </h3>
                    <p
                      className="text-sm text-gray-500"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      This semester
                    </p>
                  </div>
                </div>
                <div className="flex justify-center mb-6">
                  <AnimatedDonutChart
                    data={donutData}
                    size={180}
                    strokeWidth={24}
                  />
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {donutData.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-50"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-gray-600">
                        {item.label}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </GradientCard>
            </motion.div>
          </div>

          {/* Performance & Progress */}
          <div
            id="section-grades"
            className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8"
          >
            <motion.div variants={itemVariants}>
              <GradientCard delay={0.4}>
                <h3
                  className="text-lg font-semibold text-gray-900 mb-8"
                  style={{
                    fontFamily: "var(--font-raleway), system-ui, sans-serif",
                  }}
                >
                  Key Metrics
                </h3>
                <div className="flex justify-center gap-8">
                  <ProgressRing
                    percentage={academicStats.overallAttendance}
                    size={110}
                    strokeWidth={10}
                    color="green"
                    label="Attendance"
                    value={`${academicStats.overallAttendance}%`}
                  />
                  <ProgressRing
                    percentage={(academicStats.currentGPA / 4.0) * 100}
                    size={110}
                    strokeWidth={10}
                    color="purple"
                    label="GPA"
                    value={academicStats.currentGPA.toString()}
                  />
                </div>
              </GradientCard>
            </motion.div>

            <motion.div variants={itemVariants} className="lg:col-span-2">
              <GradientCard delay={0.5}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-gray-900"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      GPA Trend
                    </h3>
                    <p
                      className="text-sm text-gray-500"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Your progress over semesters
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-gray-100">
                    <Zap className="h-5 w-5 text-gray-900" />
                  </div>
                </div>
                <div className="relative">
                  {/* Y-axis labels */}
                  <div className="absolute left-0 top-0 bottom-8 flex flex-col justify-between text-[10px] text-gray-400 pr-2">
                    <span>4.0</span>
                    <span>3.0</span>
                    <span>2.0</span>
                    <span>1.0</span>
                    <span>0.0</span>
                  </div>

                  {/* Chart container */}
                  <div className="ml-8 flex items-end justify-between gap-3 h-48 px-2 pb-8 border-b border-gray-200">
                    {semesterProgress.map((sem, index) => {
                      const heightPercentage = (sem.gpa / 4.0) * 100;
                      const isLast = index === semesterProgress.length - 1;
                      const maxHeight = 192; // h-48 = 192px
                      const barHeight = (heightPercentage / 100) * maxHeight;

                      return (
                        <div
                          key={sem.semester}
                          className="flex-1 flex flex-col items-center gap-2 h-full"
                        >
                          <div className="flex-1 flex items-end w-full relative">
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: barHeight, opacity: 1 }}
                              transition={{
                                delay: 0.1 * index + 0.3,
                                duration: 0.8,
                                ease: "easeOut",
                              }}
                              className={cn(
                                "w-full rounded-t-xl relative overflow-hidden flex items-start justify-center pt-2",
                                "min-h-[40px]",
                                isLast
                                  ? "bg-gradient-to-t from-gray-800 via-gray-700 to-gray-600 shadow-lg shadow-gray-500/30"
                                  : "bg-gradient-to-t from-gray-300 via-gray-200 to-gray-100 hover:from-gray-400 hover:via-gray-300 hover:to-gray-200 transition-all",
                              )}
                              style={{
                                minHeight: `${Math.max(barHeight, 40)}px`,
                              }}
                            >
                              <span
                                className={cn(
                                  "text-xs font-bold whitespace-nowrap",
                                  isLast ? "text-white" : "text-gray-700",
                                )}
                                style={{
                                  fontFamily:
                                    "var(--font-raleway), system-ui, sans-serif",
                                }}
                              >
                                {sem.gpa}
                              </span>
                            </motion.div>
                          </div>
                          <span
                            className="text-[11px] text-gray-500 text-center whitespace-nowrap font-medium"
                            style={{
                              fontFamily:
                                "var(--font-raleway), system-ui, sans-serif",
                            }}
                          >
                            {sem.semester.split(" ")[0].slice(0, 2)}{" "}
                            {sem.semester.split(" ")[1]?.slice(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </GradientCard>
            </motion.div>
          </div>

          {/* Deadlines & Achievements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            <motion.div variants={itemVariants}>
              <GradientCard delay={0.6}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-gray-900"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Upcoming Deadlines
                    </h3>
                    <p
                      className="text-sm text-gray-500"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Next 2 weeks
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-100">
                    <Clock className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <div className="space-y-3">
                  {upcomingDeadlines.slice(0, 4).map((deadline, index) => (
                    <motion.div
                      key={deadline.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index + 0.4 }}
                      whileHover={{ x: 4 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl cursor-pointer",
                        "bg-gray-50 border border-gray-100",
                        "hover:bg-gray-100 hover:border-gray-300 transition-all",
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          deadline.priority === "high"
                            ? "bg-red-100"
                            : deadline.priority === "medium"
                              ? "bg-amber-100"
                              : "bg-emerald-100",
                        )}
                      >
                        {deadline.priority === "high" ? (
                          <AlertCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <CheckCircle2
                            className={cn(
                              "h-5 w-5",
                              deadline.priority === "medium"
                                ? "text-amber-600"
                                : "text-emerald-600",
                            )}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium text-gray-900 truncate"
                          style={{
                            fontFamily:
                              "var(--font-manrope), system-ui, sans-serif",
                          }}
                        >
                          {deadline.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {deadline.course}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 whitespace-nowrap px-2.5 py-1 rounded-lg bg-white border border-gray-200">
                        {new Date(deadline.dueDate).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </GradientCard>
            </motion.div>

            <motion.div variants={itemVariants}>
              <GradientCard delay={0.7}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-gray-900"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Achievements
                    </h3>
                    <p
                      className="text-sm text-gray-500"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Your accomplishments
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-100">
                    <Award className="h-5 w-5 text-amber-600" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index + 0.4 }}
                      whileHover={
                        achievement.unlocked
                          ? { scale: 1.03, y: -2 }
                          : undefined
                      }
                      className={cn(
                        "flex flex-col items-center p-4 rounded-xl text-center transition-all",
                        achievement.unlocked
                          ? "bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 cursor-pointer"
                          : "bg-gray-50 border border-gray-100 opacity-50",
                      )}
                    >
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center mb-3",
                          achievement.unlocked
                            ? "bg-gradient-to-br from-amber-200/50 to-orange-200/50"
                            : "bg-gray-100",
                        )}
                      >
                        <Award
                          className={cn(
                            "h-6 w-6",
                            achievement.unlocked
                              ? "text-amber-600"
                              : "text-gray-400",
                          )}
                        />
                      </div>
                      <p
                        className="text-sm font-semibold text-gray-900 mb-1"
                        style={{
                          fontFamily:
                            "var(--font-manrope), system-ui, sans-serif",
                        }}
                      >
                        {achievement.title}
                      </p>
                      <p className="text-xs text-gray-500 line-clamp-2">
                        {achievement.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </GradientCard>
            </motion.div>
          </div>

          {/* Weekly Timetable */}
          <motion.div
            id="section-schedule"
            variants={itemVariants}
            className="mb-8"
          >
            <GradientCard delay={0.75}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3
                    className="text-lg font-semibold text-gray-900"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    Weekly Schedule
                  </h3>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    {getMonthName()}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Today Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={goToToday}
                    className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 border border-gray-200 transition-all"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    Today
                  </motion.button>

                  {/* Week Navigation */}
                  <div className="flex items-center gap-1">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigateWeek("prev")}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all"
                    >
                      <ChevronLeft className="h-4 w-4 text-gray-700" />
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => navigateWeek("next")}
                      className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 border border-gray-200 transition-all"
                    >
                      <ChevronRight className="h-4 w-4 text-gray-700" />
                    </motion.button>
                  </div>

                  {/* Calendar Picker */}
                  <div className="relative">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setShowMiniCalendar(!showMiniCalendar)}
                      className={cn(
                        "p-2 rounded-xl border transition-all",
                        showMiniCalendar
                          ? "bg-gray-800 border-gray-800 text-white"
                          : "bg-gray-100 hover:bg-gray-200 border-gray-200 text-gray-700",
                      )}
                    >
                      <CalendarDays className="h-4 w-4" />
                    </motion.button>

                    <AnimatePresence>
                      {showMiniCalendar && (
                        <>
                          <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-40"
                            onClick={() => setShowMiniCalendar(false)}
                          />
                          <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{
                              duration: 0.2,
                              ease: [0.16, 1, 0.3, 1],
                            }}
                            className="absolute right-0 mt-2 w-72 rounded-2xl bg-white border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden z-50 p-4"
                          >
                            {/* Mini Calendar Header */}
                            <div className="flex items-center justify-between mb-4">
                              <button
                                onClick={() => {
                                  const newDate = new Date(miniCalendarMonth);
                                  newDate.setMonth(newDate.getMonth() - 1);
                                  setSelectedDate(newDate);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <ChevronLeft className="h-4 w-4 text-gray-600" />
                              </button>
                              <span
                                className="text-sm font-semibold text-gray-900"
                                style={{
                                  fontFamily:
                                    "var(--font-manrope), system-ui, sans-serif",
                                }}
                              >
                                {miniCalendarMonth.toLocaleDateString("en-US", {
                                  month: "long",
                                  year: "numeric",
                                })}
                              </span>
                              <button
                                onClick={() => {
                                  const newDate = new Date(miniCalendarMonth);
                                  newDate.setMonth(newDate.getMonth() + 1);
                                  setSelectedDate(newDate);
                                }}
                                className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
                              >
                                <ChevronRight className="h-4 w-4 text-gray-600" />
                              </button>
                            </div>

                            {/* Weekday Headers */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map(
                                (day) => (
                                  <div
                                    key={day}
                                    className="text-center text-xs font-medium text-gray-500 py-1"
                                  >
                                    {day}
                                  </div>
                                ),
                              )}
                            </div>

                            {/* Calendar Days */}
                            <div className="grid grid-cols-7 gap-1">
                              {monthDays.map((day, index) => (
                                <button
                                  key={index}
                                  onClick={() => {
                                    if (day) {
                                      setSelectedDate(day);
                                      setShowMiniCalendar(false);
                                    }
                                  }}
                                  disabled={!day}
                                  className={cn(
                                    "h-8 w-8 rounded-lg text-sm font-medium transition-all",
                                    !day && "invisible",
                                    day &&
                                      isToday(day) &&
                                      "bg-gray-800 text-white",
                                    day &&
                                      !isToday(day) &&
                                      "hover:bg-gray-100 text-gray-700",
                                    day &&
                                      weekDates.some(
                                        (d) =>
                                          d.toDateString() ===
                                          day.toDateString(),
                                      ) &&
                                      !isToday(day) &&
                                      "bg-gray-100",
                                  )}
                                >
                                  {day?.getDate()}
                                </button>
                              ))}
                            </div>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </div>

              {/* Timetable Grid */}
              <div className="overflow-x-auto -mx-6 px-6">
                <div className="min-w-[800px]">
                  {/* Header Row with Days */}
                  <div className="grid grid-cols-[70px_repeat(5,1fr)] border-b border-gray-100">
                    <div className="p-3 text-center">
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">
                        Time
                      </span>
                    </div>
                    {weekDates.map((date, index) => (
                      <div
                        key={dayNames[index]}
                        className={cn(
                          "p-3 text-center border-l border-gray-100",
                          isToday(date) && "bg-gray-50",
                        )}
                      >
                        <div
                          className={cn(
                            "text-xs font-medium uppercase tracking-wider mb-1",
                            isToday(date) ? "text-gray-900" : "text-gray-500",
                          )}
                          style={{
                            fontFamily:
                              "var(--font-manrope), system-ui, sans-serif",
                          }}
                        >
                          {dayNames[index].slice(0, 3)}
                        </div>
                        <div
                          className={cn(
                            "text-lg font-bold",
                            isToday(date)
                              ? "bg-gray-800 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                              : "text-gray-900",
                          )}
                          style={{
                            fontFamily:
                              "var(--font-raleway), system-ui, sans-serif",
                          }}
                        >
                          {date.getDate()}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Time Slots and Classes */}
                  <div className="relative">
                    {/* Time slot rows */}
                    {timeSlots.map((time) => (
                      <div
                        key={time}
                        className="grid grid-cols-[70px_repeat(5,1fr)] border-b border-gray-50"
                        style={{ height: "60px" }}
                      >
                        <div className="p-2 flex items-start justify-center">
                          <span
                            className="text-[11px] font-medium text-gray-400 -mt-2"
                            style={{
                              fontFamily:
                                "var(--font-manrope), system-ui, sans-serif",
                            }}
                          >
                            {formatTime(time)}
                          </span>
                        </div>
                        {dayNames.map((day, dayIndex) => (
                          <div
                            key={`${time}-${day}`}
                            className={cn(
                              "border-l border-gray-50 relative",
                              isToday(weekDates[dayIndex]) && "bg-gray-50/50",
                            )}
                          />
                        ))}
                      </div>
                    ))}

                    {/* Overlay classes on the grid */}
                    <div className="absolute inset-0 grid grid-cols-[70px_repeat(5,1fr)] pointer-events-none">
                      <div /> {/* Time column spacer */}
                      {dayNames.map((day) => (
                        <div
                          key={day}
                          className="relative border-l border-transparent"
                        >
                          {timetableData[day]?.map((classItem, classIndex) => {
                            const topPosition =
                              getTimePosition(classItem.startTime) * 60;
                            const height = getClassHeight(
                              classItem.startTime,
                              classItem.endTime,
                            );

                            return (
                              <motion.div
                                key={classItem.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: 0.05 * classIndex + 0.3 }}
                                className={cn(
                                  "absolute left-1 right-1 rounded-xl border-l-4 p-2 overflow-hidden cursor-pointer pointer-events-auto",
                                  "hover:shadow-md transition-shadow",
                                  classItem.color,
                                )}
                                style={{
                                  top: `${topPosition}px`,
                                  height: `${height - 4}px`,
                                }}
                                whileHover={{ scale: 1.02 }}
                              >
                                <p
                                  className="text-xs font-bold truncate"
                                  style={{
                                    fontFamily:
                                      "var(--font-manrope), system-ui, sans-serif",
                                  }}
                                >
                                  {classItem.courseName}
                                </p>
                                <p className="text-[10px] opacity-80 truncate mt-0.5">
                                  {classItem.courseCode}
                                </p>
                                {height > 50 && (
                                  <>
                                    <div className="flex items-center gap-1 mt-1">
                                      <MapPin className="h-3 w-3 opacity-70" />
                                      <span className="text-[10px] opacity-80">
                                        {classItem.room}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Users className="h-3 w-3 opacity-70" />
                                      <span className="text-[10px] opacity-80 truncate">
                                        {classItem.instructor}
                                      </span>
                                    </div>
                                  </>
                                )}
                                <div className="absolute bottom-1 right-2 text-[9px] opacity-60">
                                  {formatTime(classItem.startTime)} -{" "}
                                  {formatTime(classItem.endTime)}
                                </div>
                              </motion.div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="mt-6 pt-4 border-t border-gray-100">
                <div className="flex flex-wrap items-center gap-3">
                  <span
                    className="text-xs font-medium text-gray-500"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    Classes today:
                  </span>
                  {(() => {
                    const today = new Date();
                    const todayName = dayNames[today.getDay() - 1];
                    const todayClasses = timetableData[todayName] || [];

                    if (todayClasses.length === 0) {
                      return (
                        <span className="text-xs text-gray-400">
                          No classes scheduled
                        </span>
                      );
                    }

                    return todayClasses.slice(0, 4).map((classItem) => (
                      <div
                        key={classItem.id}
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-lg border",
                          classItem.color,
                        )}
                      >
                        <Clock className="h-3 w-3" />
                        <span className="text-xs font-medium">
                          {classItem.courseName}
                        </span>
                        <span className="text-[10px] opacity-70">
                          {formatTime(classItem.startTime)}
                        </span>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </GradientCard>
          </motion.div>

          {/* Courses Table */}
          <motion.div id="section-courses" variants={itemVariants}>
            <GradientCard delay={0.8}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3
                    className="text-lg font-semibold text-gray-900"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    My Subjects
                  </h3>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    Current semester performance
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push("/assistant")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 border border-gray-300 transition-all"
                  style={{
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                  }}
                >
                  <BookOpen className="h-4 w-4" />
                  Book More
                </motion.button>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {[
                        "Subject",
                        "Marks",
                        "Grade",
                        "Attendance",
                        "Remarks",
                      ].map((header) => (
                        <th
                          key={header}
                          className="text-left py-4 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider"
                          style={{
                            fontFamily:
                              "var(--font-manrope), system-ui, sans-serif",
                          }}
                        >
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {currentStudent.academic_data.subjects.map(
                      (subject, index) => (
                        <motion.tr
                          key={subject.name}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.05 * index + 0.5 }}
                          className="border-b border-gray-50 hover:bg-gray-100/50 transition-colors group"
                        >
                          <td className="py-4 px-4">
                            <p
                              className="font-semibold text-gray-900 group-hover:text-gray-700 transition-colors"
                              style={{
                                fontFamily:
                                  "var(--font-manrope), system-ui, sans-serif",
                              }}
                            >
                              {subject.name}
                            </p>
                          </td>
                          <td className="py-4 px-4 text-sm text-gray-700 font-medium">
                            {subject.marks}/100
                          </td>
                          <td className="py-4 px-4">
                            <span
                              className={cn(
                                "inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold",
                                subject.grade.startsWith("A")
                                  ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                                  : subject.grade.startsWith("B")
                                    ? "bg-amber-100 text-amber-700 border border-amber-200"
                                    : "bg-red-100 text-red-700 border border-red-200",
                              )}
                            >
                              {subject.grade}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${subject.attendance}%` }}
                                  transition={{ delay: 0.6, duration: 0.8 }}
                                  className={cn(
                                    "h-full rounded-full",
                                    subject.attendance >= 90
                                      ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                      : subject.attendance >= 80
                                        ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                        : "bg-gradient-to-r from-red-500 to-rose-400",
                                  )}
                                />
                              </div>
                              <span className="text-sm text-gray-700 font-medium">
                                {subject.attendance}%
                              </span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <p
                              className="text-xs text-gray-500 max-w-[200px] truncate"
                              title={subject.teacher_remarks}
                            >
                              {subject.teacher_remarks}
                            </p>
                          </td>
                        </motion.tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            </GradientCard>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
