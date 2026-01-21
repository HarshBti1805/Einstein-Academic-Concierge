/**
 * CourseBookingCard Component
 * 
 * Card for displaying course info with booking options.
 * Includes auto-register toggle for waitlist scenarios.
 */

'use client';

import React, { useState } from 'react';
import { registrationAPI, Course } from '../services/registrationAPI';

interface CourseBookingCardProps {
  course: Course;
  studentId: string;
  priority: number;
  matchReason?: string;
  isEnrolled?: boolean;
  isWaitlisted?: boolean;
  waitlistPosition?: number;
  onAction?: () => void;
}

export function CourseBookingCard({
  course,
  studentId,
  priority,
  matchReason,
  isEnrolled = false,
  isWaitlisted = false,
  waitlistPosition,
  onAction,
}: CourseBookingCardProps) {
  const [autoRegister, setAutoRegister] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    waitlistPosition?: number;
  } | null>(null);

  const handleApply = async () => {
    setIsLoading(true);
    setResult(null);

    try {
      const response = await registrationAPI.applyForCourse(
        studentId,
        course.id,
        { autoRegister }
      );

      setResult({
        success: response.success,
        message: response.message,
        waitlistPosition: response.waitlistPosition,
      });

      onAction?.();
    } catch (err: any) {
      setResult({
        success: false,
        message: err.message || 'Failed to apply',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectDesk = () => {
    // Navigate to live view for manual seat selection
    window.location.href = `/liveview?course=${course.courseId}`;
  };

  const getBookingStatusBadge = () => {
    switch (course.seatConfig.bookingStatus) {
      case 'OPEN':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded-full">
            {course.seatConfig.availableSeats} seats available
          </span>
        );
      case 'CLOSED':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 rounded-full">
            Booking Closed
          </span>
        );
      case 'WAITLIST_ONLY':
        return (
          <span className="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-800 rounded-full">
            Waitlist Only
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-500 text-white rounded-lg flex items-center justify-center font-bold">
              {priority}
            </div>
            <div>
              <h3 className="font-bold text-lg">{course.courseId}</h3>
              <p className="text-gray-600">{course.name}</p>
            </div>
          </div>
          {getBookingStatusBadge()}
        </div>

        {/* Course Info */}
        <div className="space-y-2 mb-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span>{course.category} • {course.difficulty}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span>{course.instructor.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>
              {course.schedule.weekdays.join('/')} {course.schedule.timings.start}-{course.schedule.timings.end}
            </span>
          </div>
        </div>

        {/* Match Reason */}
        {matchReason && (
          <p className="text-sm text-blue-600 italic mb-4">
            "{matchReason}"
          </p>
        )}

        {/* Status Messages */}
        {isEnrolled && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <span className="text-green-700 font-medium">✓ You are enrolled in this course</span>
          </div>
        )}

        {isWaitlisted && waitlistPosition && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <span className="text-yellow-700 font-medium">
              ⏳ Waitlist Position: #{waitlistPosition}
            </span>
          </div>
        )}

        {result && (
          <div
            className={`mb-4 p-3 rounded-lg ${
              result.success
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            <p className="font-medium">{result.message}</p>
            {result.waitlistPosition && (
              <p className="text-sm mt-1">Waitlist position: #{result.waitlistPosition}</p>
            )}
          </div>
        )}

        {/* Action Buttons */}
        {!isEnrolled && !isWaitlisted && (
          <div className="space-y-3">
            {/* Auto-Register Toggle (for closed/waitlist scenarios) */}
            {course.seatConfig.bookingStatus !== 'OPEN' && (
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium text-sm">Auto-Register</span>
                  <p className="text-xs text-gray-500">
                    Automatically register when a seat becomes available
                  </p>
                </div>
                <button
                  onClick={() => setAutoRegister(!autoRegister)}
                  className={`
                    relative w-12 h-6 rounded-full transition-colors
                    ${autoRegister ? 'bg-blue-500' : 'bg-gray-300'}
                  `}
                >
                  <span
                    className={`
                      absolute top-1 w-4 h-4 bg-white rounded-full transition-transform
                      ${autoRegister ? 'left-7' : 'left-1'}
                    `}
                  />
                </button>
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-3">
              {course.seatConfig.bookingStatus === 'OPEN' &&
                course.seatConfig.availableSeats > 0 && (
                  <button
                    onClick={handleSelectDesk}
                    className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Select Desk
                  </button>
                )}

              <button
                onClick={handleSelectDesk}
                className="px-4 py-2 border border-blue-500 text-blue-500 rounded-lg hover:bg-blue-50 font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Live View
              </button>

              {(course.seatConfig.bookingStatus === 'CLOSED' ||
                course.seatConfig.availableSeats === 0) && (
                <button
                  onClick={handleApply}
                  disabled={isLoading}
                  className={`
                    flex-1 px-4 py-2 rounded-lg font-medium flex items-center justify-center gap-2
                    ${
                      isLoading
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-gray-800 text-white hover:bg-gray-700'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                          fill="none"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Joining...
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Join Waitlist
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Waitlist Info */}
        {course.waitlistCount > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <span className="text-sm text-gray-500">
              {course.waitlistCount} student{course.waitlistCount !== 1 ? 's' : ''} on waitlist
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default CourseBookingCard;
