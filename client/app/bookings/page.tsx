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
  Trash2,
  Play,
  Pause,
  Shield,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import WebSocket hook and Registration API
import { useRegistrationSocket } from "@/hooks/useRegistrationSocket";
import {
  registrationAPI,
  ClassroomState,
  SeatInfo,
} from "@/services/registrationAPI";
import NotificationModal, {
  NotificationType,
} from "@/components/ui/NotificationModal";

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
  const [recommendedCourses, setRecommendedCourses] = useState<
    RecommendedCourse[]
  >([]);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(
    null,
  );
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [autoRegistration, setAutoRegistration] = useState<
    Record<string, boolean>
  >({});
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [seatsData, setSeatsData] = useState<{
    courses: Record<string, CourseSeats>;
  }>({ courses: {} });
  const [isBooking, setIsBooking] = useState(false);
  const [classroomState, setClassroomState] = useState<ClassroomState | null>(
    null,
  );
  const seatGridRef = useRef<HTMLDivElement>(null);
  const [enrolledCourses, setEnrolledCourses] = useState<Set<string>>(
    new Set(),
  );
  const [showAdminPanel, setShowAdminPanel] = useState(false);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

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

  const showNotification = useCallback(
    (
      type: NotificationType,
      title: string,
      message: string,
      details?: typeof modalState.details,
    ) => {
      setModalState({
        isOpen: true,
        type,
        title,
        message,
        details,
      });
    },
    [],
  );

  const closeNotification = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
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
  const handleSeatBooked = useCallback(
    (
      event: { seatNumber: string; studentId: string; studentName: string },
      courseId: string,
    ) => {
      console.log("Real-time seat booked:", event, courseId);
      // Update local state to reflect the booking
      if (selectedCourse && classroomState) {
        // Parse seat number to get numeric position
        const match = event.seatNumber.match(/^([A-Z]+)(\d+)$/i);
        if (match) {
          const row = match[1].charCodeAt(0) - 65; // A=0, B=1, etc.
          const col = parseInt(match[2], 10);
          const seatIndex = row * 10 + col; // Assuming 10 seats per row

          setClassroomState((prev) => {
            if (!prev) return prev;
            const updatedSeats = prev.seats.map((seat) =>
              seat.seatNumber === event.seatNumber
                ? {
                    ...seat,
                    isOccupied: true,
                    studentId: event.studentId,
                    studentName: event.studentName,
                  }
                : seat,
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
    },
    [selectedCourse, classroomState],
  );

  // Handle seat released events from WebSocket
  const handleSeatReleased = useCallback(
    (
      event: { seatNumber: string; previousStudentId: string },
      courseId: string,
    ) => {
      console.log("Real-time seat released:", event, courseId);
      if (classroomState) {
        setClassroomState((prev) => {
          if (!prev) return prev;
          const updatedSeats = prev.seats.map((seat) =>
            seat.seatNumber === event.seatNumber
              ? {
                  ...seat,
                  isOccupied: false,
                  studentId: undefined,
                  studentName: undefined,
                }
              : seat,
          );
          return {
            ...prev,
            seats: updatedSeats,
            occupiedSeats: prev.occupiedSeats - 1,
            availableSeats: prev.availableSeats + 1,
          };
        });
      }
    },
    [classroomState],
  );

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
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          if (data.success && data.courses) {
            setSeatsData({ courses: data.courses });
          } else {
            // Fallback to local data
            setSeatsData(
              seatsDataFallback as { courses: Record<string, CourseSeats> },
            );
          }
        } else {
          // Fallback to local data
          setSeatsData(
            seatsDataFallback as { courses: Record<string, CourseSeats> },
          );
        }
      } catch {
        // Fallback to local data
        console.log("Using fallback seat data");
        setSeatsData(
          seatsDataFallback as { courses: Record<string, CourseSeats> },
        );
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
        },
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
      console.log("Using fallback seat data:", error);
      // Fallback to legacy API
      try {
        const token = sessionStorage.getItem("authToken");
        const response = await fetch(
          `${API_BASE_URL}/api/seats/course/${course.code}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          },
        );

        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            seatData = {
              totalSeats: data.totalSeats,
              occupiedSeats: data.occupiedSeats,
              bookingStatus: data.bookingStatus,
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

    const isOccupied =
      selectedCourse.seatData.occupiedSeats.includes(seatNumber);
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
      const seatNumbers = selectedSeats.map((seatNum) => {
        const row = Math.floor((seatNum - 1) / 10);
        const col = ((seatNum - 1) % 10) + 1;
        return `${String.fromCharCode(65 + row)}${col}`;
      });

      // Use registration API to book seats
      const bookedSeats: string[] = [];
      for (const seatNumber of seatNumbers) {
        const result = await registrationAPI.bookSeat(
          studentId,
          selectedCourse.code,
          seatNumber,
        );

        if (!result.success) {
          // Check if user was added to waitlist instead
          if (result.status === "WAITLISTED") {
            showNotification(
              "waitlist",
              "Added to Waitlist",
              result.message ||
                "The course is full. You have been added to the waitlist.",
              {
                courseName: selectedCourse.name,
                waitlistPosition: result.waitlistPosition,
                score: result.score,
              },
            );
            setIsBooking(false);
            setSelectedCourse(null);
            setSelectedSeats([]);
            return;
          }

          showNotification(
            "error",
            "Booking Failed",
            result.message ||
              `Failed to book seat ${seatNumber}. Please try again.`,
            { courseName: selectedCourse.name },
          );
          setIsBooking(false);
          return;
        }
        bookedSeats.push(seatNumber);
      }

      // Update local seat data
      setSeatsData((prev) => ({
        courses: {
          ...prev.courses,
          [selectedCourse.code]: {
            ...prev.courses[selectedCourse.code],
            occupiedSeats: [
              ...(prev.courses[selectedCourse.code]?.occupiedSeats || []),
              ...selectedSeats,
            ],
          },
        },
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
        },
      );
      setSelectedCourse(null);
      setSelectedSeats([]);
      setClassroomState(null);
    } catch (error) {
      console.error("Error booking seats:", error);
      // Fallback to legacy API
      try {
        const token = sessionStorage.getItem("authToken");
        const response = await fetch(
          `${API_BASE_URL}/api/seats/${selectedCourse.code}/book`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              seatNumbers: selectedSeats,
              studentId: studentId,
            }),
          },
        );

        const data = await response.json();

        if (response.ok && data.success) {
          setSeatsData((prev) => ({
            courses: {
              ...prev.courses,
              [selectedCourse.code]: {
                ...prev.courses[selectedCourse.code],
                occupiedSeats: data.updatedConfig.occupiedSeats,
              },
            },
          }));

          showNotification(
            "success",
            "Booking Confirmed!",
            `You have successfully booked ${selectedSeats.length} seat(s) for ${selectedCourse.name}.`,
            { courseName: selectedCourse.name },
          );
          setSelectedCourse(null);
          setSelectedSeats([]);
        } else {
          showNotification(
            "error",
            "Booking Failed",
            data.message || "Failed to book seats. Please try again.",
            { courseName: selectedCourse.name },
          );
        }
      } catch {
        // If everything fails, show an error
        showNotification(
          "error",
          "Connection Error",
          "Unable to connect to the server. Please check your connection and try again.",
          { courseName: selectedCourse.name },
        );
      }
    } finally {
      setIsBooking(false);
    }
  };

  const handleToggleAutoRegistration = async (courseCode: string) => {
    const newState = !autoRegistration[courseCode];
    const course = recommendedCourses.find((c) => c.code === courseCode);

    setAutoRegistration((prev) => ({
      ...prev,
      [courseCode]: newState,
    }));

    // If enabling auto-registration, add to waitlist
    if (newState) {
      try {
        const result = await registrationAPI.apply(studentId, courseCode, {
          autoRegister: true,
        });
        console.log("Auto-registration result:", result);

        if (result.success) {
          if (result.status === "ENROLLED" && result.seatNumber) {
            // Student was immediately enrolled (seat available)
            setEnrolledCourses((prev) => new Set([...prev, courseCode]));

            // Update seat data to reflect the booking
            setSeatsData((prev) => {
              const currentData = prev.courses[courseCode];
              if (currentData) {
                // Parse seat number to get position (e.g., "A5" -> 5)
                const match = result.seatNumber.match(/^([A-Z]+)(\d+)$/i);
                if (match) {
                  const row = match[1].charCodeAt(0) - 65;
                  const col = parseInt(match[2], 10);
                  const seatNum = row * 20 + col;
                  return {
                    courses: {
                      ...prev.courses,
                      [courseCode]: {
                        ...currentData,
                        occupiedSeats: [
                          ...(currentData.occupiedSeats || []),
                          seatNum,
                        ],
                      },
                    },
                  };
                }
              }
              return prev;
            });

            showNotification(
              "success",
              "Registered Successfully!",
              `You have been automatically registered for ${course?.name || courseCode}.`,
              {
                courseName: course?.name,
                seatNumber: result.seatNumber,
              },
            );
          } else if (result.status === "WAITLISTED") {
            // Added to waitlist
            showNotification(
              "waitlist",
              "Added to Waitlist",
              `Auto-registration is enabled. You are on the waitlist for ${course?.name || courseCode}.`,
              {
                courseName: course?.name,
                waitlistPosition: result.waitlistPosition,
                score: result.score,
              },
            );
          } else {
            showNotification(
              "info",
              "Auto-Registration Enabled",
              result.message ||
                `Auto-registration is now active for ${courseCode}.`,
              { courseName: course?.name },
            );
          }
        } else {
          showNotification(
            "error",
            "Registration Failed",
            result.message ||
              "Unable to enable auto-registration. Please try again.",
            { courseName: course?.name },
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
          { courseName: course?.name },
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
        { courseName: course?.name },
      );
    }
  };

  // Drop/Leave a course
  const handleDropCourse = async (courseCode: string) => {
    const course = recommendedCourses.find((c) => c.code === courseCode);
    setIsProcessing(courseCode);

    try {
      const result = await registrationAPI.dropCourse(studentId, courseCode);

      if (result.success) {
        // Remove from enrolled courses
        setEnrolledCourses((prev) => {
          const newSet = new Set(prev);
          newSet.delete(courseCode);
          return newSet;
        });

        // Disable auto-registration
        setAutoRegistration((prev) => ({
          ...prev,
          [courseCode]: false,
        }));

        showNotification(
          "success",
          "Course Dropped",
          `You have successfully dropped ${course?.name || courseCode}.`,
          { courseName: course?.name },
        );
      } else {
        showNotification(
          "error",
          "Drop Failed",
          result.message || "Unable to drop the course. Please try again.",
          { courseName: course?.name },
        );
      }
    } catch (error) {
      console.error("Failed to drop course:", error);
      showNotification(
        "error",
        "Connection Error",
        "Unable to connect to the server. Please try again.",
        { courseName: course?.name },
      );
    } finally {
      setIsProcessing(null);
    }
  };

  // Admin: Open booking for a course
  const handleOpenBooking = async (courseCode: string) => {
    setIsProcessing(courseCode);
    try {
      console.log(`Opening booking for ${courseCode}...`);
      const success = await registrationAPI.openBooking(courseCode);
      console.log(`Open booking result: ${success}`);

      if (success) {
        // Wait a moment for server to process waitlist
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Refresh seat data to show updated state
        try {
          const state = await registrationAPI.getClassroomState(courseCode);
          console.log("New classroom state:", state);

          // Convert seat info to numeric positions
          const occupiedPositions: number[] = [];
          state.seats.forEach((seat) => {
            if (seat.isOccupied) {
              const match = seat.seatNumber.match(/^([A-Z]+)(\d+)$/i);
              if (match) {
                const row = match[1].charCodeAt(0) - 65;
                const col = parseInt(match[2], 10);
                occupiedPositions.push(row * 20 + col);
              }
            }
          });

          setSeatsData((prev) => ({
            courses: {
              ...prev.courses,
              [courseCode]: {
                totalSeats: state.totalSeats,
                occupiedSeats: occupiedPositions,
                bookingStatus: state.bookingStatus,
              },
            },
          }));
        } catch (err) {
          console.error("Failed to refresh seat data:", err);
        }

        showNotification(
          "success",
          "Booking Opened",
          `Booking is now open for ${courseCode}. Waitlisted students have been auto-enrolled.`,
          { courseName: courseCode },
        );
      } else {
        showNotification(
          "error",
          "Failed",
          "Could not open booking. Check server logs.",
        );
      }
    } catch (error) {
      console.error("Failed to open booking:", error);
      showNotification(
        "error",
        "Error",
        "Failed to open booking. Check console for details.",
      );
    } finally {
      setIsProcessing(null);
    }
  };

  // Admin: Close booking for a course
  const handleCloseBooking = async (courseCode: string) => {
    setIsProcessing(courseCode);
    try {
      console.log(`Closing booking for ${courseCode}...`);
      const success = await registrationAPI.closeBooking(courseCode);
      console.log(`Close booking result: ${success}`);

      if (success) {
        // Refresh seat data
        try {
          const state = await registrationAPI.getClassroomState(courseCode);

          // Convert seat info to numeric positions
          const occupiedPositions: number[] = [];
          state.seats.forEach((seat) => {
            if (seat.isOccupied) {
              const match = seat.seatNumber.match(/^([A-Z]+)(\d+)$/i);
              if (match) {
                const row = match[1].charCodeAt(0) - 65;
                const col = parseInt(match[2], 10);
                occupiedPositions.push(row * 20 + col);
              }
            }
          });

          setSeatsData((prev) => ({
            courses: {
              ...prev.courses,
              [courseCode]: {
                totalSeats: state.totalSeats,
                occupiedSeats: occupiedPositions,
                bookingStatus: state.bookingStatus,
              },
            },
          }));
        } catch (err) {
          console.error("Failed to refresh seat data:", err);
        }

        showNotification(
          "info",
          "Bookings Not Yet Open",
          `Bookings have not been opened yet for ${courseCode}. New students will be added to waitlist.`,
          { courseName: courseCode },
        );
      } else {
        showNotification(
          "error",
          "Failed",
          "Could not close booking. Check server logs.",
        );
      }
    } catch (error) {
      console.error("Failed to close booking:", error);
      showNotification(
        "error",
        "Error",
        "Failed to close booking. Check console for details.",
      );
    } finally {
      setIsProcessing(null);
    }
  };

  const getStatusInfo = (course: RecommendedCourse) => {
    const seatData = seatsData.courses[course.code];
    if (!seatData) {
      // Use course data from recommendations if no seat data
      const available = course.totalSeats - course.occupiedSeats;
      if (course.bookingStatus === "closed") {
        return { status: "Not Yet Open", available: 0, color: "red" };
      }
      if (course.bookingStatus === "not_started") {
        return { status: "Coming Soon", available, color: "blue" };
      }
      if (available === 0) {
        return { status: "Full - Waitlist", available: 0, color: "yellow" };
      }
      return {
        status: `${available} seats available`,
        available,
        color: "green",
      };
    }

    const occupiedCount = Array.isArray(seatData.occupiedSeats)
      ? seatData.occupiedSeats.length
      : 0;
    const available = seatData.totalSeats - occupiedCount;

    if (
      seatData.bookingStatus === "closed" ||
      course.bookingStatus === "closed"
    ) {
      return { status: "Not Yet Open", available: 0, color: "red" };
    }
    if (
      seatData.bookingStatus === "not_started" ||
      course.bookingStatus === "not_started"
    ) {
      return { status: "Coming Soon", available, color: "blue" };
    }
    if (available === 0) {
      return { status: "Full - Waitlist", available: 0, color: "yellow" };
    }
    return {
      status: `${available} seats available`,
      available,
      color: "green",
    };
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
          <div className="flex items-center justify-between h-18 py-3">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/assistant")}
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
                  <div className="absolute -inset-1 bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl blur opacity-40" />
                  <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black shadow-lg">
                    <GraduationCap className="h-5 w-5 text-white" />
                  </div>
                </div>
                <div>
                  <h1
                    className="text-xl font-bold text-gray-900 tracking-tight"
                    style={{
                      fontFamily:
                        "var(--font-space-mono), system-ui, sans-serif",
                    }}
                  >
                    COURSE BOOKINGS
                  </h1>
                  <p
                    className="text-[10px] text-gray-500 font-medium uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    Select your seats for registration
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* WebSocket Connection Status */}
              <div
                className={cn(
                  "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all border",
                  isConnected
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200",
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
                  </>
                ) : (
                  <>
                    <WifiOff className="h-3 w-3" />
                    <span>Reconnecting</span>
                  </>
                )}
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2.5 rounded-xl border transition-all group"
                style={{
                  background: "rgba(255, 255, 255, 0.35)",
                  backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255, 255, 255, 0.5)",
                }}
              >
                <Bell className="h-4 w-4 text-gray-600 group-hover:text-gray-900 transition-colors" />
                <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gray-500 opacity-40"></span>
                  <span className="relative inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-gradient-to-br from-gray-700 to-gray-900 text-[9px] font-bold text-white shadow-lg">
                    3
                  </span>
                </span>
              </motion.button>

              <div className="hidden sm:block w-[1px] h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-1" />

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
                  <div className="relative">
                    <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-gray-500/20">
                      {studentName.charAt(0)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-white flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/50" />
                    </div>
                  </div>
                  <div className="hidden sm:block text-left">
                    <p
                      className="text-sm font-semibold text-gray-900 leading-tight"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    >
                      {studentName.split(" ")[0]}
                    </p>
                    <p className="text-[10px] text-gray-600 font-medium">
                      Student
                    </p>
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
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute right-0 mt-2 w-72 rounded-2xl overflow-hidden z-50"
                        style={{
                          background: "rgba(255, 255, 255, 0.9)",
                          backdropFilter: "blur(24px)",
                          border: "1px solid rgba(255, 255, 255, 0.6)",
                          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
                        }}
                      >
                        <div className="p-4 bg-gradient-to-br from-gray-100 to-transparent">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-gray-500/30">
                              {studentName.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p
                                className="text-base font-bold text-gray-900 truncate"
                                style={{
                                  fontFamily:
                                    "var(--font-syne), system-ui, sans-serif",
                                }}
                              >
                                {studentName}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                Course Bookings
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="p-2">
                          {[
                            {
                              icon: User,
                              label: "My Profile",
                              description: "View and edit profile",
                              action: () => {},
                            },
                            {
                              icon: Settings,
                              label: "Settings",
                              description: "Preferences & privacy",
                              action: () => {},
                            },
                          ].map((item, index) => (
                            <motion.button
                              key={item.label}
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
                              sessionStorage.removeItem("recommendedCourses");
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 relative rounded-2xl p-5 overflow-hidden"
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            backdropFilter: "blur(24px) saturate(180%)",
            WebkitBackdropFilter: "blur(24px) saturate(180%)",
            border: "1px solid rgba(255, 255, 255, 0.45)",
            boxShadow:
              "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
          }}
        >
          <div
            className="absolute inset-0 pointer-events-none opacity-60"
            style={{
              background:
                "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.3), transparent 60%)",
            }}
          />
          <div className="relative z-10 flex items-start gap-4">
            <div className="p-3 rounded-xl bg-gray-100 border border-gray-200">
              <Info className="h-5 w-5 text-gray-700 flex-shrink-0" />
            </div>
            <div>
              <h3
                className="text-base font-bold text-gray-900 mb-1"
                style={{
                  fontFamily: "var(--font-syne), system-ui, sans-serif",
                }}
              >
                How to Book
              </h3>
              <ul
                className="text-xs text-gray-600 space-y-1.5 font-medium"
                style={{
                  fontFamily: "var(--font-raleway), system-ui, sans-serif",
                }}
              >
                <li>
                  • Click on a course to view available desks and select your
                  preferred position
                </li>
                <li>
                  • For full courses or courses with booking not started, enable{" "}
                  <span className="font-bold text-gray-900 underline decoration-gray-300">
                    Auto-Registration Agent
                  </span>
                </li>
                <li>
                  • Green desks are available, red desks are occupied, selected
                  desks glow dark gray
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Admin Panel Toggle */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mb-4"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAdminPanel(!showAdminPanel)}
            className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-br from-gray-700 via-gray-800 to-black text-white text-sm shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40 transition-all"
            style={{
              fontFamily: "var(--font-bogita-mono), system-ui, sans-serif",
            }}
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

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {recommendedCourses.map((course) => {
                      const statusInfo = getStatusInfo(course);
                      const isOpen =
                        statusInfo.status !== "Not Yet Open" &&
                        statusInfo.status !== "Coming Soon";

                      return (
                        <div
                          key={`admin-${course.code}`}
                          className="p-4 rounded-xl bg-gray-50/50 border border-gray-200 shadow-sm backdrop-blur-sm group hover:border-gray-300 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <p
                                className="font-bold text-gray-900 text-sm"
                                style={{
                                  fontFamily:
                                    "var(--font-space-mono), system-ui, sans-serif",
                                }}
                              >
                                {course.code}
                              </p>
                              <p className="text-[10px] text-gray-500 font-medium truncate mb-2">
                                {course.name}
                              </p>
                              <span
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider",
                                  isOpen
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : "bg-red-50 text-red-700 border border-red-200",
                                )}
                              >
                                <span
                                  className={cn(
                                    "h-1.5 w-1.5 rounded-full",
                                    isOpen
                                      ? "bg-emerald-500 animate-pulse"
                                      : "bg-red-500",
                                  )}
                                />
                                {isOpen ? "Open" : "Closed"}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 ml-2">
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleOpenBooking(course.code)}
                                disabled={
                                  isProcessing === course.code || isOpen
                                }
                                className={cn(
                                  "p-2.5 rounded-xl transition-all border",
                                  isOpen || isProcessing === course.code
                                    ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-emerald-600 hover:bg-emerald-50 border-emerald-200 shadow-sm",
                                )}
                                title="Open Booking"
                              >
                                {isProcessing === course.code ? (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      duration: 1,
                                      repeat: Infinity,
                                      ease: "linear",
                                    }}
                                    className="h-4 w-4 border-2 border-emerald-300 border-t-emerald-600 rounded-full"
                                  />
                                ) : (
                                  <Play className="h-4 w-4 fill-current" />
                                )}
                              </motion.button>
                              <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => handleCloseBooking(course.code)}
                                disabled={
                                  isProcessing === course.code || !isOpen
                                }
                                className={cn(
                                  "p-2.5 rounded-xl transition-all border",
                                  !isOpen || isProcessing === course.code
                                    ? "bg-gray-100 text-gray-300 border-gray-200 cursor-not-allowed"
                                    : "bg-white text-red-600 hover:bg-red-50 border-red-200 shadow-sm",
                                )}
                                title="Close Booking"
                              >
                                <Pause className="h-4 w-4 fill-current" />
                              </motion.button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Courses Grid */}
        <div className="space-y-4">
          {recommendedCourses.map((course, index) => {
            const statusInfo = getStatusInfo(course);
            const isAutoEnabled = autoRegistration[course.code];
            // Allow booking if there are available seats (backend allows CLOSED and STARTED status now)
            const canBook = statusInfo.available > 0;

            return (
              <motion.div
                key={course.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <div
                  className="relative rounded-2xl p-6 overflow-hidden transition-all"
                  style={{
                    background: "rgba(255, 255, 255, 0.2)",
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                    border: "1px solid rgba(255, 255, 255, 0.45)",
                    boxShadow:
                      "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
                  }}
                >
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
                              style={{
                                fontFamily:
                                  "var(--font-syne), system-ui, sans-serif",
                              }}
                            >
                              {course.code}
                            </h3>
                            <p
                              className="text-sm text-gray-500"
                              style={{
                                fontFamily:
                                  "var(--font-raleway), system-ui, sans-serif",
                              }}
                            >
                              {course.name}
                            </p>
                          </div>
                          <span
                            className={cn(
                              "ml-auto lg:ml-4 px-3 py-1 rounded-full text-xs font-semibold border",
                              statusInfo.color === "green" &&
                                "bg-emerald-50 text-emerald-700 border-emerald-200",
                              statusInfo.color === "yellow" &&
                                "bg-amber-50 text-amber-700 border-amber-200",
                              statusInfo.color === "blue" &&
                                "bg-blue-50 text-blue-700 border-blue-200",
                              statusInfo.color === "red" &&
                                "bg-red-50 text-red-700 border-red-200",
                            )}
                          >
                            {statusInfo.status}
                          </span>
                        </div>

                        <div
                          className="flex flex-wrap items-center gap-4 text-sm text-gray-500 ml-13"
                          style={{
                            fontFamily:
                              "var(--font-manrope), system-ui, sans-serif",
                          }}
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
                            style={{
                              fontFamily:
                                "var(--font-syne), system-ui, sans-serif",
                            }}
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
                          onClick={() =>
                            router.push(`/liveview?course=${course.code}`)
                          }
                          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all"
                          style={{
                            fontFamily:
                              "var(--font-syne), system-ui, sans-serif",
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          <span className="hidden sm:inline">Live View</span>
                        </motion.button>

                        {/* Auto-Register Toggle - always show */}
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gray-50 border border-gray-200">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-gray-700" />
                            <span
                              className="text-xs text-gray-600 hidden sm:inline"
                              style={{
                                fontFamily:
                                  "var(--font-syne), system-ui, sans-serif",
                              }}
                            >
                              Auto-Register
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleToggleAutoRegistration(course.code)
                            }
                            className={cn(
                              "relative h-6 w-11 rounded-full transition-colors",
                              isAutoEnabled ? "bg-emerald-500" : "bg-gray-300",
                            )}
                          >
                            <motion.div
                              className="absolute top-1 h-4 w-4 rounded-full bg-white shadow-lg"
                              animate={{ left: isAutoEnabled ? 24 : 4 }}
                              transition={{
                                type: "spring",
                                stiffness: 500,
                                damping: 30,
                              }}
                            />
                          </button>
                        </div>

                        {/* Drop Course Button */}
                        {(isAutoEnabled ||
                          enrolledCourses.has(course.code)) && (
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleDropCourse(course.code)}
                            disabled={isProcessing === course.code}
                            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all disabled:opacity-50"
                            style={{
                              fontFamily:
                                "var(--font-poppins), system-ui, sans-serif",
                            }}
                          >
                            {isProcessing === course.code ? (
                              <motion.div
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 1,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                className="h-4 w-4 border-2 border-red-300 border-t-red-600 rounded-full"
                              />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">Drop</span>
                          </motion.button>
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
                              transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Sparkles className="h-4 w-4" />
                            </motion.div>
                            <span
                              style={{
                                fontFamily:
                                  "var(--font-raleway), system-ui, sans-serif",
                              }}
                            >
                              Auto-registration agent is monitoring this course.
                              You&apos;ll be registered automatically when a
                              desk becomes available.
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
          <div
            className="relative rounded-2xl p-6 overflow-hidden transition-all group"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.45)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <div
              className="absolute inset-0 pointer-events-none opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.4), transparent 60%)",
              }}
            />
            <div className="relative z-10">
              <h3
                className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2"
                style={{
                  fontFamily: "var(--font-syne), system-ui, sans-serif",
                }}
              >
                <div className="p-1.5 rounded-lg bg-gray-100">
                  <Bot className="h-4 w-4 text-gray-700" />
                </div>
                Registration Summary
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 shadow-sm backdrop-blur-sm">
                  <div
                    className="text-3xl font-bold text-gray-900 mb-1"
                    style={{
                      fontFamily:
                        "var(--font-space-mono), system-ui, sans-serif",
                    }}
                  >
                    {recommendedCourses.length}
                  </div>
                  <div
                    className="text-xs font-bold text-gray-500 uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    Matched Courses
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-100 shadow-sm backdrop-blur-sm">
                  <div
                    className="text-3xl font-bold text-emerald-700 mb-1"
                    style={{
                      fontFamily:
                        "var(--font-space-mono), system-ui, sans-serif",
                    }}
                  >
                    {
                      recommendedCourses.filter(
                        (c) =>
                          c.bookingStatus === "open" &&
                          getStatusInfo(c).available > 0,
                      ).length
                    }
                  </div>
                  <div
                    className="text-xs font-bold text-emerald-600 uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    Directly Available
                  </div>
                </div>
                <div className="p-5 rounded-2xl bg-gray-900 text-white border border-gray-800 shadow-lg backdrop-blur-sm">
                  <div
                    className="text-3xl font-bold text-white mb-1"
                    style={{
                      fontFamily:
                        "var(--font-space-mono), system-ui, sans-serif",
                    }}
                  >
                    {Object.values(autoRegistration).filter(Boolean).length}
                  </div>
                  <div
                    className="text-xs font-bold text-gray-400 uppercase tracking-wider"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
                  >
                    Agents Active
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
              className="w-full max-w-4xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl"
              style={{
                background: "rgba(255, 255, 255, 0.95)",
                backdropFilter: "blur(24px)",
                border: "1px solid rgba(255, 255, 255, 0.6)",
                boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              }}
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white">
                <div>
                  <h2
                    className="text-xl font-bold text-gray-900"
                    style={{
                      fontFamily: "var(--font-syne), system-ui, sans-serif",
                    }}
                  >
                    Select Your Desk
                  </h2>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    }}
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
                  className="flex flex-col items-center gap-4"
                >
                  {Array.from(
                    {
                      length: Math.ceil(selectedCourse.seatData.totalSeats / 6),
                    },
                    (_, rowIndex) => {
                      const desksPerRow = 6;
                      const startDesk = rowIndex * desksPerRow + 1;
                      const endDesk = Math.min(
                        (rowIndex + 1) * desksPerRow,
                        selectedCourse.seatData.totalSeats,
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
                              const isOccupied =
                                selectedCourse.seatData.occupiedSeats.includes(
                                  deskNumber,
                                );
                              const isSelected =
                                selectedSeats.includes(deskNumber);
                              const hasAisle = colIndex === 2;

                              return (
                                <div
                                  key={deskNumber}
                                  className="flex items-center"
                                >
                                  <motion.button
                                    whileHover={
                                      !isOccupied
                                        ? { scale: 1.05, y: -2 }
                                        : undefined
                                    }
                                    whileTap={
                                      !isOccupied ? { scale: 0.95 } : undefined
                                    }
                                    onClick={() => handleSeatClick(deskNumber)}
                                    disabled={isOccupied}
                                    className={cn(
                                      "relative w-14 h-10 rounded-lg transition-all duration-200 shadow-sm",
                                      isOccupied &&
                                        "bg-gradient-to-b from-red-100 to-red-200 border-2 border-red-300 cursor-not-allowed",
                                      isSelected &&
                                        "bg-gradient-to-b from-gray-600 to-gray-700 border-2 border-gray-800 shadow-lg shadow-gray-500/40",
                                      !isOccupied &&
                                        !isSelected &&
                                        "bg-gradient-to-b from-gray-100 to-gray-200 border-2 border-gray-300 hover:border-gray-500 hover:shadow-md hover:shadow-gray-500/20 cursor-pointer",
                                    )}
                                  >
                                    <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent" />

                                    <div
                                      className={cn(
                                        "absolute -bottom-2 left-1/2 -translate-x-1/2 w-6 h-3 rounded-b-md",
                                        isOccupied && "bg-red-200",
                                        isSelected && "bg-gray-700",
                                        !isOccupied &&
                                          !isSelected &&
                                          "bg-gray-200",
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
                            },
                          )}
                        </div>
                      );
                    },
                  )}
                </div>

                {/* Back of Classroom */}
                <div className="mt-8 text-center">
                  <span className="text-xs text-gray-400 font-medium tracking-wider">
                    BACK OF CLASSROOM
                  </span>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mt-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-gradient-to-b from-gray-100 to-gray-200 border border-gray-300" />
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
                    <div className="w-8 h-6 rounded bg-gradient-to-b from-red-100 to-red-200 border border-red-300" />
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
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-6 rounded bg-gradient-to-b from-gray-600 to-gray-700 border border-gray-800" />
                    <span
                      className="text-gray-600"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    >
                      Selected
                    </span>
                  </div>
                </div>

                {/* Stats */}
                <div
                  className="flex items-center justify-center gap-6 mt-4 text-sm"
                  style={{
                    fontFamily: "var(--font-manrope), system-ui, sans-serif",
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Total Desks:</span>
                    <span className="font-semibold text-gray-900">
                      {selectedCourse.seatData.totalSeats}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Available:</span>
                    <span className="font-semibold text-emerald-600">
                      {selectedCourse.seatData.totalSeats -
                        selectedCourse.seatData.occupiedSeats.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">Selected:</span>
                    <span className="font-semibold text-gray-700">
                      {selectedSeats.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 px-6 py-4 border-t border-gray-100 bg-white flex items-center justify-between">
                <div>
                  {selectedSeats.length > 0 && (
                    <p
                      className="text-sm text-gray-600"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    >
                      Selected:{" "}
                      <span className="text-gray-900 font-medium">
                        {selectedSeats.length} desk(s)
                      </span>
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
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
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
                      (selectedSeats.length === 0 || isBooking) &&
                        "opacity-50 cursor-not-allowed",
                    )}
                    style={{
                      fontFamily: "var(--font-poppins), system-ui, sans-serif",
                    }}
                  >
                    {isBooking ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
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
          <div
            className="inline-flex flex-col items-center w-full p-8 rounded-2xl"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(24px)",
              border: "1px solid rgba(255, 255, 255, 0.45)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.1), inset 0 1px 0 rgba(255,255,255,0.5)",
            }}
          >
            <AlertCircle className="h-12 w-12 text-amber-500 mb-4" />
            <h3
              className="text-lg font-semibold text-gray-900 mb-2"
              style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
            >
              No Courses Selected
            </h3>
            <p
              className="text-sm text-gray-500 mb-4 text-center"
              style={{
                fontFamily: "var(--font-raleway), system-ui, sans-serif",
              }}
            >
              Please use the AI Assistant to get course recommendations first.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/assistant")}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white font-medium shadow-lg shadow-gray-500/25"
              style={{
                fontFamily: "var(--font-poppins), system-ui, sans-serif",
              }}
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
