"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface RecommendedCourse {
  code: string;
  name: string;
  credits: number;
  instructor: string;
  schedule: string;
  priority: number;
  reason: string;
}

interface CourseBookingStatus {
  code: string;
  availableSeats: number;
  totalSeats: number;
  bookingStatus: "open" | "closed" | "not_started";
  waitlistPosition?: number;
  autoRegistrationEnabled: boolean;
}

// Helper function to initialize booking statuses
const initializeBookingStatuses = (courses: RecommendedCourse[]): { [key: string]: CourseBookingStatus } => {
  const statuses: { [key: string]: CourseBookingStatus } = {};
  courses.forEach((course: RecommendedCourse) => {
    // Simulate different booking scenarios
    const scenarios = [
      { available: 5, total: 30, status: "open" as const, waitlist: undefined },
      { available: 0, total: 25, status: "open" as const, waitlist: 3 },
      { available: 12, total: 40, status: "open" as const, waitlist: undefined },
      { available: 0, total: 20, status: "closed" as const, waitlist: 1 },
      { available: 0, total: 35, status: "not_started" as const, waitlist: undefined },
    ];
    const scenario = scenarios[(courses.indexOf(course)) % scenarios.length];
    
    statuses[course.code] = {
      code: course.code,
      availableSeats: scenario.available,
      totalSeats: scenario.total,
      bookingStatus: scenario.status,
      waitlistPosition: scenario.waitlist,
      autoRegistrationEnabled: false,
    };
  });
  return statuses;
};

export default function BookingsPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [bookingStatuses, setBookingStatuses] = useState<{ [key: string]: CourseBookingStatus }>({});

  useEffect(() => {
    // Only run on client side after mount
    const timer = setTimeout(() => {
      // Check if user is logged in
      const data = sessionStorage.getItem("studentData");
      if (!data) {
        router.push("/");
        return;
      }

      // Load recommended courses
      const coursesData = sessionStorage.getItem("recommendedCourses");
      if (coursesData) {
        try {
          const courses = JSON.parse(coursesData);
          setRecommendedCourses(courses);
          setBookingStatuses(initializeBookingStatuses(courses));
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

  // Prevent hydration mismatch - show consistent loading state until client-side is ready
  if (!mounted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const handleManualRegister = (courseCode: string) => {
    // Simulate manual registration
    const status = bookingStatuses[courseCode];
    if (status && status.availableSeats > 0 && status.bookingStatus === "open") {
      setBookingStatuses((prev) => ({
        ...prev,
        [courseCode]: {
          ...prev[courseCode],
          availableSeats: prev[courseCode].availableSeats - 1,
        },
      }));
      alert(`Successfully registered for ${courseCode}!`);
    }
  };

  const handleToggleAutoRegistration = (courseCode: string) => {
    setBookingStatuses((prev) => ({
      ...prev,
      [courseCode]: {
        ...prev[courseCode],
        autoRegistrationEnabled: !prev[courseCode].autoRegistrationEnabled,
      },
    }));
  };

  const getStatusBadge = (status: CourseBookingStatus) => {
    if (status.bookingStatus === "not_started") {
      return (
        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
          Booking Not Started
        </span>
      );
    }
    if (status.bookingStatus === "closed") {
      return (
        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
          Booking Closed
        </span>
      );
    }
    if (status.availableSeats === 0) {
      return (
        <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
          Full - Waitlist Available
        </span>
      );
    }
    return (
      <span className="inline-flex px-2.5 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
        {status.availableSeats} Seats Available
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/assistant")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Course Bookings</h1>
                <p className="text-sm text-gray-600 mt-1">Register for your recommended courses</p>
              </div>
            </div>
            <button
              onClick={() => {
                sessionStorage.removeItem("studentData");
                router.push("/");
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <svg className="h-5 w-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <h3 className="text-sm font-semibold text-blue-900 mb-1">How to Book Courses</h3>
              <ul className="text-xs text-blue-800 space-y-1">
                <li>• <strong>Manual Registration:</strong> Click &quot;Register Now&quot; if seats are available and booking is open</li>
                <li>• <strong>Auto-Registration Agent:</strong> Enable for courses that are full or booking hasn&apos;t started. The agent will automatically register you when seats become available.</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Courses Grid */}
        <div className="space-y-6">
          {recommendedCourses.map((course) => {
            const status = bookingStatuses[course.code];
            if (!status) return null;

            const canManualRegister = status.availableSeats > 0 && status.bookingStatus === "open";

            return (
              <div
                key={course.code}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-white font-bold text-sm">
                          {course.priority}
                        </div>
                        <div>
                          <h2 className="text-xl font-bold text-gray-900">{course.code}</h2>
                          <p className="text-sm text-gray-600">{course.name}</p>
                        </div>
                      </div>
                      <div className="ml-14 space-y-1 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                          <span>{course.credits} Credits</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          <span>{course.instructor}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{course.schedule}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(status)}
                      {status.waitlistPosition && (
                        <p className="text-xs text-gray-600 mt-2">
                          Waitlist Position: <span className="font-semibold">{status.waitlistPosition}</span>
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Course Details */}
                  <div className="mb-4 p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-600 italic">&quot;{course.reason}&quot;</p>
                  </div>

                  {/* Seats Information */}
                  <div className="mb-4 flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Seats:</span>
                      <span className="font-semibold text-gray-900">
                        {status.availableSeats} / {status.totalSeats}
                      </span>
                    </div>
                    <div className="w-32 bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all"
                        style={{ width: `${((status.totalSeats - status.availableSeats) / status.totalSeats) * 100}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-4 pt-4 border-t border-gray-200">
                    {canManualRegister ? (
                      <button
                        onClick={() => handleManualRegister(course.code)}
                        className="flex-1 px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg shadow-lg shadow-green-500/30 hover:from-green-700 hover:to-emerald-700 hover:shadow-xl transition-all flex items-center justify-center gap-2"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Register Now
                      </button>
                    ) : (
                      <button
                        disabled
                        className="flex-1 px-6 py-3 bg-gray-300 text-gray-600 font-semibold rounded-lg cursor-not-allowed flex items-center justify-center gap-2"
                      >
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Manual Registration Unavailable
                      </button>
                    )}

                    <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                        <span className="text-sm font-medium text-gray-700">Auto-Registration Agent</span>
                      </div>
                      <button
                        onClick={() => handleToggleAutoRegistration(course.code)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          status.autoRegistrationEnabled ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            status.autoRegistrationEnabled ? "translate-x-6" : "translate-x-1"
                          }`}
                        />
                      </button>
                    </div>
                  </div>

                  {/* Auto-Registration Status */}
                  {status.autoRegistrationEnabled && (
                    <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-blue-800">
                        <svg className="h-5 w-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        <span className="font-medium">
                          Auto-registration agent is active. You&apos;ll be automatically registered when a seat becomes available or when booking opens.
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary Section */}
        <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Booking Summary</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-sm text-blue-600 font-medium mb-1">Total Courses</div>
              <div className="text-2xl font-bold text-blue-900">{recommendedCourses.length}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-sm text-green-600 font-medium mb-1">Available for Manual Registration</div>
              <div className="text-2xl font-bold text-green-900">
                {Object.values(bookingStatuses).filter(
                  (s) => s.availableSeats > 0 && s.bookingStatus === "open"
                ).length}
              </div>
            </div>
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-sm text-purple-600 font-medium mb-1">Auto-Registration Active</div>
              <div className="text-2xl font-bold text-purple-900">
                {Object.values(bookingStatuses).filter((s) => s.autoRegistrationEnabled).length}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
