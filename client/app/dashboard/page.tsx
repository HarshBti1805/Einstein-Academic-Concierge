"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fontVariables } from "@/lib/fonts";
import { Search, LayoutDashboard, HelpCircle } from "lucide-react";

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
} from "lucide-react";
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
            stroke="rgba(255,255,255,0.05)"
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
            className="text-2xl font-bold text-white"
            style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
          >
            {value}
          </span>
        </div>
      </div>
      <span className="text-sm text-zinc-400">{label}</span>
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
        "relative group rounded-2xl bg-[#0d0d14]/80 backdrop-blur-xl border border-white/[0.06] p-6",
        "before:absolute before:inset-0 before:rounded-2xl before:bg-gradient-to-br before:from-purple-500/5 before:to-transparent before:opacity-0 before:transition-opacity before:duration-300",
        "hover:before:opacity-100 hover:border-purple-500/20",
        "transition-all duration-300",
        className
      )}
    >
      {/* Subtle glow effect */}
      <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-600/10 via-violet-600/10 to-indigo-600/10 rounded-2xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-500" />
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
        "relative group rounded-2xl overflow-hidden",
        className
      )}
    >
      {/* Background with gradient border effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-transparent to-indigo-500/10 opacity-50" />
      <div className="absolute inset-[1px] bg-[#0d0d14]/95 backdrop-blur-xl rounded-2xl" />
      
      {/* Animated border shine */}
      <div 
        className="absolute inset-0 rounded-2xl opacity-30"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 4s linear infinite',
        }}
      />
      
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
        <span className="text-sm text-zinc-300 truncate pr-4">{label}</span>
        <span className="text-sm font-semibold text-white">{value}%</span>
      </div>
      <div className="h-2 bg-zinc-800/50 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
          className={cn(
            "h-full rounded-full bg-gradient-to-r shadow-lg",
            colorMap[color],
            glowMap[color]
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

  // Calculate offsets without reassignment
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
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="rgba(255,255,255,0.03)"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Data segments */}
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
          className="text-3xl font-bold text-white"
          style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
        >
          {total}
        </span>
        <span className="text-xs text-zinc-500">Courses</span>
      </div>
    </div>
  );
};

export default function Dashboard() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [studentInfo, setStudentInfo] = useState<StudentInfo | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);

  // Generate particle data only on client-side after mount to avoid hydration mismatch
  const [particles, setParticles] = useState<Array<{
    x: number;
    y: number;
    duration: number;
    delay: number;
    left: string;
  }>>([]);

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

  // Generate particles only on client-side after mount to avoid hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setParticles(
        Array.from({ length: 20 }, () => ({
          x: Math.random() * window.innerWidth,
          y: window.innerHeight + 10,
          duration: 12 + Math.random() * 8,
          delay: Math.random() * 12,
          left: `${Math.random() * 100}%`,
        }))
      );
    }
  }, []);

  useEffect(() => {
    if (mounted) {
      // Animate floating orbs
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

  if (!mounted || !studentInfo) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-10 w-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full"
          />
          <span className="text-zinc-500 text-sm">Loading dashboard...</span>
        </div>
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
    color: gradeColors[label] || "#a855f7",
  }));

  const totalCredits = courses.reduce((sum, course) => sum + course.credits, 0);

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
    <div className={`min-h-screen bg-[#0a0a0f] relative overflow-x-hidden ${fontVariables}`}>
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        
        {/* Gradient orbs */}
        <div className="orb-1 absolute top-0 right-0 w-[600px] h-[600px] bg-violet-600/15 rounded-full blur-[150px]" />
        <div className="orb-2 absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/15 rounded-full blur-[120px]" />
        <div className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-indigo-600/10 rounded-full blur-[180px]" />
      </div>

      {/* Floating particles */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/20 rounded-full"
            initial={{
              x: particle.x,
              y: particle.y,
            }}
            animate={{
              y: -10,
              opacity: [0, 0.4, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear",
            }}
            style={{
              left: particle.left,
            }}
          />
        ))}
      </div>

