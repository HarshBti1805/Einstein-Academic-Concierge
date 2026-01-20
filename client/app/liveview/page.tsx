"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fontVariables } from "@/lib/fonts";
import {
  ArrowLeft,
  Bell,
  Settings,
  LogOut,
  User,
  GraduationCap,
  Clock,
  Radio,
  Wifi,
  WifiOff,
  Lock,
  AlertTriangle,
  RefreshCw,
  Activity,
  Eye,
  TrendingUp,
  Circle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import test data as fallback
import seatsDataFallback from "@/lib/test-data/seats_data.json";

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface CourseSeats {
  totalSeats: number;
  occupiedSeats: number[];
  bookingStatus: string;
}

interface RecentActivity {
  id: string;
  seatNumber: number;
  action: "joined" | "left";
  timestamp: Date;
  studentName: string;
}

export default function LiveViewPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseCode = searchParams.get("course") || "";
  
  const [mounted, setMounted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isConnected, setIsConnected] = useState(true);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [highlightedSeat, setHighlightedSeat] = useState<number | null>(null);
  const [courseData, setCourseData] = useState<CourseSeats | null>(null);
  
  const seatGridRef = useRef<HTMLDivElement>(null);
  const activityEndRef = useRef<HTMLDivElement>(null);

  // Derived state from courseData
  const bookingStatus = courseData?.bookingStatus || "not_started";
  const totalSeats = courseData?.totalSeats || 0;
  const isBookingOpen = bookingStatus === "open";
  const isBookingClosed = bookingStatus === "closed";
  const isBookingNotStarted = bookingStatus === "not_started";

  useEffect(() => {
    const initializePage = async () => {
      const token = sessionStorage.getItem("authToken");
      const data = sessionStorage.getItem("studentData");
      
      if (!token || !data) {
        router.push("/");
        return;
      }

      try {
        const parsed = JSON.parse(data);
        setStudentName(parsed.name || "Student");
      } catch {
        router.push("/");
        return;
      }

      // Fetch seat data from API
      let seatData: CourseSeats | null = null;
      
      try {
        const response = await fetch(`${API_BASE_URL}/api/seats/course/${courseCode}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const apiData = await response.json();
          if (apiData.success) {
            seatData = {
              totalSeats: apiData.totalSeats,
              occupiedSeats: apiData.occupiedSeats || [],
              bookingStatus: apiData.bookingStatus
            };
          }
        }
      } catch {
        console.log("Using fallback seat data");
      }

      // Fallback to local data
      if (!seatData) {
        const fallbackData = (seatsDataFallback.courses as Record<string, CourseSeats>)[courseCode];
        if (fallbackData) {
          seatData = fallbackData;
        }
      }

      if (seatData) {
        setCourseData(seatData);
        setOccupiedSeats([...seatData.occupiedSeats]);
      }

      setMounted(true);
    };

    const timer = setTimeout(initializePage, 0);
    return () => clearTimeout(timer);
  }, [router, courseCode]);

  // Animate seats on load
  useEffect(() => {
    if (mounted && seatGridRef.current) {
      gsap.fromTo(
        ".desk-row",
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.03,
          ease: "power2.out",
        }
      );
    }
  }, [mounted]);

  // Scroll activity feed to bottom on new activity
  useEffect(() => {
    if (activityEndRef.current) {
      activityEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [recentActivity]);

  // Generate random activity
  const generateRandomActivity = useCallback(() => {
    if (!courseData || !isBookingOpen) return;

    // Mock student names for simulation
    const mockStudentNames = [
      "Alex Chen", "Jordan Smith", "Taylor Wilson", "Morgan Lee", "Casey Davis",
      "Riley Johnson", "Jamie Brown", "Avery Williams", "Quinn Thompson", "Sage Miller",
      "Drew Anderson", "Cameron White", "Parker Jones", "Reese Martin", "Finley Clark"
    ];

    const availableSeats = Array.from(
      { length: totalSeats },
      (_, i) => i + 1
    ).filter((seat) => !occupiedSeats.includes(seat));

    const shouldJoin = Math.random() > 0.3 && availableSeats.length > 0;
    
    if (shouldJoin && availableSeats.length > 0) {
      const randomSeatIndex = Math.floor(Math.random() * availableSeats.length);
      const newSeat = availableSeats[randomSeatIndex];
      const randomName = mockStudentNames[Math.floor(Math.random() * mockStudentNames.length)];

      setOccupiedSeats((prev) => [...prev, newSeat]);
      setHighlightedSeat(newSeat);
      setTimeout(() => setHighlightedSeat(null), 2000);

      const activity: RecentActivity = {
        id: `${Date.now()}-${newSeat}`,
        seatNumber: newSeat,
        action: "joined",
        timestamp: new Date(),
        studentName: randomName,
      };

      setRecentActivity((prev) => [...prev.slice(-19), activity]);
      setLastUpdate(new Date());
    } else if (occupiedSeats.length > courseData.occupiedSeats.length) {
      // Occasionally someone leaves (but not from the original occupied seats)
      const addedSeats = occupiedSeats.filter(
        (seat) => !courseData.occupiedSeats.includes(seat)
      );
      if (addedSeats.length > 0) {
        const randomIndex = Math.floor(Math.random() * addedSeats.length);
        const leavingSeat = addedSeats[randomIndex];
        const randomName = mockStudentNames[Math.floor(Math.random() * mockStudentNames.length)];

        setOccupiedSeats((prev) => prev.filter((s) => s !== leavingSeat));

        const activity: RecentActivity = {
          id: `${Date.now()}-${leavingSeat}`,
          seatNumber: leavingSeat,
          action: "left",
          timestamp: new Date(),
          studentName: randomName,
        };

        setRecentActivity((prev) => [...prev.slice(-19), activity]);
        setLastUpdate(new Date());
      }
    }
  }, [courseData, isBookingOpen, occupiedSeats, totalSeats]);

  // Simulate real-time updates
  useEffect(() => {
    if (!mounted || !isBookingOpen) return;

    const interval = setInterval(() => {
      if (isConnected) {
        generateRandomActivity();
      }
    }, 3000 + Math.random() * 4000); // Random interval between 3-7 seconds

    return () => clearInterval(interval);
  }, [mounted, isBookingOpen, isConnected, generateRandomActivity]);

  // Connection status simulation
  useEffect(() => {
    if (!mounted) return;

    const interval = setInterval(() => {
      // Simulate occasional connection blips
      if (Math.random() > 0.95) {
        setIsConnected(false);
        setTimeout(() => setIsConnected(true), 1500);
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [mounted]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  if (!mounted) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 flex items-center justify-center ${fontVariables}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 border-2 border-gray-200 border-t-gray-800 rounded-full"
        />
      </div>
    );
  }

  if (!courseCode || !courseData) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 flex items-center justify-center ${fontVariables}`}>
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2 
            className="text-xl font-semibold text-gray-900 mb-2"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            Course Not Found
          </h2>
          <p className="text-gray-500 mb-4">The requested course could not be found.</p>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push("/bookings")}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white font-medium shadow-lg shadow-gray-500/25"
          >
            Go to Bookings
          </motion.button>
        </div>
      </div>
    );
  }

  const availableSeats = totalSeats - occupiedSeats.length;
  const occupancyPercentage = Math.round((occupiedSeats.length / totalSeats) * 100);

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 relative overflow-x-hidden ${fontVariables}`}>
      {/* Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div
          className="absolute inset-0 opacity-[0.6]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gray-200/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gray-300/30 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50"
      >
        <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/bookings")}
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/60 hover:bg-gray-100 hover:border-gray-300 transition-all"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </motion.button>

              <div className="flex items-center gap-3">
                <div className="relative">
                  <div className="absolute -inset-1 bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl blur opacity-30" />
                  <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black shadow-lg">
                    <Eye className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1
                    className="text-base font-bold text-gray-900 tracking-tight"
                    style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
                  >
                    Live Classroom View
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        isConnected ? "bg-emerald-400" : "bg-amber-400"
                      )}></span>
                      <span className={cn(
                        "relative inline-flex rounded-full h-1.5 w-1.5",
                        isConnected ? "bg-emerald-500" : "bg-amber-500"
                      )}></span>
                    </span>
                    <p 
                      className="text-[10px] text-gray-500 font-medium"
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      {courseCode} - Real-time monitoring
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="hidden md:flex items-center gap-4">
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                isConnected 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              )}>
                {isConnected ? (
                  <>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Wifi className="h-3 w-3" />
                    </motion.div>
                    <span>Live</span>
                    <motion.div
                      animate={{ opacity: [1, 0.5, 1] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="h-2 w-2 rounded-full bg-emerald-500"
                    />
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Reconnecting...</span>
                  </>
                )}
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2.5 rounded-xl bg-gray-50 border border-gray-200/60 hover:bg-gray-100 hover:border-gray-300 transition-all"
              >
                <Bell className="h-4 w-4 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-gray-700 rounded-full animate-pulse" />
              </motion.button>

              <div className="hidden sm:block w-px h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-1" />

              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={cn(
                    "flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-all",
                    "bg-gray-50 border border-gray-200/60",
                    "hover:bg-gray-100 hover:border-gray-300",
                    showUserMenu && "bg-gray-100 border-gray-300"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-sm">
                    {studentName.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p 
                      className="text-sm font-medium text-gray-900"
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    >
                      {studentName}
                    </p>
                    <p className="text-xs text-gray-500">Viewing</p>
                  </div>
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
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-white backdrop-blur-xl border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden z-50"
                      >
                        <div className="p-2">
                          {[
                            { icon: User, label: "Profile", action: () => {} },
                            { icon: Settings, label: "Settings", action: () => {} },
                            { icon: LogOut, label: "Sign out", action: () => {
                              sessionStorage.removeItem("authToken");
                              sessionStorage.removeItem("studentData");
                              sessionStorage.removeItem("recommendedCourses");
                              router.push("/");
                            }},
                          ].map((item) => (
                            <motion.button
                              key={item.label}
                              whileHover={{ x: 4 }}
                              onClick={item.action}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                            >
                              <item.icon className="h-4 w-4" />
                              {item.label}
                            </motion.button>
                          ))}
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Booking Not Started Banner */}
        {isBookingNotStarted && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-amber-50 border border-amber-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100">
                <Lock className="h-5 w-5 text-amber-600" />
              </div>
              <div>
                <h3 
                  className="text-sm font-semibold text-amber-800"
                  style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                >
                  Bookings Not Yet Open
                </h3>
                <p 
                  className="text-xs text-amber-700/80"
                  style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                >
                  The classroom view is currently in preview mode. Bookings will open soon.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Booking Closed Banner */}
        {isBookingClosed && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100">
                <Lock className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 
                  className="text-sm font-semibold text-red-800"
                  style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                >
                  Bookings Closed
                </h3>
                <p 
                  className="text-xs text-red-700/80"
                  style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                >
                  Registration for this course has ended. The view shows the final seating arrangement.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Classroom View */}
          <div className="lg:col-span-3">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative rounded-2xl bg-white backdrop-blur-xl border border-gray-200/60 overflow-hidden shadow-sm"
            >
              {/* Greyed out overlay for not started */}
              {isBookingNotStarted && (
                <div className="absolute inset-0 bg-gray-100/80 backdrop-blur-sm z-10 flex items-center justify-center">
                  <div className="text-center">
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    </motion.div>
                    <h3 
                      className="text-xl font-semibold text-gray-600 mb-2"
                      style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                    >
                      Coming Soon
                    </h3>
                    <p className="text-gray-500 text-sm">Bookings will open shortly</p>
                  </div>
                </div>
              )}

              {/* Classroom Header */}
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 border border-gray-200">
                    <GraduationCap className="h-5 w-5 text-gray-700" />
                  </div>
                  <div>
                    <h2 
                      className="text-lg font-semibold text-gray-900"
                      style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                    >
                      {courseCode} Classroom
                    </h2>
                    <p className="text-xs text-gray-500">
                      Last updated: {formatTime(lastUpdate)}
                    </p>
                  </div>
                </div>

                {isBookingOpen && (
                  <motion.button
                    whileHover={{ scale: 1.05, rotate: 180 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setLastUpdate(new Date())}
                    className="p-2 rounded-lg bg-gray-50 border border-gray-200 hover:bg-gray-100 transition-all"
                  >
                    <RefreshCw className="h-4 w-4 text-gray-600" />
                  </motion.button>
                )}
              </div>

              {/* Classroom Content */}
              <div className={cn(
                "p-6 bg-gray-50/50",
                isBookingNotStarted && "opacity-30"
              )}>
                {/* Whiteboard / Teacher's Desk */}
                <div className="mb-8">
                  <div className="relative mx-auto w-3/4 h-12 rounded-lg bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-500 shadow-lg">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span 
                        className="text-xs text-gray-300 font-medium tracking-wider"
                        style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                      >
                        WHITEBOARD
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-lg" />
                  </div>
                  <div className="mx-auto w-1/3 h-8 mt-2 rounded-md bg-gradient-to-b from-amber-100 to-amber-200 border border-amber-300 flex items-center justify-center shadow-sm">
                    <span className="text-[10px] text-amber-700 font-medium">TEACHER&apos;S DESK</span>
                  </div>
                </div>

                {/* Classroom Desks Grid */}
                <div ref={seatGridRef} className="flex flex-col items-center gap-3 overflow-x-auto pb-4">
                  {Array.from(
                    { length: Math.ceil(totalSeats / 10) },
                    (_, rowIndex) => {
                      const desksPerRow = 10;
                      const startDesk = rowIndex * desksPerRow + 1;
                      const endDesk = Math.min(
                        (rowIndex + 1) * desksPerRow,
                        totalSeats
                      );

                      return (
                        <div
                          key={rowIndex}
                          className="desk-row flex items-center justify-center gap-2"
                        >
                          <span className="w-6 text-xs text-gray-400 text-right mr-2 font-medium">
                            {String.fromCharCode(65 + rowIndex)}
                          </span>
                          {Array.from(
                            { length: endDesk - startDesk + 1 },
                            (_, colIndex) => {
                              const deskNumber = startDesk + colIndex;
                              const isOccupied = occupiedSeats.includes(deskNumber);
                              const isHighlighted = highlightedSeat === deskNumber;
                              const hasAisle = colIndex === 4;

                              return (
                                <div key={deskNumber} className="flex items-center">
                                  <motion.div
                                    initial={false}
                                    animate={{
                                      scale: isHighlighted ? [1, 1.15, 1] : 1,
                                      boxShadow: isHighlighted 
                                        ? "0 0 20px rgba(34, 197, 94, 0.5)" 
                                        : "none"
                                    }}
                                    transition={{ duration: 0.5 }}
                                    className={cn(
                                      "relative w-10 h-8 rounded-md transition-all duration-300 cursor-default",
                                      isOccupied 
                                        ? "bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-gray-600 shadow-md"
                                        : "bg-gradient-to-b from-gray-100 to-gray-200 border-2 border-gray-300",
                                      isHighlighted && "ring-2 ring-emerald-400 ring-offset-2"
                                    )}
                                    title={`Seat ${deskNumber}${isOccupied ? ' (Occupied)' : ' (Available)'}`}
                                  >
                                    <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/20 to-transparent" />
                                    
                                    {/* Chair indicator */}
                                    <div 
                                      className={cn(
                                        "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2 rounded-b-sm",
                                        isOccupied ? "bg-gray-700" : "bg-gray-200"
                                      )}
                                    />
                                    
                                    {isOccupied && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <User className="h-3 w-3 text-white" />
                                      </div>
                                    )}
                                  </motion.div>
                                  
                                  {hasAisle && <div className="w-6" />}
                                </div>
                              );
                            }
                          )}
                          <span className="w-6 text-xs text-gray-400 text-left ml-2 font-medium">
                            {String.fromCharCode(65 + rowIndex)}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Back of Classroom */}
                <div className="mt-6 text-center">
                  <span className="text-xs text-gray-400 font-medium tracking-wider">BACK OF CLASSROOM</span>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-5 rounded bg-gradient-to-b from-gray-100 to-gray-200 border-2 border-gray-300" />
                    <span 
                      className="text-gray-600"
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    >
                      Available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-5 rounded bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-gray-600" />
                    <span 
                      className="text-gray-600"
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    >
                      Occupied
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <motion.div
                      animate={{ boxShadow: ["0 0 8px rgba(34, 197, 94, 0.3)", "0 0 16px rgba(34, 197, 94, 0.5)", "0 0 8px rgba(34, 197, 94, 0.3)"] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                      className="w-6 h-5 rounded bg-gradient-to-b from-gray-700 to-gray-800 border-2 border-emerald-400"
                    />
                    <span 
                      className="text-gray-600"
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    >
                      Just Joined
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Sidebar - Stats & Activity */}
          <div className="lg:col-span-1 space-y-4">
            {/* Quick Stats */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl bg-white backdrop-blur-xl border border-gray-200/60 p-5 shadow-sm"
            >
              <h3 
                className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"
                style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
              >
                <TrendingUp className="h-4 w-4 text-gray-600" />
                Live Statistics
              </h3>
              
              <div className="space-y-4">
                {/* Occupancy */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Occupancy</span>
                    <span className="text-sm font-semibold text-gray-900">{occupancyPercentage}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${occupancyPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        occupancyPercentage >= 90 ? "bg-red-500" :
                        occupancyPercentage >= 70 ? "bg-amber-500" :
                        "bg-emerald-500"
                      )}
                    />
                  </div>
                </div>

                {/* Seats Info */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200">
                    <div 
                      className="text-2xl font-bold text-emerald-700"
                      style={{ fontFamily: "var(--font-syne)" }}
                    >
                      {availableSeats}
                    </div>
                    <div className="text-xs text-emerald-600">Available</div>
                  </div>
                  <div className="p-3 rounded-xl bg-gray-100 border border-gray-200">
                    <div 
                      className="text-2xl font-bold text-gray-700"
                      style={{ fontFamily: "var(--font-syne)" }}
                    >
                      {occupiedSeats.length}
                    </div>
                    <div className="text-xs text-gray-600">Occupied</div>
                  </div>
                </div>

                {/* Total */}
                <div className="p-3 rounded-xl bg-gray-50 border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Total Capacity</span>
                    <span className="text-lg font-bold text-gray-900">{totalSeats}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl bg-white backdrop-blur-xl border border-gray-200/60 p-5 shadow-sm"
            >
              <h3 
                className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"
                style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
              >
                <Activity className="h-4 w-4 text-gray-600" />
                Recent Activity
                {isConnected && (
                  <motion.div
                    animate={{ opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="ml-auto"
                  >
                    <Circle className="h-2 w-2 fill-emerald-500 text-emerald-500" />
                  </motion.div>
                )}
              </h3>

              <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                {recentActivity.length === 0 ? (
                  <div className="text-center py-8">
                    <Radio className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-xs text-gray-500">Waiting for activity...</p>
                  </div>
                ) : (
                  <>
                    <AnimatePresence>
                      {recentActivity.map((activity) => (
                        <motion.div
                          key={activity.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 20 }}
                          className={cn(
                            "p-2.5 rounded-lg text-xs",
                            activity.action === "joined" 
                              ? "bg-emerald-50 border border-emerald-200" 
                              : "bg-red-50 border border-red-200"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div className={cn(
                              "w-1.5 h-1.5 rounded-full",
                              activity.action === "joined" ? "bg-emerald-500" : "bg-red-500"
                            )} />
                            <span className={cn(
                              "font-medium",
                              activity.action === "joined" ? "text-emerald-800" : "text-red-800"
                            )}>
                              {activity.studentName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 ml-3.5">
                            <span className="text-gray-600">
                              {activity.action === "joined" ? "took" : "left"} seat {activity.seatNumber}
                            </span>
                            <span className="text-gray-400">{formatTimeAgo(activity.timestamp)}</span>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    <div ref={activityEndRef} />
                  </>
                )}
              </div>
            </motion.div>

            {/* Connection Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className={cn(
                "rounded-xl p-3 text-xs",
                isConnected 
                  ? "bg-emerald-50 border border-emerald-200" 
                  : "bg-amber-50 border border-amber-200"
              )}
            >
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Connected to live updates</span>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    >
                      <RefreshCw className="h-3.5 w-3.5 text-amber-600" />
                    </motion.div>
                    <span className="text-amber-700">Reconnecting...</span>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </main>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(0, 0, 0, 0.05);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.15);
          border-radius: 2px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  );
}
