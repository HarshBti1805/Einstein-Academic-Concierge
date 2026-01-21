"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fontVariables } from "@/lib/fonts";
import {
  X,
  Check,
  Clock,
  Users,
  Calendar,
  BookOpen,
  Info,
  Sparkles,
  Zap,
  Bot,
  AlertCircle,
  ArrowLeft,
  Bell,
  Settings,
  LogOut,
  User,
  GraduationCap,
  Eye,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import WebSocket hook and Registration API
import { useRegistrationSocket } from "@/hooks/useRegistrationSocket";
import { registrationAPI, ClassroomState, SeatInfo } from "@/services/registrationAPI";
import NotificationModal, { NotificationType } from "@/components/ui/NotificationModal";

// Import test data as fallback
import seatsDataFallback from "@/lib/test-data/seats_data.json";

// API base URL
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface RecommendedCourse {
  code: string;
  name: string;
  credits: number;
  instructor: string;
  schedule: string;
  priority: number;
  reason: string;
  totalSeats: number;
  occupiedSeats: number;
  bookingStatus: string;
}

interface CourseSeats {
  totalSeats: number;
  occupiedSeats: number[];
  bookingStatus: string;
}

interface SelectedCourse extends RecommendedCourse {
  seatData: CourseSeats;
}

export default function BookingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [studentId, setStudentId] = useState("");
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [autoRegistration, setAutoRegistration] = useState<Record<string, boolean>>({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [seatsData, setSeatsData] = useState<{ courses: Record<string, CourseSeats> }>({ courses: {} });
  const [isBooking, setIsBooking] = useState(false);
  const [classroomState, setClassroomState] = useState<ClassroomState | null>(null);
  const seatGridRef = useRef<HTMLDivElement>(null);
  
  // Modal state for notifications
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    type: NotificationType;
    title: string;
    message: string;
    details?: {
      seatNumber?: string;
      waitlistPosition?: number;
      score?: number;
      courseName?: string;
    };
  }>({
    isOpen: false,
    type: "info",
    title: "",
    message: "",
  });

  const showNotification = useCallback((
    type: NotificationType,
    title: string,
    message: string,
    details?: typeof modalState.details
  ) => {
    setModalState({
      isOpen: true,
      type,
      title,
      message,
      details,
    });
  }, []);

  const closeNotification = useCallback(() => {
    setModalState(prev => ({ ...prev, isOpen: false }));
  }, []);

  // WebSocket connection for real-time updates
  const {
    isConnected,
    subscribeToCourse,
    unsubscribeFromCourse,
    onSeatBooked,
    onSeatReleased,
  } = useRegistrationSocket({
    studentId,
    onConnect: () => console.log("WebSocket connected for bookings"),
    onDisconnect: (reason) => console.log("WebSocket disconnected:", reason),
  });

  // Handle seat booked events from WebSocket
  const handleSeatBooked = useCallback((event: { seatNumber: string; studentId: string; studentName: string }, courseId: string) => {
    console.log("Real-time seat booked:", event, courseId);
    // Update local state to reflect the booking
    if (selectedCourse && classroomState) {
      // Parse seat number to get numeric position
      const match = event.seatNumber.match(/^([A-Z]+)(\d+)$/i);
      if (match) {
        const row = match[1].charCodeAt(0) - 65; // A=0, B=1, etc.
        const col = parseInt(match[2], 10);
        const seatIndex = row * 10 + col; // Assuming 10 seats per row
        
        setClassroomState(prev => {
          if (!prev) return prev;
          const updatedSeats = prev.seats.map(seat => 
            seat.seatNumber === event.seatNumber 
              ? { ...seat, isOccupied: true, studentId: event.studentId, studentName: event.studentName }
              : seat
          );
          return {
            ...prev,
            seats: updatedSeats,
            occupiedSeats: prev.occupiedSeats + 1,
            availableSeats: prev.availableSeats - 1,
          };
        });
      }
    }
  }, [selectedCourse, classroomState]);

  // Handle seat released events from WebSocket
  const handleSeatReleased = useCallback((event: { seatNumber: string; previousStudentId: string }, courseId: string) => {
    console.log("Real-time seat released:", event, courseId);
    if (classroomState) {
      setClassroomState(prev => {
        if (!prev) return prev;
        const updatedSeats = prev.seats.map(seat => 
          seat.seatNumber === event.seatNumber 
            ? { ...seat, isOccupied: false, studentId: undefined, studentName: undefined }
            : seat
        );
        return {
          ...prev,
          seats: updatedSeats,
          occupiedSeats: prev.occupiedSeats - 1,
          availableSeats: prev.availableSeats + 1,
        };
      });
    }
  }, [classroomState]);

  // Set up WebSocket event handlers
  useEffect(() => {
    onSeatBooked(handleSeatBooked);
    onSeatReleased(handleSeatReleased);
  }, [onSeatBooked, onSeatReleased, handleSeatBooked, handleSeatReleased]);

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

      const coursesData = sessionStorage.getItem("recommendedCourses");
      if (coursesData) {
        try {
          const courses = JSON.parse(coursesData);
          setRecommendedCourses(courses);
        } catch {
          router.push("/assistant");
          return;
        }
      } else {
        router.push("/assistant");
        return;
      }

      // Fetch seat data from API
      try {
        const response = await fetch(`${API_BASE_URL}/api/seats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.courses) {
            setSeatsData({ courses: data.courses });
          } else {
            // Fallback to local data
            setSeatsData(seatsDataFallback as { courses: Record<string, CourseSeats> });
          }
        } else {
          // Fallback to local data
          setSeatsData(seatsDataFallback as { courses: Record<string, CourseSeats> });
        }
      } catch {
        // Fallback to local data
        console.log("Using fallback seat data");
        setSeatsData(seatsDataFallback as { courses: Record<string, CourseSeats> });
      }

      setMounted(true);
    };
    
    const timer = setTimeout(initializePage, 0);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (selectedCourse && seatGridRef.current) {
      gsap.fromTo(
        ".desk-row",
        { opacity: 0, y: 10 },
        {
          opacity: 1,
          y: 0,
          duration: 0.3,
          stagger: 0.05,
          ease: "power2.out",
        }
      );
    }
  }, [selectedCourse]);

  const handleCourseClick = async (course: RecommendedCourse) => {
    // Try to fetch fresh classroom state from registration API
    let seatData: CourseSeats | undefined;

    try {
      // Use the new registration API to get classroom state
      const state = await registrationAPI.getClassroomState(course.code);
      setClassroomState(state);
      
      // Subscribe to real-time updates for this course
      subscribeToCourse(course.code);
      
      // Convert classroom state to legacy format for compatibility
      const occupiedSeatNumbers = state.seats
        .filter(s => s.isOccupied)
        .map(s => {
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
        bookingStatus: state.bookingStatus.toLowerCase()
      };
    } catch (error) {
      console.log("Using fallback seat data:", error);
      // Fallback to legacy API
      try {
        const token = sessionStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/seats/course/${course.code}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            seatData = {
              totalSeats: data.totalSeats,
              occupiedSeats: data.occupiedSeats,
              bookingStatus: data.bookingStatus
            };
          }
        }
      } catch {
        console.log("Using cached seat data");
      }
    }

    // Fallback to cached data
    if (!seatData) {
      seatData = seatsData.courses[course.code];
    }
    
    if (!seatData) return;

    if (course.bookingStatus === "closed") {
      return;
    }

    setSelectedCourse({ ...course, seatData });
    setSelectedSeats([]);
  };

  const handleSeatClick = (seatNumber: number) => {
    if (!selectedCourse) return;

    const isOccupied = selectedCourse.seatData.occupiedSeats.includes(seatNumber);
    if (isOccupied) return;

    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((s) => s !== seatNumber);
      }
      return [...prev, seatNumber];
    });
  };

  const handleConfirmBooking = async () => {
    if (!selectedCourse || selectedSeats.length === 0 || isBooking) return;

    setIsBooking(true);

    try {
      // Convert numeric seat positions to seat numbers (e.g., "A5", "B3")
      const seatNumbers = selectedSeats.map(seatNum => {
        const row = Math.floor((seatNum - 1) / 10);
        const col = ((seatNum - 1) % 10) + 1;
        return `${String.fromCharCode(65 + row)}${col}`;
      });

      // Use registration API to book seats
      const bookedSeats: string[] = [];
      for (const seatNumber of seatNumbers) {
        const result = await registrationAPI.bookSeat(studentId, selectedCourse.code, seatNumber);
        
        if (!result.success) {
          // Check if user was added to waitlist instead
          if (result.status === 'WAITLISTED') {
            showNotification(
              "waitlist",
              "Added to Waitlist",
              result.message || "The course is full. You have been added to the waitlist.",
              {
                courseName: selectedCourse.name,
                waitlistPosition: result.waitlistPosition,
                score: result.score,
              }
            );
            setIsBooking(false);
            setSelectedCourse(null);
            setSelectedSeats([]);
            return;
          }
          
          showNotification(
            "error",
            "Booking Failed",
            result.message || `Failed to book seat ${seatNumber}. Please try again.`,
            { courseName: selectedCourse.name }
          );
          setIsBooking(false);
          return;
        }
        bookedSeats.push(seatNumber);
      }

      // Update local seat data
      setSeatsData(prev => ({
        courses: {
          ...prev.courses,
          [selectedCourse.code]: {
            ...prev.courses[selectedCourse.code],
            occupiedSeats: [...(prev.courses[selectedCourse.code]?.occupiedSeats || []), ...selectedSeats]
          }
        }
      }));

      // Unsubscribe from WebSocket updates for this course
      unsubscribeFromCourse(selectedCourse.code);

      showNotification(
        "success",
        "Booking Confirmed!",
        `You have successfully registered for ${selectedCourse.name}.`,
        {
          courseName: selectedCourse.name,
          seatNumber: bookedSeats.join(", "),
        }
      );
      setSelectedCourse(null);
      setSelectedSeats([]);
      setClassroomState(null);
    } catch (error) {
      console.error("Error booking seats:", error);
      // Fallback to legacy API
      try {
        const token = sessionStorage.getItem("authToken");
        const response = await fetch(`${API_BASE_URL}/api/seats/${selectedCourse.code}/book`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            seatNumbers: selectedSeats,
            studentId: studentId
          })
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setSeatsData(prev => ({
            courses: {
              ...prev.courses,
              [selectedCourse.code]: {
                ...prev.courses[selectedCourse.code],
                occupiedSeats: data.updatedConfig.occupiedSeats
              }
            }
          }));

          showNotification(
            "success",
            "Booking Confirmed!",
            `You have successfully booked ${selectedSeats.length} seat(s) for ${selectedCourse.name}.`,
            { courseName: selectedCourse.name }
          );
          setSelectedCourse(null);
          setSelectedSeats([]);
        } else {
          showNotification(
            "error",
            "Booking Failed",
            data.message || "Failed to book seats. Please try again.",
            { courseName: selectedCourse.name }
          );
        }
      } catch {
        // If everything fails, show an error
        showNotification(
          "error",
          "Connection Error",
          "Unable to connect to the server. Please check your connection and try again.",
          { courseName: selectedCourse.name }
        );
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleToggleAutoRegistration = async (courseCode: string) => {
    const newState = !autoRegistration[courseCode];
    const course = recommendedCourses.find(c => c.code === courseCode);
    
    setAutoRegistration((prev) => ({
      ...prev,
      [courseCode]: newState,
    }));

    // If enabling auto-registration, add to waitlist
    if (newState) {
      try {
        const result = await registrationAPI.apply(studentId, courseCode, { autoRegister: true });
        console.log("Auto-registration result:", result);
        
        if (result.success) {
          if (result.status === 'ENROLLED' && result.seatNumber) {
            // Student was immediately enrolled (seat available)
            showNotification(
              "success",
              "Registered Successfully!",
              `You have been automatically registered for ${course?.name || courseCode}.`,
              {
                courseName: course?.name,
                seatNumber: result.seatNumber,
              }
            );
          } else if (result.status === 'WAITLISTED') {
            // Added to waitlist
            showNotification(
              "waitlist",
              "Added to Waitlist",
              `Auto-registration is enabled. You are on the waitlist for ${course?.name || courseCode}.`,
              {
                courseName: course?.name,
                waitlistPosition: result.waitlistPosition,
                score: result.score,
              }
            );
          } else {
            showNotification(
              "info",
              "Auto-Registration Enabled",
              result.message || `Auto-registration is now active for ${courseCode}.`,
              { courseName: course?.name }
            );
          }
        } else {
          showNotification(
            "error",
            "Registration Failed",
            result.message || "Unable to enable auto-registration. Please try again.",
            { courseName: course?.name }
          );
          // Revert the toggle on failure
          setAutoRegistration((prev) => ({
            ...prev,
            [courseCode]: false,
          }));
        }
      } catch (error) {
        console.error("Failed to add to waitlist:", error);
        showNotification(
          "error",
          "Connection Error",
          "Unable to connect to the server. Please try again.",
          { courseName: course?.name }
        );
        // Revert the toggle on failure
        setAutoRegistration((prev) => ({
          ...prev,
          [courseCode]: !newState,
        }));
      }
    } else {
      // Disabling auto-registration
      showNotification(
        "info",
        "Auto-Registration Disabled",
        `Auto-registration has been disabled for ${course?.name || courseCode}.`,
        { courseName: course?.name }
      );
    }
  };

  const getStatusInfo = (course: RecommendedCourse) => {
    const seatData = seatsData.courses[course.code];
    if (!seatData) {
      // Use course data from recommendations if no seat data
      const available = course.totalSeats - course.occupiedSeats;
      if (course.bookingStatus === "closed") {
        return { status: "Booking Closed", available: 0, color: "red" };
      }
      if (course.bookingStatus === "not_started") {
        return { status: "Coming Soon", available, color: "blue" };
      }
      if (available === 0) {
        return { status: "Full - Waitlist", available: 0, color: "yellow" };
      }
      return { status: `${available} seats available`, available, color: "green" };
    }

    const occupiedCount = Array.isArray(seatData.occupiedSeats) ? seatData.occupiedSeats.length : 0;
    const available = seatData.totalSeats - occupiedCount;

    if (seatData.bookingStatus === "closed" || course.bookingStatus === "closed") {
      return { status: "Booking Closed", available: 0, color: "red" };
    }
    if (seatData.bookingStatus === "not_started" || course.bookingStatus === "not_started") {
      return { status: "Coming Soon", available, color: "blue" };
    }
    if (available === 0) {
      return { status: "Full - Waitlist", available: 0, color: "yellow" };
    }
    return { status: `${available} seats available`, available, color: "green" };
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
                onClick={() => router.push("/assistant")}
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/60 hover:bg-gray-100 hover:border-gray-300 transition-all"
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
                    className="text-base font-bold text-gray-900 tracking-tight"
                    style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
                  >
                    Course Bookings
                  </h1>
                  <p 
                    className="text-[10px] text-gray-500 font-medium"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    Select your seats for registration
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* WebSocket Connection Status */}
              <div className={cn(
                "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
                isConnected 
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              )}>
                {isConnected ? (
                  <>
                    <Wifi className="h-3 w-3" />
                    <span>Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Offline</span>
                  </>
                )}
              </div>

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
                    <p className="text-xs text-gray-500">Student</p>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 rounded-xl bg-white backdrop-blur-xl border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden"
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
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-gray-100 border border-gray-300"
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-gray-700 mt-0.5 flex-shrink-0" />
            <div>
              <h3 
                className="text-sm font-semibold text-gray-800 mb-1"
                style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
              >
                How to Book
              </h3>
              <ul 
                className="text-xs text-gray-700/80 space-y-1"
                style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
              >
                <li>• Click on a course to view available desks and select your preferred position</li>
                <li>• For full courses or courses with booking not started, enable Auto-Registration Agent</li>
                <li>• Green desks are available, red desks are occupied, selected desks glow purple</li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Courses Grid */}
        <div className="space-y-4">
          {recommendedCourses.map((course, index) => {
            const statusInfo = getStatusInfo(course);
            const isAutoEnabled = autoRegistration[course.code];
            const canBook = course.bookingStatus === "open" && statusInfo.available > 0;
            const needsAutoReg = course.bookingStatus !== "open" || statusInfo.available === 0;

            return (
              <motion.div
                key={course.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div className="relative rounded-2xl bg-white backdrop-blur-xl border border-gray-200/60 p-6 overflow-hidden shadow-sm hover:shadow-md transition-all">
                  <div className="relative z-10">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                      {/* Course Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-gray-700 to-black text-white font-bold shadow-lg shadow-gray-500/20">
                            {course.priority}
                          </div>
                          <div>
                            <h3 
                              className="text-lg font-semibold text-gray-900"
                              style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                            >
                              {course.code}
                            </h3>
                            <p 
                              className="text-sm text-gray-500"
                              style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                            >
                              {course.name}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "ml-auto lg:ml-4 px-3 py-1 rounded-full text-xs font-semibold border",
                              statusInfo.color === "green" && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              statusInfo.color === "yellow" && "bg-amber-50 text-amber-700 border-amber-200",
                              statusInfo.color === "blue" && "bg-blue-50 text-blue-700 border-blue-200",
                              statusInfo.color === "red" && "bg-red-50 text-red-700 border-red-200"
                            )}
                          >
                            {statusInfo.status}
                          </span>
                        </div>

                        <div 
                          className="flex flex-wrap items-center gap-4 text-sm text-gray-500 ml-13"
                          style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                        >
                          <div className="flex items-center gap-1.5">
                            <BookOpen className="h-4 w-4" />
                            <span>{course.credits} Credits</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Users className="h-4 w-4" />
                            <span>{course.instructor}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4" />
                            <span>{course.schedule}</span>
                          </div>
                        </div>

                        <p className="text-xs text-gray-400 mt-2 italic ml-13">
                          &quot;{course.reason}&quot;
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-3 lg:flex-shrink-0">
                        {canBook ? (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleCourseClick(course)}
                            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white font-medium shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40 transition-all"
                            style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
                          >
                            <Calendar className="h-4 w-4" />
                            Select Desk
                          </motion.button>
                        ) : (
                          <button
                            disabled
                            className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-400 cursor-not-allowed flex items-center gap-2 border border-gray-200"
                          >
                            <X className="h-4 w-4" />
                            Unavailable
                          </button>
                        )}

                        {/* Live View Button */}
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => router.push(`/liveview?course=${course.code}`)}
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                          style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Live View</span>
                        </motion.button>

                        {needsAutoReg && (
                          <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                            <div className="flex items-center gap-2">
                              <Bot className="h-4 w-4 text-gray-700" />
                              <span 
                                className="text-xs text-gray-600 hidden sm:inline"
                                style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                              >
                                Auto-Register
                              </span>
                            </div>
                            <button
                              onClick={() => handleToggleAutoRegistration(course.code)}
                              className={cn(
                                "relative h-6 w-11 rounded-full transition-colors",
                                isAutoEnabled ? "bg-gray-700" : "bg-gray-300"
                              )}
                            >
                              <motion.div
                                className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-lg"
                                animate={{ left: isAutoEnabled ? 24 : 4 }}
                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                              />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Auto-Registration Active Banner */}
                    <AnimatePresence>
                      {isAutoEnabled && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-4 pt-4 border-t border-gray-100"
                        >
                          <div className="flex items-center gap-2 text-sm text-gray-700">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                            >
                              <Sparkles className="h-4 w-4" />
                            </motion.div>
                            <span style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}>
                              Auto-registration agent is monitoring this course. You&apos;ll be registered automatically when a desk becomes available.
                            </span>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Summary Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8"
        >
          <div className="relative rounded-2xl bg-white backdrop-blur-xl border border-gray-200/60 p-6 overflow-hidden shadow-sm">
            <div className="relative z-10">
              <h3 
                className="text-lg font-semibold text-gray-900 mb-4"
                style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
              >
                Booking Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-gray-100 border border-gray-300">
                  <div 
                    className="text-2xl font-bold text-gray-700"
                    style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                  >
                    {recommendedCourses.length}
                  </div>
                  <div 
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    Recommended Courses
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200">
                  <div 
                    className="text-2xl font-bold text-emerald-700"
                    style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                  >
                    {recommendedCourses.filter((c) => c.bookingStatus === "open" && getStatusInfo(c).available > 0).length}
                  </div>
                  <div 
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    Available for Booking
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200">
                  <div 
                    className="text-2xl font-bold text-gray-700"
                    style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                  >
                    {Object.values(autoRegistration).filter(Boolean).length}
                  </div>
                  <div 
                    className="text-sm text-gray-600"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    Auto-Registration Active
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </main>

      {/* Classroom Seat Selection Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
            onClick={() => {
              setSelectedCourse(null);
              setSelectedSeats([]);
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl bg-white border border-gray-200 shadow-2xl"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <div>
                  <h2 
                    className="text-xl font-bold text-gray-900"
                    style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                  >
                    Select Your Desk
                  </h2>
                  <p 
                    className="text-sm text-gray-500"
                    style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                  >
                    {selectedCourse.code} - {selectedCourse.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCourse(null);
                    setSelectedSeats([]);
                  }}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {/* Modal Content - Classroom Layout */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)] bg-gray-50">
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
                <div ref={seatGridRef} className="flex flex-col items-center gap-4">
                  {Array.from(
                    { length: Math.ceil(selectedCourse.seatData.totalSeats / 6) },
                    (_, rowIndex) => {
                      const desksPerRow = 6;
                      const startDesk = rowIndex * desksPerRow + 1;
                      const endDesk = Math.min(
                        (rowIndex + 1) * desksPerRow,
                        selectedCourse.seatData.totalSeats
                      );

                      return (
                        <div
                          key={rowIndex}
                          className="desk-row flex items-center justify-center gap-3"
                        >
                          {Array.from(
                            { length: endDesk - startDesk + 1 },
                            (_, colIndex) => {
                              const deskNumber = startDesk + colIndex;
                              const isOccupied = selectedCourse.seatData.occupiedSeats.includes(deskNumber);
                              const isSelected = selectedSeats.includes(deskNumber);
                              const hasAisle = colIndex === 2;

                              return (
                                <div key={deskNumber} className="flex items-center">
                                  <motion.button
                                    whileHover={!isOccupied ? { scale: 1.05, y: -2 } : undefined}
                                    whileTap={!isOccupied ? { scale: 0.95 } : undefined}
                                    onClick={() => handleSeatClick(deskNumber)}
                                    disabled={isOccupied}
                                    className={cn(
                                      "relative w-14 h-10 rounded-lg transition-all duration-200 shadow-sm",
                                      isOccupied && "bg-gradient-to-b from-red-100 to-red-200 border-2 border-red-300 cursor-not-allowed",
                                      isSelected && "bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-800 shadow-lg shadow-gray-500/40",
                                      !isOccupied && !isSelected && "bg-gradient-to-b from-gray-100 to-gray-200 border-2 border-gray-300 hover:border-gray-500 hover:shadow-md hover:shadow-gray-500/20 cursor-pointer"
                                    )}
                                  >
                                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent" />
                                    
                                    <div 
                                      className={cn(
                                        "absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-3 rounded-b-md",
                                        isOccupied && "bg-red-200",
                                        isSelected && "bg-gray-700",
                                        !isOccupied && !isSelected && "bg-gray-200"
                                      )}
                                    />
                                    
                                    {isOccupied && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <User className="h-4 w-4 text-red-500" />
                                      </div>
                                    )}
                                    
                                    {isSelected && (
                                      <div className="absolute inset-0 flex items-center justify-center">
                                        <Check className="h-4 w-4 text-white" />
                                      </div>
                                    )}
                                  </motion.button>
                                  
                                  {hasAisle && <div className="w-8" />}
                                </div>
                              );
                            }
                          )}
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Back of Classroom */}
                <div className="mt-8 text-center">
                  <span className="text-xs text-gray-400 font-medium tracking-wider">BACK OF CLASSROOM</span>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-gradient-to-b from-gray-100 to-gray-200 border border-gray-300" />
                    <span 
                      className="text-gray-600"
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    >
                      Available
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-gradient-to-b from-red-100 to-red-200 border border-red-300" />
                    <span 
                      className="text-gray-600"
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    >
                      Occupied
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-gradient-to-b from-gray-600 to-gray-700 border border-gray-800" />
                    <span 
                      className="text-gray-600"
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    >
                      Selected
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div 
                  className="flex items-center justify-center gap-6 mt-4 text-sm"
                  style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Total Desks:</span>
                    <span className="font-semibold text-gray-900">{selectedCourse.seatData.totalSeats}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Available:</span>
                    <span className="font-semibold text-emerald-600">
                      {selectedCourse.seatData.totalSeats - selectedCourse.seatData.occupiedSeats.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Selected:</span>
                    <span className="font-semibold text-gray-700">{selectedSeats.length}</span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
                <div>
                  {selectedSeats.length > 0 && (
                    <p 
                      className="text-sm text-gray-600"
                      style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                    >
                      Selected: <span className="text-gray-900 font-medium">{selectedSeats.length} desk(s)</span>
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setSelectedCourse(null);
                      setSelectedSeats([]);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-gray-100 border border-gray-200 text-gray-700 hover:bg-gray-200 transition-all"
                    style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmBooking}
                    disabled={selectedSeats.length === 0 || isBooking}
                    className={cn(
                      "flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white font-medium shadow-lg shadow-gray-500/25 transition-all",
                      (selectedSeats.length === 0 || isBooking) && "opacity-50 cursor-not-allowed"
                    )}
                    style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
                  >
                    {isBooking ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                        />
                        Booking...
                      </>
                    ) : (
                      <>
                        <Check className="h-4 w-4" />
                        Confirm Booking
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* No Courses Warning */}
      {recommendedCourses.length === 0 && mounted && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8"
        >
          <div className="inline-flex flex-col items-center w-full p-8 rounded-2xl bg-white border border-gray-200 shadow-sm">
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3 
              className="text-lg font-semibold text-gray-900 mb-2"
              style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
            >
              No Courses Selected
            </h3>
            <p 
              className="text-sm text-gray-500 mb-4 text-center"
              style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
            >
              Please use the AI Assistant to get course recommendations first.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/assistant")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white font-medium shadow-lg shadow-gray-500/25"
              style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
            >
              <Zap className="h-4 w-4" />
              Go to AI Assistant
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Notification Modal */}
      <NotificationModal
        isOpen={modalState.isOpen}
        onClose={closeNotification}
        type={modalState.type}
        title={modalState.title}
        message={modalState.message}
        details={modalState.details}
      />
    </div>
  );
}