{/* Header - Modern Refined Design */}
<motion.header
  initial={{ opacity: 0, y: -20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
  className="sticky top-0 z-50"
>
  {/* Glassmorphism background with gradient border */}
  <div className="absolute inset-0 bg-[#0a0a0f]/70 backdrop-blur-2xl" />
  <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-purple-500/20 to-transparent" />
  
  {/* Subtle animated gradient accent */}
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div className="absolute -top-20 left-1/4 w-60 h-20 bg-purple-500/10 rounded-full blur-3xl" />
    <div className="absolute -top-20 right-1/3 w-40 h-20 bg-violet-500/10 rounded-full blur-3xl" />
  </div>

  <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div className="flex items-center justify-between h-18 py-3">
      
      {/* Left Section - Logo & Navigation */}
      <div className="flex items-center gap-8">
        {/* Logo */}
        <motion.div 
          className="flex items-center gap-3 cursor-pointer group"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl blur opacity-40 group-hover:opacity-70 transition-opacity" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 shadow-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
          </div>
          <div className="hidden sm:block">
            <h1
              className="text-base font-bold text-white tracking-tight"
              style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
            >
              Dashboard
            </h1>
            <div className="flex items-center gap-1.5">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <p className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">Online</p>
            </div>
          </div>
        </motion.div>

        {/* Navigation Pills - Hidden on mobile */}
        <nav className="hidden lg:flex items-center">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/[0.02] border border-white/[0.04]">
            {[
              { label: "Dashboard", icon: LayoutDashboard, active: true },
              { label: "Courses", icon: BookOpen, active: false },
              { label: "Schedule", icon: Calendar, active: false },
              { label: "Grades", icon: BarChart3, active: false },
            ].map((item) => (
              <motion.button
                key={item.label}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
                  item.active
                    ? "bg-gradient-to-r from-purple-500/20 to-violet-500/20 text-white border border-purple-500/20 shadow-lg shadow-purple-500/10"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.04]"
                )}
              >
                <item.icon className={cn("h-4 w-4", item.active && "text-purple-400")} />
                {item.label}
              </motion.button>
            ))}
          </div>
        </nav>
      </div>

      {/* Right Section - Actions & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">

        {/* Quick Actions */}
        <div className="flex items-center gap-1">
          {/* AI Assistant Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push("/assistant")}
            className="relative p-2.5 rounded-xl bg-gradient-to-br from-purple-500/10 to-violet-500/10 border border-purple-500/20 hover:border-purple-500/40 transition-all group"
          >
            <Sparkles className="h-4 w-4 text-purple-400 group-hover:text-purple-300 transition-colors" />
            {/* Animated glow */}
            <div className="absolute inset-0 rounded-xl bg-purple-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
          </motion.button>

          {/* Notifications */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="relative p-2.5 rounded-xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.05] hover:border-purple-500/20 transition-all group"
          >
            <Bell className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" />
            {/* Notification badge */}
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-40"></span>
              <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-violet-600 text-[9px] font-bold text-white shadow-lg shadow-purple-500/30">
                3
              </span>
            </span>
          </motion.button>
        </div>

        {/* Divider */}
        <div className="hidden sm:block w-[1px] h-8 bg-gradient-to-b from-transparent via-white/10 to-transparent mx-1" />

        {/* User Profile */}
        <div className="relative">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowUserMenu(!showUserMenu)}
            className={cn(
              "flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-all",
              "bg-white/[0.02] border border-white/[0.06]",
              "hover:bg-white/[0.05] hover:border-purple-500/20",
              showUserMenu && "bg-white/[0.05] border-purple-500/20"
            )}
          >
            {/* Avatar with status */}
            <div className="relative">
              <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-purple-500/20">
                {studentInfo.name.charAt(0)}
              </div>
              {/* Online status */}
              <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#0a0a0f] flex items-center justify-center">
                <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
              </div>
            </div>
            
            {/* User info */}
            <div className="hidden sm:block text-left">
              <p 
                className="text-sm font-semibold text-white leading-tight"
                style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
              >
                {studentInfo.name.split(' ')[0]}
              </p>
              <p className="text-[10px] text-purple-400/80 font-medium">Student</p>
            </div>
            
            {/* Chevron */}
            <ChevronDown className={cn(
              "hidden sm:block h-4 w-4 text-zinc-500 transition-transform duration-300",
              showUserMenu && "rotate-180"
            )} />
          </motion.button>

          {/* Dropdown Menu */}
          <AnimatePresence>
            {showUserMenu && (
              <>
                {/* Backdrop */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-40"
                  onClick={() => setShowUserMenu(false)}
                />
                
                {/* Menu */}
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0d0d14]/95 backdrop-blur-2xl border border-white/[0.08] shadow-2xl shadow-black/50 overflow-hidden z-50"
                >
                  {/* User info header */}
                  <div className="p-4 bg-gradient-to-br from-purple-500/10 to-transparent">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-purple-500/30">
                        {studentInfo.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p 
                          className="text-base font-bold text-white truncate"
                          style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                        >
                          {studentInfo.name}
                        </p>
                        <p className="text-xs text-zinc-500 truncate">{studentInfo.email}</p>
                      </div>
                    </div>
                    {/* Status badge */}
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Active Now
                      </span>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 border border-purple-500/20 text-xs font-medium text-purple-400">
                        <Zap className="h-3 w-3" />
                        Pro
                      </span>
                    </div>
                  </div>

                  {/* Menu items */}
                  <div className="p-2">
                    {[
                      { icon: User, label: "My Profile", description: "View and edit profile", action: () => {} },
                      { icon: Settings, label: "Settings", description: "Preferences & privacy", action: () => {} },
                      { icon: HelpCircle, label: "Help Center", description: "Get support", action: () => {} },
                    ].map((item, index) => (
                      <motion.button
                        key={item.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        whileHover={{ x: 4 }}
                        onClick={item.action}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-white/[0.04] transition-all group"
                      >
                        <div className="p-2 rounded-lg bg-white/[0.03] group-hover:bg-purple-500/10 transition-colors">
                          <item.icon className="h-4 w-4 text-zinc-500 group-hover:text-purple-400 transition-colors" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{item.label}</p>
                          <p className="text-xs text-zinc-500">{item.description}</p>
                        </div>
                      </motion.button>
                    ))}
                  </div>

                  {/* Divider */}
                  <div className="mx-3 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent" />

                  {/* Sign out */}
                  <div className="p-2">
                    <motion.button
                      whileHover={{ x: 4 }}
                      onClick={() => router.push("/")}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left hover:bg-red-500/10 transition-all group"
                    >
                      <div className="p-2 rounded-lg bg-white/[0.03] group-hover:bg-red-500/10 transition-colors">
                        <LogOut className="h-4 w-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-300 group-hover:text-red-400 transition-colors">Sign Out</p>
                        <p className="text-xs text-zinc-500">End your session</p>
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
          <motion.div variants={itemVariants} ref={heroRef} className="mb-8">
            <motion.div 
              className="relative overflow-hidden rounded-3xl"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* Darker gradient background */}
              <div className="absolute inset-0 bg-gradient-to-br from-violet-950 via-purple-900 to-indigo-950" />
              
              {/* Overlay for extra depth */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              
              {/* Animated decorative elements */}
              <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                  className="absolute top-0 right-0 w-[600px] h-[600px] bg-purple-500/15 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/3"
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.15, 0.25, 0.15],
                  }}
                  transition={{ 
                    duration: 8,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                />
                <motion.div 
                  className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-indigo-500/20 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/3"
                  animate={{ 
                    scale: [1, 1.15, 1],
                    opacity: [0.2, 0.3, 0.2],
                  }}
                  transition={{ 
                    duration: 6,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 1
                  }}
                />
                <motion.div 
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-[120px]"
                  animate={{ 
                    scale: [1, 1.1, 1],
                    rotate: [0, 180, 360],
                  }}
                  transition={{ 
                    duration: 20,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                
                {/* Grid pattern with fade */}
                <div
                  className="absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage: `
                      linear-gradient(rgba(255, 255, 255, 0.3) 1px, transparent 1px),
                      linear-gradient(90deg, rgba(255, 255, 255, 0.3) 1px, transparent 1px)
                    `,
                    backgroundSize: "50px 50px",
                    maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
                    WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
                  }}
                />
                
                {/* Animated shine effect */}
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
                  initial={{ x: "-100%" }}
                  animate={{ x: "200%" }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    repeatDelay: 5,
                    ease: "easeInOut"
                  }}
                />
              </div>

              {/* Content */}
              <div className="relative z-10 p-8 md:p-12">
                <div className="flex flex-col lg:flex-row items-center justify-between gap-10">
                  <div className="text-center lg:text-left">
                    <motion.div
                      initial={{ opacity: 0, y: 20, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ delay: 0.2, type: "spring", stiffness: 100 }}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-white/90 text-sm mb-5"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                      >
                        <Flame className="h-4 w-4 text-amber-400" />
                      </motion.div>
                      <span style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
                        5 day streak!
                      </span>
                    </motion.div>
                    
                    <motion.h2
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                      className="text-3xl lg:text-5xl font-bold text-white mb-4"
                      style={{ fontFamily: "var(--font-arvo), system-ui, sans-serif" }}
                    >
                      <span className="inline-block">Hello, {studentInfo.name.split(" ")[0]}!</span>
                      <motion.span
                        className="inline-block ml-3"
                        animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                        transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 3 }}
                      >
                        👋
                      </motion.span>
                    </motion.h2>
                    
                    <motion.p
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4, duration: 0.5 }}
                      className="text-white/70 text-lg mb-8 max-w-md"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
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
                      className="group relative inline-flex items-center gap-3 px-8 py-4 bg-white text-purple-700 font-bold rounded-2xl shadow-2xl shadow-purple-900/50 hover:shadow-purple-800/60 transition-all duration-300 overflow-hidden"
                      style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
                    >
                      {/* Button shine effect */}
                      <motion.div
                        className="absolute inset-0 bg-gradient-to-r from-transparent via-purple-200/50 to-transparent -skew-x-12"
                        initial={{ x: "-100%" }}
                        whileHover={{ x: "100%" }}
                        transition={{ duration: 0.6 }}
                      />
                      <Sparkles className="h-5 w-5 relative z-10" />
                      <span className="relative z-10">BOOK COURSES</span>
                      <ChevronRight className="h-5 w-5 relative z-10 group-hover:translate-x-1 transition-transform duration-300" />
                    </motion.button>
                  </div>

                  {/* Stats Cards */}
                  <div className="flex gap-5">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.5, type: "spring", stiffness: 100, damping: 12 }}
                      whileHover={{ y: -6, scale: 1.03 }}
                      className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center min-w-[140px] border border-white/15 overflow-hidden group"
                    >
                      {/* Card glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <motion.div
                        className="text-4xl font-bold text-white mb-2 relative z-10"
                        style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.7, type: "spring", stiffness: 200 }}
                      >
                        {academicStats.currentGPA}
                      </motion.div>
                      <div 
                        className="text-white/60 text-sm relative z-10"
                        style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                      >
                        Current GPA
                      </div>
                      {/* Decorative ring */}
                      <div className="absolute -bottom-4 -right-4 w-20 h-20 border border-white/10 rounded-full" />
                    </motion.div>
                    
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8, y: 30 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      transition={{ delay: 0.6, type: "spring", stiffness: 100, damping: 12 }}
                      whileHover={{ y: -6, scale: 1.03 }}
                      className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 text-center min-w-[140px] border border-white/15 overflow-hidden group"
                    >
                      {/* Card glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <motion.div
                        className="text-4xl font-bold text-white mb-2 relative z-10"
                        style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ delay: 0.8, type: "spring", stiffness: 200 }}
                      >
                        {academicStats.overallAttendance}%
                      </motion.div>
                      <div 
                        className="text-white/60 text-sm relative z-10"
                        style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                      >
                        Attendance
                      </div>
                      {/* Decorative ring */}
                      <div className="absolute -bottom-4 -right-4 w-20 h-20 border border-white/10 rounded-full" />
                    </motion.div>
                  </div>
                </div>
              </div>
              
              {/* Bottom gradient fade */}
              <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-[#0a0a0f]/50 to-transparent pointer-events-none" />
            </motion.div>
          </motion.div>



          {/* Quick Stats */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              {
                icon: Calendar,
                label: "Current Semester",
                value: "Semester 5",
                badge: academicStats.academicYear,
                color: "purple",
                delay: 0.1,
              },
              {
                icon: BookOpen,
                label: "Active Courses",
                value: courses.length.toString(),
                badge: "+2 this sem",
                badgeColor: "text-emerald-400",
                color: "green",
                delay: 0.15,
              },
              {
                icon: Target,
                label: "Total Credits",
                value: totalCredits.toString(),
                badge: "On Track",
                badgeColor: "text-purple-400",
                color: "blue",
                delay: 0.2,
              },
              {
                icon: Award,
                label: "Academic Standing",
                value: academicStats.standing,
                badge: "Dean's List",
                badgeColor: "text-amber-400",
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
                        stat.color === "purple" && "bg-purple-500/10",
                        stat.color === "green" && "bg-emerald-500/10",
                        stat.color === "blue" && "bg-blue-500/10",
                        stat.color === "amber" && "bg-amber-500/10"
                      )}
                    >
                      <stat.icon
                        className={cn(
                          "h-5 w-5",
                          stat.color === "purple" && "text-purple-400",
                          stat.color === "green" && "text-emerald-400",
                          stat.color === "blue" && "text-blue-400",
                          stat.color === "amber" && "text-amber-400"
                        )}
                      />
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium flex items-center gap-1",
                        stat.badgeColor || "text-zinc-500"
                      )}
                    >
                      {stat.badge.includes("+") && <TrendingUp className="h-3 w-3" />}
                      {stat.badge}
                    </span>
                  </div>
                  <div
                    className="text-2xl font-bold text-white mb-1"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    {stat.value}
                  </div>
                  <div
                    className="text-sm text-zinc-500"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    {stat.label}
                  </div>
                </AnimatedCard>
              </motion.div>
            ))}
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Attendance Analytics */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <GradientCard delay={0.2}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Course Attendance
                    </h3>
                    <p
                      className="text-sm text-zinc-500"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Your attendance by course
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-emerald-500/10">
                    <BarChart3 className="h-5 w-5 text-emerald-400" />
                  </div>
                </div>
                <div className="space-y-5">
                  {courses.map((course, index) => (
                    <motion.div
                      key={course.code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index + 0.3 }}
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
            </motion.div>

            {/* Grade Distribution */}
            <motion.div variants={itemVariants}>
              <GradientCard delay={0.3}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Grade Distribution
                    </h3>
                    <p
                      className="text-sm text-zinc-500"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      This semester
                    </p>
                  </div>
                </div>
                <div className="flex justify-center mb-6">
                  <AnimatedDonutChart data={donutData} size={180} strokeWidth={24} />
                </div>
                <div className="flex flex-wrap justify-center gap-3">
                  {donutData.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/[0.03]"
                    >
                      <div
                        className="h-2.5 w-2.5 rounded-full"
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-xs text-zinc-400">
                        {item.label}: {item.value}
                      </span>
                    </div>
                  ))}
                </div>
              </GradientCard>
            </motion.div>
          </div>

          {/* Performance & Progress */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            {/* Key Metrics */}
            <motion.div variants={itemVariants}>
              <GradientCard delay={0.4}>
                <h3
                  className="text-lg font-semibold text-white mb-8"
                  style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
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

            {/* GPA Trend */}
            <motion.div variants={itemVariants} className="lg:col-span-2">
              <GradientCard delay={0.5}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      GPA Trend
                    </h3>
                    <p
                      className="text-sm text-zinc-500"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Your progress over semesters
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-purple-500/10">
                    <Zap className="h-5 w-5 text-purple-400" />
                  </div>
                </div>
                <div className="flex items-end justify-between gap-3 h-44 px-2">
                  {semesterProgress.map((sem, index) => {
                    const height = (sem.gpa / 4.0) * 100;
                    const isLast = index === semesterProgress.length - 1;
                    
                    return (
                      <div
                        key={sem.semester}
                        className="flex-1 flex flex-col items-center gap-3"
                      >
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: 0.1 * index + 0.3, duration: 0.8, ease: "easeOut" }}
                          className={cn(
                            "w-full rounded-xl relative overflow-hidden min-h-[24px]",
                            isLast
                              ? "bg-gradient-to-t from-purple-600 to-violet-400 shadow-lg shadow-purple-500/30"
                              : "bg-gradient-to-t from-zinc-700 to-zinc-600"
                          )}
                        >
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span
                              className="text-xs font-bold text-white"
                              style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                            >
                              {sem.gpa}
                            </span>
                          </div>
                          {isLast && (
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-shimmer" />
                          )}
                        </motion.div>
                        <span className="text-[11px] text-zinc-500 text-center whitespace-nowrap">
                          {sem.semester.split(" ")[0].slice(0, 2)}{" "}
                          {sem.semester.split(" ")[1]?.slice(2)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </GradientCard>
            </motion.div>
          </div>

          {/* Deadlines & Achievements */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
            {/* Upcoming Deadlines */}
            <motion.div variants={itemVariants}>
              <GradientCard delay={0.6}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Upcoming Deadlines
                    </h3>
                    <p
                      className="text-sm text-zinc-500"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Next 2 weeks
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-red-500/10">
                    <Clock className="h-5 w-5 text-red-400" />
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
                        "bg-white/[0.02] border border-white/[0.04]",
                        "hover:bg-white/[0.05] hover:border-purple-500/20 transition-all"
                      )}
                    >
                      <div
                        className={cn(
                          "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                          deadline.priority === "high"
                            ? "bg-red-500/10"
                            : deadline.priority === "medium"
                            ? "bg-amber-500/10"
                            : "bg-emerald-500/10"
                        )}
                      >
                        {deadline.priority === "high" ? (
                          <AlertCircle className="h-5 w-5 text-red-400" />
                        ) : (
                          <CheckCircle2
                            className={cn(
                              "h-5 w-5",
                              deadline.priority === "medium"
                                ? "text-amber-400"
                                : "text-emerald-400"
                            )}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p
                          className="text-sm font-medium text-white truncate"
                          style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                        >
                          {deadline.title}
                        </p>
                        <p className="text-xs text-zinc-500">{deadline.course}</p>
                      </div>
                      <span className="text-xs text-zinc-400 whitespace-nowrap px-2.5 py-1 rounded-lg bg-white/[0.03]">
                        {new Date(deadline.dueDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </motion.div>
                  ))}
                </div>
              </GradientCard>
            </motion.div>

            {/* Achievements */}
            <motion.div variants={itemVariants}>
              <GradientCard delay={0.7}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3
                      className="text-lg font-semibold text-white"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Achievements
                    </h3>
                    <p
                      className="text-sm text-zinc-500"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Your accomplishments
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-amber-500/10">
                    <Award className="h-5 w-5 text-amber-400" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.1 * index + 0.4 }}
                      whileHover={achievement.unlocked ? { scale: 1.03, y: -2 } : undefined}
                      className={cn(
                        "flex flex-col items-center p-4 rounded-xl text-center transition-all",
                        achievement.unlocked
                          ? "bg-gradient-to-br from-amber-500/10 to-orange-500/5 border border-amber-500/20 cursor-pointer"
                          : "bg-white/[0.02] border border-white/[0.04] opacity-50"
                      )}
                    >
                      <div
                        className={cn(
                          "h-12 w-12 rounded-xl flex items-center justify-center mb-3",
                          achievement.unlocked
                            ? "bg-gradient-to-br from-amber-500/20 to-orange-500/10"
                            : "bg-zinc-800/50"
                        )}
                      >
                        <Award
                          className={cn(
                            "h-6 w-6",
                            achievement.unlocked ? "text-amber-400" : "text-zinc-600"
                          )}
                        />
                      </div>
                      <p
                        className="text-sm font-semibold text-white mb-1"
                        style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                      >
                        {achievement.title}
                      </p>
                      <p className="text-xs text-zinc-500 line-clamp-2">
                        {achievement.description}
                      </p>
                    </motion.div>
                  ))}
                </div>
              </GradientCard>
            </motion.div>
          </div>

          {/* Courses Table */}
          <motion.div variants={itemVariants}>
            <GradientCard delay={0.8}>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
                <div>
                  <h3
                    className="text-lg font-semibold text-white"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    My Courses
                  </h3>
                  <p
                    className="text-sm text-zinc-500"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    Current semester enrollment
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => router.push("/assistant")}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/10 text-purple-400 text-sm font-medium hover:bg-purple-500/20 border border-purple-500/20 transition-all"
                  style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                >
                  <BookOpen className="h-4 w-4" />
                  Book More
                </motion.button>
              </div>

              <div className="overflow-x-auto -mx-6 px-6">
                <table className="w-full min-w-[600px]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Course", "Instructor", "Schedule", "Grade", "Attendance"].map(
                        (header) => (
                          <th
                            key={header}
                            className="text-left py-4 px-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider"
                            style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                          >
                            {header}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {courses.map((course, index) => (
                      <motion.tr
                        key={course.code}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.05 * index + 0.5 }}
                        className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                      >
                        <td className="py-4 px-4">
                          <div>
                            <p
                              className="font-semibold text-white group-hover:text-purple-400 transition-colors"
                              style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                            >
                              {course.code}
                            </p>
                            <p className="text-sm text-zinc-500">{course.name}</p>
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
                              "inline-flex px-3 py-1.5 rounded-lg text-xs font-semibold",
                              course.grade.startsWith("A")
                                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                : course.grade.startsWith("B")
                                ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                : "bg-red-500/10 text-red-400 border border-red-500/20"
                            )}
                          >
                            {course.grade}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-20 h-2 bg-zinc-800/50 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${course.attendance}%` }}
                                transition={{ delay: 0.6, duration: 0.8 }}
                                className={cn(
                                  "h-full rounded-full",
                                  course.attendance >= 90
                                    ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                    : course.attendance >= 80
                                    ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                    : "bg-gradient-to-r from-red-500 to-rose-400"
                                )}
                              />
                            </div>
                            <span className="text-sm text-zinc-300 font-medium">
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
          </motion.div>
        </motion.div>
      </main>

      {/* Global Styles */}
      <style jsx global>{`
        @keyframes shimmer {
          0% {
            background-position: 200% 0;
          }
          100% {
            background-position: -200% 0;
          }
        }

        .animate-shimmer {
          animation: shimmer 2s linear infinite;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
          );
          background-size: 200% 100%;
        }
      `}</style>
    </div>
  );
}