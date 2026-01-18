"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
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
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { GradientCard } from "@/components/ui/animated-card";
import { GridBackground } from "@/components/ui/background-beams";
import { cn } from "@/lib/utils";

// Import mock data
import seatsData from "@/lib/mock-data/seats.json";

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
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<SelectedCourse | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [autoRegistration, setAutoRegistration] = useState<Record<string, boolean>>({});
  const seatGridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = sessionStorage.getItem("studentData");
      if (!data) {
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

      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (selectedCourse && seatGridRef.current) {
      gsap.fromTo(
        ".seat-row",
        { opacity: 0, x: -20 },
        {
          opacity: 1,
          x: 0,
          duration: 0.3,
          stagger: 0.02,
          ease: "power2.out",
        }
      );
    }
  }, [selectedCourse]);

  const handleCourseClick = (course: RecommendedCourse) => {
    const seatData = (seatsData.courses as Record<string, CourseSeats>)[course.code];
    if (!seatData) return;

    // Check if booking is available
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

  const handleConfirmBooking = () => {
    if (!selectedCourse || selectedSeats.length === 0) return;

    // Simulate booking confirmation
    alert(
      `Successfully booked seat(s) ${selectedSeats.join(", ")} for ${selectedCourse.code}!`
    );
    setSelectedCourse(null);
    setSelectedSeats([]);
  };

  const handleToggleAutoRegistration = (courseCode: string) => {
    setAutoRegistration((prev) => ({
      ...prev,
      [courseCode]: !prev[courseCode],
    }));
  };

  const getStatusInfo = (course: RecommendedCourse) => {
    const seatData = (seatsData.courses as Record<string, CourseSeats>)[course.code];
    if (!seatData) return { status: "unknown", available: 0, color: "zinc" };

    const available = seatData.totalSeats - seatData.occupiedSeats.length;

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
  };

  if (!mounted) {
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      <GridBackground />

      <Header
        title="Course Bookings"
        subtitle="Select your seats for registration"
        showBackButton
        backPath="/assistant"
        userName={studentName}
        userRole="Student"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
        >
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-indigo-400 mt-0.5 flex-shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-indigo-300 mb-1">
                How to Book
              </h3>
              <ul className="text-xs text-indigo-200/70 space-y-1">
                <li>
                  • Click on a course to view available seats and select your
                  preferred position
                </li>
                <li>
                  • For full courses or courses with booking not started, enable
                  Auto-Registration Agent
                </li>
                <li>
                  • Green seats are available, red seats are occupied, selected
                  seats glow green
                </li>
              </ul>
            </div>
          </div>
        </motion.div>

        {/* Courses Grid */}
        <div className="space-y-4">
          {recommendedCourses.map((course, index) => {
            const statusInfo = getStatusInfo(course);
            const isAutoEnabled = autoRegistration[course.code];
            const canBook =
              course.bookingStatus === "open" && statusInfo.available > 0;
            const needsAutoReg =
              course.bookingStatus !== "open" || statusInfo.available === 0;

            return (
              <motion.div
                key={course.code}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <GradientCard>
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    {/* Course Info */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                          {course.priority}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-white">
                            {course.code}
                          </h3>
                          <p className="text-sm text-zinc-400">{course.name}</p>
                        </div>
                        <span
                          className={cn(
                            "ml-auto lg:ml-0 px-3 py-1 rounded-full text-xs font-semibold",
                            statusInfo.color === "green" &&
                              "bg-green-500/10 text-green-400",
                            statusInfo.color === "yellow" &&
                              "bg-yellow-500/10 text-yellow-400",
                            statusInfo.color === "blue" &&
                              "bg-blue-500/10 text-blue-400",
                            statusInfo.color === "red" &&
                              "bg-red-500/10 text-red-400"
                          )}
                        >
                          {statusInfo.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-4 text-sm text-zinc-400 ml-13">
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

                      <p className="text-xs text-zinc-500 mt-2 italic ml-13">
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
                          className="btn-primary flex items-center gap-2"
                        >
                          <Calendar className="h-4 w-4" />
                          Select Seats
                        </motion.button>
                      ) : (
                        <button
                          disabled
                          className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-500 cursor-not-allowed flex items-center gap-2"
                        >
                          <X className="h-4 w-4" />
                          Unavailable
                        </button>
                      )}

                      {/* Auto-Registration Toggle */}
                      {needsAutoReg && (
                        <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
                          <div className="flex items-center gap-2">
                            <Bot className="h-4 w-4 text-zinc-400" />
                            <span className="text-xs text-zinc-400 hidden sm:inline">
                              Auto-Register
                            </span>
                          </div>
                          <button
                            onClick={() =>
                              handleToggleAutoRegistration(course.code)
                            }
                            className={cn(
                              "relative h-6 w-11 rounded-full transition-colors",
                              isAutoEnabled ? "bg-indigo-500" : "bg-zinc-700"
                            )}
                          >
                            <motion.div
                              className="absolute top-1 h-4 w-4 rounded-full bg-white"
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
                        className="mt-4 pt-4 border-t border-white/10"
                      >
                        <div className="flex items-center gap-2 text-sm text-indigo-300">
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
                          <span>
                            Auto-registration agent is monitoring this course.
                            You&apos;ll be registered automatically when a seat
                            becomes available.
                          </span>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </GradientCard>
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
          <GradientCard>
            <h3 className="text-lg font-semibold text-white mb-4">
              Booking Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
                <div className="text-2xl font-bold text-indigo-400">
                  {recommendedCourses.length}
                </div>
                <div className="text-sm text-zinc-400">Recommended Courses</div>
              </div>
              <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20">
                <div className="text-2xl font-bold text-green-400">
                  {
                    recommendedCourses.filter(
                      (c) =>
                        c.bookingStatus === "open" &&
                        getStatusInfo(c).available > 0
                    ).length
                  }
                </div>
                <div className="text-sm text-zinc-400">
                  Available for Booking
                </div>
              </div>
              <div className="p-4 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <div className="text-2xl font-bold text-purple-400">
                  {Object.values(autoRegistration).filter(Boolean).length}
                </div>
                <div className="text-sm text-zinc-400">
                  Auto-Registration Active
                </div>
              </div>
            </div>
          </GradientCard>
        </motion.div>
      </main>

      {/* Seat Selection Modal */}
      <AnimatePresence>
        {selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
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
              className="w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl bg-[#0a0a0f] border border-white/10"
            >
              {/* Modal Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0a0a0f]">
                <div>
                  <h2 className="text-xl font-bold text-white">
                    Select Your Seats
                  </h2>
                  <p className="text-sm text-zinc-400">
                    {selectedCourse.code} - {selectedCourse.name}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCourse(null);
                    setSelectedSeats([]);
                  }}
                  className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                >
                  <X className="h-5 w-5 text-zinc-400" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
                {/* Screen */}
                <div className="mb-8">
                  <div className="screen-curve" />
                  <p className="text-center text-xs text-zinc-500 mt-2 font-medium">
                    FRONT OF CLASSROOM
                  </p>
                </div>

                {/* Seat Grid */}
                <div ref={seatGridRef} className="flex flex-col items-center gap-1.5">
                  {Array.from(
                    { length: Math.ceil(selectedCourse.seatData.totalSeats / 20) },
                    (_, rowIndex) => {
                      const seatsPerRow = 20;
                      const startSeat = rowIndex * seatsPerRow + 1;
                      const endSeat = Math.min(
                        (rowIndex + 1) * seatsPerRow,
                        selectedCourse.seatData.totalSeats
                      );
                      const rowLabel = String.fromCharCode(65 + rowIndex);

                      return (
                        <div
                          key={rowIndex}
                          className="seat-row flex items-center gap-1"
                        >
                          {/* Row Label Left */}
                          <span className="w-6 text-xs font-medium text-zinc-600 text-right">
                            {rowLabel}
                          </span>

                          {/* Seats */}
                          <div className="flex items-center gap-1">
                            {Array.from(
                              { length: endSeat - startSeat + 1 },
                              (_, colIndex) => {
                                const seatNumber = startSeat + colIndex;
                                const isOccupied =
                                  selectedCourse.seatData.occupiedSeats.includes(
                                    seatNumber
                                  );
                                const isSelected =
                                  selectedSeats.includes(seatNumber);
                                const seatInRow = colIndex + 1;
                                const hasAisle =
                                  seatInRow === 5 || seatInRow === 15;

                                return (
                                  <div
                                    key={seatNumber}
                                    className="flex items-center"
                                  >
                                    <motion.button
                                      whileHover={
                                        !isOccupied ? { scale: 1.15 } : undefined
                                      }
                                      whileTap={
                                        !isOccupied ? { scale: 0.9 } : undefined
                                      }
                                      onClick={() => handleSeatClick(seatNumber)}
                                      disabled={isOccupied}
                                      className={cn(
                                        "seat",
                                        isOccupied && "seat-occupied",
                                        isSelected && "seat-selected",
                                        !isOccupied &&
                                          !isSelected &&
                                          "seat-available"
                                      )}
                                      title={`${rowLabel}${seatInRow}`}
                                    />
                                    {hasAisle && <div className="w-3" />}
                                  </div>
                                );
                              }
                            )}
                          </div>

                          {/* Row Label Right */}
                          <span className="w-6 text-xs font-medium text-zinc-600 text-left">
                            {rowLabel}
                          </span>
                        </div>
                      );
                    }
                  )}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-8 mt-8 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="seat seat-available scale-75" />
                    <span className="text-zinc-400">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="seat seat-occupied scale-75" />
                    <span className="text-zinc-400">Occupied</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="seat seat-selected scale-75" />
                    <span className="text-zinc-400">Selected</span>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 mt-4 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Total:</span>
                    <span className="font-semibold text-white">
                      {selectedCourse.seatData.totalSeats}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Available:</span>
                    <span className="font-semibold text-green-400">
                      {selectedCourse.seatData.totalSeats -
                        selectedCourse.seatData.occupiedSeats.length}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-zinc-500">Selected:</span>
                    <span className="font-semibold text-indigo-400">
                      {selectedSeats.length}
                    </span>
                  </div>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="sticky bottom-0 px-6 py-4 border-t border-white/10 bg-[#0a0a0f] flex items-center justify-between">
                <div>
                  {selectedSeats.length > 0 && (
                    <p className="text-sm text-zinc-400">
                      Selected seats:{" "}
                      <span className="text-white font-medium">
                        {selectedSeats
                          .sort((a, b) => a - b)
                          .map((s) => {
                            const row = Math.floor((s - 1) / 20);
                            const col = ((s - 1) % 20) + 1;
                            return `${String.fromCharCode(65 + row)}${col}`;
                          })
                          .join(", ")}
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
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleConfirmBooking}
                    disabled={selectedSeats.length === 0}
                    className={cn(
                      "btn-primary flex items-center gap-2",
                      selectedSeats.length === 0 && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Check className="h-4 w-4" />
                    Confirm Booking
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
          className="mt-8 text-center"
        >
          <div className="inline-flex flex-col items-center p-8 rounded-2xl bg-white/5 border border-white/10">
            <AlertCircle className="h-12 w-12 text-yellow-400 mb-4" />
            <h3 className="text-lg font-semibold text-white mb-2">
              No Courses Selected
            </h3>
            <p className="text-sm text-zinc-400 mb-4">
              Please use the AI Assistant to get course recommendations first.
            </p>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => router.push("/assistant")}
              className="btn-primary flex items-center gap-2"
            >
              <Zap className="h-4 w-4" />
              Go to AI Assistant
            </motion.button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
