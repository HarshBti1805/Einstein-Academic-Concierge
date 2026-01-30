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
  Shield,
  ChevronUp,
  ChevronDown,
  Play,
  Square,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import WebSocket hook and Registration API
import {
  useRegistrationSocket,
  SeatBookedEvent,
  SeatReleasedEvent,
} from "@/hooks/useRegistrationSocket";
import { registrationAPI, ClassroomState } from "@/services/registrationAPI";

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
  const [studentId, setStudentId] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [occupiedSeats, setOccupiedSeats] = useState<number[]>([]);
  const [originalOccupiedSeats, setOriginalOccupiedSeats] = useState<number[]>(
    [],
  );
  const [leftSeats, setLeftSeats] = useState<number[]>([]);
  const [studentSeat, setStudentSeat] = useState<number | null>(null);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedSeatForJoin, setSelectedSeatForJoin] = useState<number | null>(
    null,
  );
  const [isJoining, setIsJoining] = useState(false);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const [highlightedSeat, setHighlightedSeat] = useState<number | null>(null);
  const [courseData, setCourseData] = useState<CourseSeats | null>(null);
  const [classroomState, setClassroomState] = useState<ClassroomState | null>(
    null,
  );
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const seatGridRef = useRef<HTMLDivElement>(null);
  const activityEndRef = useRef<HTMLDivElement>(null);

  // WebSocket connection for real-time updates
  const {
    isConnected,
    subscribeToCourse,
    unsubscribeFromCourse,
    onSeatBooked,
    onSeatReleased,
  } = useRegistrationSocket({
    studentId,
    onConnect: () => console.log("WebSocket connected for live view"),
    onDisconnect: (reason) => console.log("WebSocket disconnected:", reason),
  });

  // Handle real-time seat booked events
  const handleSeatBooked = useCallback(
    (event: SeatBookedEvent, _eventCourseId: string) => {
      console.log("Real-time seat booked:", event);

      // Parse seat number to get numeric position
      const match = event.seatNumber.match(/^([A-Z]+)(\d+)$/i);
      if (match) {
        const row = match[1].charCodeAt(0) - 65;
        const col = parseInt(match[2], 10);
        const seatNum = row * 10 + col;

        setOccupiedSeats((prev) => [...prev, seatNum]);
        setLeftSeats((prev) => prev.filter((s) => s !== seatNum));
        setHighlightedSeat(seatNum);
        setTimeout(() => setHighlightedSeat(null), 2000);

        const activity: RecentActivity = {
          id: `${Date.now()}-${seatNum}`,
          seatNumber: seatNum,
          action: "joined",
          timestamp: new Date(),
          studentName: event.studentName || "Unknown",
        };

        setRecentActivity((prev) => [...prev.slice(-19), activity]);
        setLastUpdate(new Date());
      }
    },
    [],
  );

  // Handle real-time seat released events
  const handleSeatReleased = useCallback(
    (event: SeatReleasedEvent, _eventCourseId: string) => {
      console.log("Real-time seat released:", event);

      const match = event.seatNumber.match(/^([A-Z]+)(\d+)$/i);
      if (match) {
        const row = match[1].charCodeAt(0) - 65;
        const col = parseInt(match[2], 10);
        const seatNum = row * 10 + col;

        setOccupiedSeats((prev) => prev.filter((s) => s !== seatNum));
        setLeftSeats((prev) => [...prev, seatNum]);

        const activity: RecentActivity = {
          id: `${Date.now()}-${seatNum}`,
          seatNumber: seatNum,
          action: "left",
          timestamp: new Date(),
          studentName: event.newStudentName || "Unknown",
        };

        setRecentActivity((prev) => [...prev.slice(-19), activity]);
        setLastUpdate(new Date());

        // If someone from waitlist got the seat, add another activity
        if (event.fromWaitlist && event.newStudentName) {
          setTimeout(() => {
            const joinActivity: RecentActivity = {
              id: `${Date.now()}-${seatNum}-join`,
              seatNumber: seatNum,
              action: "joined",
              timestamp: new Date(),
              studentName: event.newStudentName!,
            };
            setRecentActivity((prev) => [...prev.slice(-19), joinActivity]);
            setOccupiedSeats((prev) => [...prev, seatNum]);
            setLeftSeats((prev) => prev.filter((s) => s !== seatNum));
          }, 500);
        }
      }
    },
    [],
  );

  // Set up WebSocket event handlers
  useEffect(() => {
    onSeatBooked(handleSeatBooked);
    onSeatReleased(handleSeatReleased);
  }, [onSeatBooked, onSeatReleased, handleSeatBooked, handleSeatReleased]);

  // Subscribe to course updates when mounted
  useEffect(() => {
    if (mounted && courseCode && isConnected) {
      subscribeToCourse(courseCode);
      console.log("Subscribed to course:", courseCode);

      return () => {
        unsubscribeFromCourse(courseCode);
        console.log("Unsubscribed from course:", courseCode);
      };
    }
  }, [
    mounted,
    courseCode,
    isConnected,
    subscribeToCourse,
    unsubscribeFromCourse,
  ]);

  // Derived state from courseData
  const bookingStatus = courseData?.bookingStatus || "not_started";
  const totalSeats = courseData?.totalSeats || 0;
  const isBookingOpen = bookingStatus === "open" || bookingStatus === "OPEN";
  const isBookingClosed =
    bookingStatus === "closed" ||
    bookingStatus === "CLOSED" ||
    bookingStatus === "WAITLIST_ONLY";
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
        setStudentId(parsed.student_id || "");
      } catch {
        router.push("/");
        return;
      }

      // Fetch classroom state from registration API
      let seatData: CourseSeats | null = null;

      try {
        // Try the new registration API first
        const state = await registrationAPI.getClassroomState(courseCode);
        setClassroomState(state);

        // Convert to legacy format for compatibility
        const occupiedSeatNumbers = state.seats
          .filter((s) => s.isOccupied)
          .map((s) => {
            const match = s.seatNumber.match(/^([A-Z]+)(\d+)$/i);
            if (match) {
              const row = match[1].charCodeAt(0) - 65;
              const col = parseInt(match[2], 10);
              return row * 10 + col;
            }
            return 0;
          });

        seatData = {
          totalSeats: state.totalSeats,
          occupiedSeats: occupiedSeatNumbers,
          bookingStatus: state.bookingStatus.toLowerCase(),
        };
      } catch (error) {
        console.log("Registration API not available, using legacy API:", error);

        // Fallback to legacy API
        try {
          const response = await fetch(
            `${API_BASE_URL}/api/seats/course/${courseCode}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json",
              },
            },
          );

          if (response.ok) {
            const apiData = await response.json();
            if (apiData.success) {
              seatData = {
                totalSeats: apiData.totalSeats,
                occupiedSeats: apiData.occupiedSeats || [],
                bookingStatus: apiData.bookingStatus,
              };
            }
          }
        } catch {
          console.log("Using fallback seat data");
        }
      }

      // Fallback to local data
      if (!seatData) {
        const fallbackData = (
          seatsDataFallback.courses as Record<string, CourseSeats>
        )[courseCode];
        if (fallbackData) {
          seatData = fallbackData;
        }
      }

      if (seatData) {
        setCourseData(seatData);
        setOccupiedSeats([...seatData.occupiedSeats]);
        setOriginalOccupiedSeats([...seatData.occupiedSeats]);
        setLeftSeats([]);
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
        },
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
      "Alex Chen",
      "Jordan Smith",
      "Taylor Wilson",
      "Morgan Lee",
      "Casey Davis",
      "Riley Johnson",
      "Jamie Brown",
      "Avery Williams",
      "Quinn Thompson",
      "Sage Miller",
      "Drew Anderson",
      "Cameron White",
      "Parker Jones",
      "Reese Martin",
      "Finley Clark",
    ];

    const availableSeats = Array.from(
      { length: totalSeats },
      (_, i) => i + 1,
    ).filter((seat) => !occupiedSeats.includes(seat));

    const shouldJoin = Math.random() > 0.3 && availableSeats.length > 0;

    if (shouldJoin && availableSeats.length > 0) {
      const randomSeatIndex = Math.floor(Math.random() * availableSeats.length);
      const newSeat = availableSeats[randomSeatIndex];
      const randomName =
        mockStudentNames[Math.floor(Math.random() * mockStudentNames.length)];

      setOccupiedSeats((prev) => [...prev, newSeat]);
      setLeftSeats((prev) => prev.filter((s) => s !== newSeat)); // Remove from left seats if it was there
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
    } else if (occupiedSeats.length > originalOccupiedSeats.length) {
      // Occasionally someone leaves (but not from the original occupied seats)
      const addedSeats = occupiedSeats.filter(
        (seat) => !originalOccupiedSeats.includes(seat) && seat !== studentSeat,
      );
      if (addedSeats.length > 0) {
        const randomIndex = Math.floor(Math.random() * addedSeats.length);
        const leavingSeat = addedSeats[randomIndex];
        const randomName =
          mockStudentNames[Math.floor(Math.random() * mockStudentNames.length)];

        setOccupiedSeats((prev) => prev.filter((s) => s !== leavingSeat));
        setLeftSeats((prev) => [...prev, leavingSeat]); // Mark as left

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
  }, [
    originalOccupiedSeats,
    isBookingOpen,
    occupiedSeats,
    totalSeats,
    courseData,
    studentSeat,
  ]);

  // Simulate real-time updates (only when WebSocket is NOT connected as fallback demo)
  useEffect(() => {
    // Only simulate when WebSocket is disconnected and for demo purposes
    // When WebSocket is connected, real updates come through the socket
    if (!mounted || !isBookingOpen || isConnected) return;

    const interval = setInterval(
      () => {
        // Only generate simulated activity if WebSocket is disconnected
        generateRandomActivity();
      },
      5000 + Math.random() * 5000,
    ); // Slower simulation when offline

    return () => clearInterval(interval);
  }, [mounted, isBookingOpen, isConnected, generateRandomActivity]);

  // Note: Connection status is now managed by the WebSocket hook
  // No more simulated connection blips

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  const formatTimeAgo = (date: Date) => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  };

  // Admin: Open booking for a course
  const handleOpenBooking = async () => {
    if (!courseCode) return;
    setIsProcessing(true);
    try {
      const success = await registrationAPI.openBooking(courseCode);
      if (success) {
        await new Promise((resolve) => setTimeout(resolve, 500));
        try {
          const state = await registrationAPI.getClassroomState(courseCode);
          setCourseData((prev) =>
            prev
              ? {
                  ...prev,
                  bookingStatus: state.bookingStatus.toLowerCase(),
                }
              : null,
          );
        } catch (err) {
          console.error("Failed to refresh seat data:", err);
        }
      }
    } catch (error) {
      console.error("Failed to open booking:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Admin: Close booking for a course
  const handleCloseBooking = async () => {
    if (!courseCode) return;
    setIsProcessing(true);
    try {
      const success = await registrationAPI.closeBooking(courseCode);
      if (success) {
        try {
          const state = await registrationAPI.getClassroomState(courseCode);
          setCourseData((prev) =>
            prev
              ? {
                  ...prev,
                  bookingStatus: state.bookingStatus.toLowerCase(),
                }
              : null,
          );
        } catch (err) {
          console.error("Failed to refresh seat data:", err);
        }
      }
    } catch (error) {
      console.error("Failed to close booking:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleJoinClass = async () => {
    if (!selectedSeatForJoin || !studentId || !courseCode || isJoining) return;

    setIsJoining(true);

    // Convert numeric seat to seat number (e.g., "A5")
    const row = Math.floor((selectedSeatForJoin - 1) / 10);
    const col = ((selectedSeatForJoin - 1) % 10) + 1;
    const seatNumber = `${String.fromCharCode(65 + row)}${col}`;

    try {
      // Use registration API to book the seat
      const result = await registrationAPI.bookSeat(
        studentId,
        courseCode,
        seatNumber,
      );

      if (result.success) {
        setOccupiedSeats((prev) => [...prev, selectedSeatForJoin]);
        setLeftSeats((prev) => prev.filter((s) => s !== selectedSeatForJoin));
        setStudentSeat(selectedSeatForJoin);
        setShowJoinModal(false);
        setSelectedSeatForJoin(null);

        const activity: RecentActivity = {
          id: `${Date.now()}-${selectedSeatForJoin}`,
          seatNumber: selectedSeatForJoin,
          action: "joined",
          timestamp: new Date(),
          studentName: studentName,
        };
        setRecentActivity((prev) => [...prev.slice(-19), activity]);
        setLastUpdate(new Date());
      } else {
        alert(result.message || "Failed to join class. Please try again.");
      }
    } catch (error) {
      console.log("Registration API failed, using fallback:", error);

      // Fallback to legacy API
      try {
        const token = sessionStorage.getItem("authToken");
        const response = await fetch(
          `${API_BASE_URL}/api/seats/${courseCode}/book`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              seatNumbers: [selectedSeatForJoin],
              studentId: studentId,
            }),
          },
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setOccupiedSeats((prev) => [...prev, selectedSeatForJoin]);
          setLeftSeats((prev) => prev.filter((s) => s !== selectedSeatForJoin));
          setStudentSeat(selectedSeatForJoin);
          setShowJoinModal(false);
          setSelectedSeatForJoin(null);

          const activity: RecentActivity = {
            id: `${Date.now()}-${selectedSeatForJoin}`,
            seatNumber: selectedSeatForJoin,
            action: "joined",
            timestamp: new Date(),
            studentName: studentName,
          };
          setRecentActivity((prev) => [...prev.slice(-19), activity]);
          setLastUpdate(new Date());
        } else {
          alert(data.message || "Failed to join class. Please try again.");
        }
      } catch {
        // Last resort fallback for demo
        setOccupiedSeats((prev) => [...prev, selectedSeatForJoin]);
        setLeftSeats((prev) => prev.filter((s) => s !== selectedSeatForJoin));
        setStudentSeat(selectedSeatForJoin);
        setShowJoinModal(false);
        setSelectedSeatForJoin(null);

        const activity: RecentActivity = {
          id: `${Date.now()}-${selectedSeatForJoin}`,
          seatNumber: selectedSeatForJoin,
          action: "joined",
          timestamp: new Date(),
          studentName: studentName,
        };
        setRecentActivity((prev) => [...prev.slice(-19), activity]);
        setLastUpdate(new Date());
      }
    } finally {
      setIsJoining(false);
    }
  };

  if (!mounted) {
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
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 border-2 border-white/50 border-t-slate-700 rounded-full relative z-10"
        />
      </div>
    );
  }

  if (!courseCode || !courseData) {
    return (
      <div
        className={`min-h-screen flex items-center justify-center relative overflow-hidden ${fontVariables}`}
        style={{
          background:
            "linear-gradient(165deg, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 60%, #e2e8f0 100%)",
        }}
      >
        <div className="text-center">
          <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h2
            className="text-xl font-semibold text-gray-900 mb-2"
            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
          >
            Course Not Found
          </h2>
          <p className="text-gray-500 mb-4">
            The requested course could not be found.
          </p>
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
  const occupancyPercentage = Math.round(
    (occupiedSeats.length / totalSeats) * 100,
  );

  return (
    <div
      className={`min-h-screen relative overflow-x-hidden ${fontVariables}`}
      style={{
        background:
          "linear-gradient(165deg, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 60%, #e2e8f0 100%)",
      }}
    >
      {/* Grid - glassmorphism base */}
      <div className="fixed inset-0 pointer-events-none">
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
        className="fixed top-1/4 -left-32 w-[560px] h-[560px] rounded-full blur-[140px] pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(148,163,184,0.25) 40%, transparent 70%)",
        }}
      />
      <div
        className="fixed bottom-1/4 -right-32 w-[480px] h-[480px] rounded-full blur-[120px] pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(148,163,184,0.2) 50%, transparent 70%)",
        }}
      />
      <div
        className="fixed top-1/2 left-1/2 w-[720px] h-[720px] rounded-full blur-[160px] pointer-events-none opacity-50 -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(226,232,240,0.3) 50%, transparent 65%)",
        }}
      />

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
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            borderBottom: "1px solid rgba(255, 255, 255, 0.45)",
            boxShadow:
              "0 4px 24px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.5)",
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
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/bookings")}
                className="p-2.5 rounded-xl border transition-all"
                style={{
                  background: "rgba(255, 255, 255, 0.35)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                }}
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
                    style={{
                      fontFamily: "var(--font-poppins), system-ui, sans-serif",
                    }}
                  >
                    Live Classroom View
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span
                        className={cn(
                          "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                          isConnected ? "bg-emerald-400" : "bg-amber-400",
                        )}
                      ></span>
                      <span
                        className={cn(
                          "relative inline-flex rounded-full h-1.5 w-1.5",
                          isConnected ? "bg-emerald-500" : "bg-amber-500",
                        )}
                      ></span>
                    </span>
                    <p
                      className="text-[10px] text-gray-500 font-medium"
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      {courseCode} - Real-time monitoring
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Connection Status */}
            <div className="hidden md:flex items-center gap-4">
              <div
                className={cn(
                  "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-700 border border-amber-200",
                )}
              >
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
              {isBookingOpen && !studentSeat && (
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowJoinModal(true)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium text-sm shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
                >
                  Join Class
                </motion.button>
              )}

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2.5 rounded-xl border transition-all"
                style={{
                  background: "rgba(255, 255, 255, 0.35)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                }}
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
                    showUserMenu && "bg-gray-100 border-gray-300",
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-sm">
                    {studentName.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p
                      className="text-sm font-medium text-gray-900"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
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
                        className="absolute right-0 mt-2 w-48 rounded-xl overflow-hidden z-50"
                        style={{
                          background: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(24px)",
                          border: "1px solid rgba(255, 255, 255, 0.6)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                        }}
                      >
                        <div className="p-2">
                          {[
                            { icon: User, label: "Profile", action: () => {} },
                            {
                              icon: Settings,
                              label: "Settings",
                              action: () => {},
                            },
                            {
                              icon: LogOut,
                              label: "Sign out",
                              action: () => {
                                sessionStorage.removeItem("authToken");
                                sessionStorage.removeItem("studentData");
                                sessionStorage.removeItem("recommendedCourses");
                                router.push("/");
                              },
                            },
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
        {/* Admin Panel Toggle */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-gray-700 via-gray-800 to-black text-white text-sm font-semibold shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40 transition-all"
            style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
          >
            <Shield className="h-4 w-4" />
            Admin Controls (Testing)
            {showAdminPanel ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </motion.button>
        </motion.div>

        {/* Admin Panel */}
        <AnimatePresence>
          {showAdminPanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="mb-6 overflow-hidden"
            >
              <div
                className="relative rounded-2xl p-6 overflow-hidden"
                style={{
                  background: "rgba(255, 255, 255, 0.2)",
                  backdropFilter: "blur(24px) saturate(180%)",
                  WebkitBackdropFilter: "blur(24px) saturate(180%)",
                  border: "1px solid rgba(255, 255, 255, 0.45)",
                  boxShadow:
                    "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 via-transparent to-gray-100/50 pointer-events-none" />

                <div className="relative z-10">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300">
                      <Shield className="h-5 w-5 text-gray-700" />
                    </div>
                    <div>
                      <h3
                        className="text-base font-bold text-gray-900"
                        style={{
                          fontFamily: "var(--font-syne), system-ui, sans-serif",
                        }}
                      >
                        Booking Status Controls
                      </h3>
                      <p
                        className="text-xs text-gray-500 font-medium"
                        style={{
                          fontFamily:
                            "var(--font-raleway), system-ui, sans-serif",
                        }}
                      >
                        Use these controls to open/close bookings for testing
                        waitlist auto-allocation
                      </p>
                    </div>
                  </div>

                  {courseCode && (
                    <div className="p-4 rounded-xl bg-gray-50/50 border border-gray-200 shadow-sm backdrop-blur-sm group hover:border-gray-300 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p
                            className="font-bold text-gray-900 text-sm"
                            style={{
                              fontFamily:
                                "var(--font-space-mono), system-ui, sans-serif",
                            }}
                          >
                            {courseCode}
                          </p>
                          <p className="text-[11px] text-gray-500 font-medium truncate mb-2">
                            {isBookingOpen
                              ? "Status: Receiving Applications"
                              : "Status: Registration Paused"}
                          </p>
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                              isBookingOpen
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : "bg-red-50 text-red-700 border border-red-200",
                            )}
                          >
                            <span
                              className={cn(
                                "h-1.5 w-1.5 rounded-full",
                                isBookingOpen
                                  ? "bg-emerald-500 animate-pulse"
                                  : "bg-red-500",
                              )}
                            />
                            {isBookingOpen ? "Open" : "Closed"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleOpenBooking}
                            disabled={isProcessing || isBookingOpen}
                            className={cn(
                              "p-3 rounded-xl transition-all border",
                              isBookingOpen || isProcessing
                                ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                                : "bg-white text-emerald-600 hover:bg-emerald-50 border-emerald-200 shadow-sm",
                            )}
                          >
                            <Play className="h-5 w-5 fill-current" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleCloseBooking}
                            disabled={isProcessing || !isBookingOpen}
                            className={cn(
                              "p-3 rounded-xl transition-all border",
                              !isBookingOpen || isProcessing
                                ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                                : "bg-white text-red-600 hover:bg-red-50 border-red-200 shadow-sm",
                            )}
                          >
                            <Square className="h-5 w-5 fill-current" />
                          </motion.button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

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
                  style={{
                    fontFamily: "var(--font-syne), system-ui, sans-serif",
                  }}
                >
                  Bookings Not Yet Open
                </h3>
                <p
                  className="text-xs text-amber-700/80"
                  style={{
                    fontFamily: "var(--font-raleway), system-ui, sans-serif",
                  }}
                >
                  The classroom view is currently in preview mode. Bookings will
                  open soon.
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
                  style={{
                    fontFamily: "var(--font-syne), system-ui, sans-serif",
                  }}
                >
                  Bookings Closed
                </h3>
                <p
                  className="text-xs text-red-700/80"
                  style={{
                    fontFamily: "var(--font-raleway), system-ui, sans-serif",
                  }}
                >
                  Registration for this course has ended. The view shows the
                  final seating arrangement.
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
              className="relative rounded-2xl overflow-hidden"
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.45)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
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
                      style={{
                        fontFamily: "var(--font-syne), system-ui, sans-serif",
                      }}
                    >
                      Coming Soon
                    </h3>
                    <p className="text-gray-500 text-sm">
                      Bookings will open shortly
                    </p>
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
                      style={{
                        fontFamily: "var(--font-syne), system-ui, sans-serif",
                      }}
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
              <div
                className={cn(
                  "p-6 bg-gray-50/50",
                  isBookingNotStarted && "opacity-30",
                )}
              >
                {/* Whiteboard / Teacher's Desk */}
                <div className="mb-8">
                  <div className="relative mx-auto w-3/4 h-12 rounded-lg bg-gradient-to-b from-gray-900 to-gray-800 border-2 border-gray-500 shadow-lg">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span
                        className="text-xs text-gray-300 font-medium tracking-wider"
                        style={{
                          fontFamily:
                            "var(--font-manrope), system-ui, sans-serif",
                        }}
                      >
                        WHITEBOARD
                      </span>
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-lg" />
                  </div>
                  <div className="mx-auto w-1/3 h-8 mt-2 rounded-md bg-gradient-to-b from-amber-100 to-amber-200 border border-amber-300 flex items-center justify-center shadow-sm">
                    <span className="text-[10px] text-amber-700 font-medium">
                      TEACHER&apos;S DESK
                    </span>
                  </div>
                </div>

                {/* Classroom Desks Grid */}
                <div
                  ref={seatGridRef}
                  className="flex flex-col items-center gap-3 overflow-x-auto pb-4"
                >
                  {Array.from(
                    { length: Math.ceil(totalSeats / 10) },
                    (_, rowIndex) => {
                      const desksPerRow = 10;
                      const startDesk = rowIndex * desksPerRow + 1;
                      const endDesk = Math.min(
                        (rowIndex + 1) * desksPerRow,
                        totalSeats,
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
                              const isOccupied =
                                occupiedSeats.includes(deskNumber);
                              const isStudentSeat = studentSeat === deskNumber;
                              const isLeftSeat = leftSeats.includes(deskNumber);
                              const isOriginalOccupied =
                                originalOccupiedSeats.includes(deskNumber);
                              const isHighlighted =
                                highlightedSeat === deskNumber;
                              const hasAisle = colIndex === 4;
                              const isAvailable = !isOccupied;

                              return (
                                <div
                                  key={deskNumber}
                                  className="flex items-center"
                                >
                                  <motion.div
                                    initial={false}
                                    animate={{
                                      scale: isHighlighted ? [1, 1.15, 1] : 1,
                                      boxShadow: isHighlighted
                                        ? "0 0 20px rgba(34, 197, 94, 0.5)"
                                        : "none",
                                    }}
                                    transition={{ duration: 0.5 }}
                                    className={cn(
                                      "relative w-10 h-8 rounded-md transition-all duration-300",
                                      isAvailable
                                        ? isLeftSeat
                                          ? "bg-gradient-to-b from-red-100 to-red-500 border-2 border-red-700 cursor-pointer hover:border-red-500 hover:shadow-md"
                                          : "bg-white border-2 border-gray-200 cursor-pointer hover:border-gray-300 hover:shadow-md"
                                        : isStudentSeat
                                          ? "bg-gradient-to-b from-emerald-600 to-emerald-700 border-2 border-emerald-500 shadow-md"
                                          : isOriginalOccupied
                                            ? "bg-black border-2 border-gray-900 shadow-md"
                                            : "bg-gradient-to-b from-pink-800 to-gray-900 border-2 border-gray-700 shadow-md",
                                      isHighlighted &&
                                        "ring-2 ring-emerald-400 ring-offset-2",
                                      isStudentSeat &&
                                        "ring-2 ring-blue-400 ring-offset-2",
                                    )}
                                    onClick={() => {
                                      if (
                                        isAvailable &&
                                        isBookingOpen &&
                                        !studentSeat
                                      ) {
                                        setSelectedSeatForJoin(deskNumber);
                                        setShowJoinModal(true);
                                      }
                                    }}
                                    title={`Seat ${deskNumber}${isStudentSeat ? " (Your Seat)" : isOccupied ? (isOriginalOccupied ? " (Pre-filled)" : " (Occupied)") : isLeftSeat ? " (Recently Left - Available)" : " (Available - Click to Join)"}`}
                                  >
                                    <div className="absolute inset-0 rounded-md bg-gradient-to-br from-white/20 to-transparent" />

                                    {/* Chair indicator */}
                                    <div
                                      className={cn(
                                        "absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-5 h-2 rounded-b-sm",
                                        isAvailable
                                          ? isLeftSeat
                                            ? "bg-red-200"
                                            : "bg-gray-100"
                                          : isStudentSeat
                                            ? "bg-emerald-600"
                                            : "bg-black",
                                      )}
                                    />

                                    {isOccupied && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <User className="h-3 w-3 text-white" />
                                      </div>
                                    )}

                                    {isStudentSeat && (
                                      <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                                    )}
                                  </motion.div>

                                  {hasAisle && <div className="w-6" />}
                                </div>
                              );
                            },
                          )}
                          <span className="w-6 text-xs text-gray-400 text-left ml-2 font-medium">
                            {String.fromCharCode(65 + rowIndex)}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Back of Classroom */}
                <div className="mt-6 text-center">
                  <span className="text-xs text-gray-400 font-medium tracking-wider">
                    BACK OF CLASSROOM
                  </span>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-6 text-sm flex-wrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-5 rounded bg-white border-2 border-gray-200" />
                    <span
                      className="text-gray-600"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    >
                      Available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-5 rounded bg-gradient-to-b from-red-300 to-red-500 border-2 border-red-300" />
                    <span
                      className="text-gray-600"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    >
                      Recently Left
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-5 rounded bg-black border-2 border-gray-900" />
                    <span
                      className="text-gray-600"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    >
                      Pre-filled
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-5 rounded bg-gradient-to-b from-pink-800 to-pink-900 border-2 border-gray-700" />
                    <span
                      className="text-gray-600"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    >
                      Occupied
                    </span>
                  </div>
                  {studentSeat && (
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-5 rounded bg-gradient-to-b from-emerald-600 to-emerald-700 border-2 border-blue-400 relative">
                        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border-2 border-white" />
                      </div>
                      <span
                        className="text-gray-600"
                        style={{
                          fontFamily:
                            "var(--font-manrope), system-ui, sans-serif",
                        }}
                      >
                        Your Seat
                      </span>
                    </div>
                  )}
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
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.45)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <h3
                className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"
                style={{
                  fontFamily: "var(--font-syne), system-ui, sans-serif",
                }}
              >
                <TrendingUp className="h-4 w-4 text-gray-600" />
                Live Statistics
              </h3>

              <div className="space-y-4">
                {/* Occupancy */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">Occupancy</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {occupancyPercentage}%
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${occupancyPercentage}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                      className={cn(
                        "h-full rounded-full",
                        occupancyPercentage >= 90
                          ? "bg-red-500"
                          : occupancyPercentage >= 70
                            ? "bg-amber-500"
                            : "bg-emerald-500",
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
                    <span className="text-xs text-gray-500">
                      Total Capacity
                    </span>
                    <span className="text-lg font-bold text-gray-900">
                      {totalSeats}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                backdropFilter: "blur(24px) saturate(180%)",
                WebkitBackdropFilter: "blur(24px) saturate(180%)",
                border: "1px solid rgba(255, 255, 255, 0.45)",
                boxShadow:
                  "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
              }}
            >
              <h3
                className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2"
                style={{
                  fontFamily: "var(--font-syne), system-ui, sans-serif",
                }}
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
                    <p className="text-xs text-gray-500">
                      Waiting for activity...
                    </p>
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
                              : "bg-red-50 border border-red-200",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-1.5 h-1.5 rounded-full",
                                activity.action === "joined"
                                  ? "bg-emerald-500"
                                  : "bg-red-500",
                              )}
                            />
                            <span
                              className={cn(
                                "font-medium",
                                activity.action === "joined"
                                  ? "text-emerald-800"
                                  : "text-red-800",
                              )}
                            >
                              {activity.studentName}
                            </span>
                          </div>
                          <div className="flex items-center justify-between mt-1 ml-3.5">
                            <span className="text-gray-600">
                              {activity.action === "joined" ? "took" : "left"}{" "}
                              seat {activity.seatNumber}
                            </span>
                            <span className="text-gray-400">
                              {formatTimeAgo(activity.timestamp)}
                            </span>
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
                  : "bg-amber-50 border border-amber-200",
              )}
            >
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Wifi className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700">
                      Connected to live updates
                    </span>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: "linear",
                      }}
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

      {/* Join Class Modal */}
      <AnimatePresence>
        {showJoinModal && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={() => !isJoining && setShowJoinModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div
                className="rounded-2xl max-w-md w-full p-6"
                style={{
                  background: "rgba(255, 255, 255, 0.95)",
                  backdropFilter: "blur(24px)",
                  border: "1px solid rgba(255, 255, 255, 0.6)",
                  boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
                }}
              >
                <h3
                  className="text-xl font-semibold text-gray-900 mb-2"
                  style={{
                    fontFamily: "var(--font-syne), system-ui, sans-serif",
                  }}
                >
                  Join Class
                </h3>
                <p className="text-sm text-gray-600 mb-6">
                  {selectedSeatForJoin
                    ? `Confirm booking seat ${selectedSeatForJoin}?`
                    : "Select a seat to join the class"}
                </p>

                {selectedSeatForJoin ? (
                  <div className="space-y-4">
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-10 rounded-md bg-gradient-to-b from-emerald-600 to-emerald-700 border-2 border-emerald-500 flex items-center justify-center">
                          <User className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-emerald-900">
                            Seat {selectedSeatForJoin}
                          </p>
                          <p className="text-xs text-emerald-700">
                            Available for booking
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => {
                          setSelectedSeatForJoin(null);
                          setShowJoinModal(false);
                        }}
                        disabled={isJoining}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gray-100 text-gray-700 font-medium hover:bg-gray-200 transition-all disabled:opacity-50"
                      >
                        Cancel
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleJoinClass}
                        disabled={isJoining}
                        className="flex-1 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isJoining ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            Joining...
                          </>
                        ) : (
                          "Confirm"
                        )}
                      </motion.button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {Array.from({ length: totalSeats }, (_, i) => i + 1)
                      .filter((seat) => !occupiedSeats.includes(seat))
                      .map((seat) => {
                        const isLeft = leftSeats.includes(seat);
                        return (
                          <motion.button
                            key={seat}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => setSelectedSeatForJoin(seat)}
                            className={cn(
                              "w-full p-3 rounded-xl border-2 transition-all text-left",
                              isLeft
                                ? "bg-red-50 border-red-200 hover:border-red-400 hover:bg-red-100"
                                : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50",
                            )}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={cn(
                                  "w-10 h-8 rounded-md border-2",
                                  isLeft
                                    ? "bg-gradient-to-b from-red-100 to-red-200 border-red-300"
                                    : "bg-white border-gray-200",
                                )}
                              />
                              <div>
                                <p className="font-medium text-gray-900">
                                  Seat {seat}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {isLeft
                                    ? "Recently left - Click to select"
                                    : "Click to select"}
                                </p>
                              </div>
                            </div>
                          </motion.button>
                        );
                      })}
                    {Array.from({ length: totalSeats }, (_, i) => i + 1).filter(
                      (seat) => !occupiedSeats.includes(seat),
                    ).length === 0 && (
                      <p className="text-center text-gray-500 py-4">
                        No available seats
                      </p>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

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

// // Course 1 ===> Priority Queue ==> weight --> score (college) min thershold ==> student x 800

// 800 -> 200

// // Course 2 ===> Priority Queue ==> weight --> score - interst, marks, attendance, branch and previous subjects ==> score (college) min thershold ==> student x 800

// polling --> 200 --> user regiser => 200 filled --> vaccany seat -->

// 1. College perspective (expects the best canidate for respective course) :: (BASIC IDEA - use a priority queue based on score(could be calculated based on several factors like interests, marks, attendance, branch and previous subjects)) -> Clash based on score and who will be let in to a coure

// 2. Auto-registarion agent --> in case the booking has not started or all the seats have been filled students can join the waitlist -> based on score from priority_queue the students will be automatillcy registerd in case of vaccany or opening of bookings by an autonomous agent.
