/**
 * LiveClassroomView Component
 * 
 * Real-time classroom seat map with WebSocket updates.
 * Shows available/occupied seats and allows booking.
 */

'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRegistrationSocket, ClassroomState, SeatInfo } from '../hooks/useRegistrationSocket';
import { registrationAPI } from '../services/registrationAPI';

interface LiveClassroomViewProps {
  courseId: string;
  studentId: string;
  onSeatBooked?: (seatNumber: string) => void;
}

export function LiveClassroomView({ courseId, studentId, onSeatBooked }: LiveClassroomViewProps) {
  const [initialState, setInitialState] = useState<ClassroomState | null>(null);
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const {
    isConnected,
    classroomState: wsState,
    subscribeToCourse,
    unsubscribeFromCourse,
    lastEvent,
  } = useRegistrationSocket({ studentId });

  // Use WebSocket state if available, otherwise use initial state
  const classroomState = wsState || initialState;

  // Fetch initial classroom state
  useEffect(() => {
    const fetchState = async () => {
      try {
        const state = await registrationAPI.getClassroomState(courseId);
        setInitialState(state);
      } catch (err) {
        setError('Failed to load classroom');
      }
    };
    fetchState();
  }, [courseId]);

  // Subscribe to WebSocket updates
  useEffect(() => {
    if (isConnected) {
      subscribeToCourse(courseId);
    }
    return () => {
      if (isConnected) {
        unsubscribeFromCourse(courseId);
      }
    };
  }, [isConnected, courseId, subscribeToCourse, unsubscribeFromCourse]);

  // Handle seat click
  const handleSeatClick = useCallback((seat: SeatInfo) => {
    if (seat.isOccupied) {
      // Show who's sitting there
      setError(`Seat ${seat.seatNumber} is occupied by ${seat.studentName || 'another student'}`);
      setTimeout(() => setError(null), 3000);
      return;
    }
    setSelectedSeat(seat.seatNumber);
    setError(null);
  }, []);

  // Handle seat booking
  const handleBookSeat = async () => {
    if (!selectedSeat) return;

    setIsBooking(true);
    setError(null);

    try {
      const result = await registrationAPI.bookSeat(studentId, courseId, selectedSeat);

      if (result.success) {
        setSuccessMessage(`Successfully booked seat ${selectedSeat}!`);
        setSelectedSeat(null);
        onSeatBooked?.(selectedSeat);
        
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.message);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to book seat');
    } finally {
      setIsBooking(false);
    }
  };

  // Group seats by row
  const seatsByRow = classroomState?.seats.reduce((acc, seat) => {
    if (!acc[seat.row]) {
      acc[seat.row] = [];
    }
    acc[seat.row].push(seat);
    return acc;
  }, {} as Record<string, SeatInfo[]>) || {};

  const rows = Object.keys(seatsByRow).sort();

  if (!classroomState) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">{classroomState.courseName}</h2>
          <p className="text-gray-500">
            Last updated: {new Date(classroomState.lastUpdated).toLocaleTimeString()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`w-3 h-3 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-600">
            {isConnected ? 'Live' : 'Disconnected'}
          </span>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-green-600">
            {classroomState.availableSeats}
          </div>
          <div className="text-sm text-green-700">Available</div>
        </div>
        <div className="bg-gray-100 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-gray-600">
            {classroomState.occupiedSeats}
          </div>
          <div className="text-sm text-gray-700">Occupied</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <div className="text-3xl font-bold text-blue-600">
            {classroomState.totalSeats}
          </div>
          <div className="text-sm text-blue-700">Total</div>
        </div>
      </div>

      {/* Booking Status */}
      <div className="mb-4">
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            classroomState.bookingStatus === 'OPEN'
              ? 'bg-green-100 text-green-800'
              : classroomState.bookingStatus === 'CLOSED'
              ? 'bg-red-100 text-red-800'
              : 'bg-yellow-100 text-yellow-800'
          }`}
        >
          {classroomState.bookingStatus === 'OPEN'
            ? '🟢 Booking Open'
            : classroomState.bookingStatus === 'CLOSED'
            ? '🔴 Booking Closed'
            : '🟡 Waitlist Only'}
        </span>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}
      {successMessage && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700">
          {successMessage}
        </div>
      )}

      {/* Classroom Layout */}
      <div className="bg-gray-50 rounded-lg p-6 mb-6">
        {/* Whiteboard */}
        <div className="bg-gray-800 text-white text-center py-3 rounded-lg mb-6">
          WHITEBOARD
        </div>

        {/* Teacher's Desk */}
        <div className="bg-yellow-200 text-center py-2 rounded-lg mb-8 mx-auto w-48">
          TEACHER'S DESK
        </div>

        {/* Seats Grid */}
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row} className="flex items-center gap-1">
              <span className="w-6 text-gray-500 text-sm font-medium">{row}</span>
              <div className="flex gap-1 flex-1 justify-center">
                {seatsByRow[row]
                  .sort((a, b) => a.column - b.column)
                  .map((seat) => (
                    <button
                      key={seat.seatNumber}
                      onClick={() => handleSeatClick(seat)}
                      disabled={
                        classroomState.bookingStatus !== 'OPEN' || isBooking
                      }
                      className={`
                        w-10 h-10 rounded-lg flex items-center justify-center text-xs font-medium
                        transition-all duration-200
                        ${
                          seat.isOccupied
                            ? 'bg-gray-800 text-white cursor-not-allowed'
                            : selectedSeat === seat.seatNumber
                            ? 'bg-purple-500 text-white ring-2 ring-purple-300 scale-110'
                            : 'bg-white border-2 border-gray-300 hover:border-green-500 hover:bg-green-50'
                        }
                        ${
                          classroomState.bookingStatus !== 'OPEN'
                            ? 'opacity-50 cursor-not-allowed'
                            : ''
                        }
                      `}
                      title={
                        seat.isOccupied
                          ? `Occupied by ${seat.studentName || 'student'}`
                          : `Seat ${seat.seatNumber} - Click to select`
                      }
                    >
                      {seat.isOccupied ? (
                        <svg
                          className="w-5 h-5"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
                            clipRule="evenodd"
                          />
                        </svg>
                      ) : (
                        seat.column
                      )}
                    </button>
                  ))}
              </div>
              <span className="w-6 text-gray-500 text-sm font-medium">{row}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex justify-center gap-6 mb-6">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-white border-2 border-gray-300 rounded"></div>
          <span className="text-sm">Available</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gray-800 rounded"></div>
          <span className="text-sm">Occupied</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-purple-500 rounded"></div>
          <span className="text-sm">Selected</span>
        </div>
      </div>

      {/* Book Button */}
      {selectedSeat && classroomState.bookingStatus === 'OPEN' && (
        <div className="flex justify-center">
          <button
            onClick={handleBookSeat}
            disabled={isBooking}
            className={`
              px-8 py-3 rounded-lg font-medium text-white
              ${
                isBooking
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-500 hover:bg-green-600'
              }
            `}
          >
            {isBooking ? (
              <span className="flex items-center gap-2">
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
                Booking...
              </span>
            ) : (
              `Book Seat ${selectedSeat}`
            )}
          </button>
        </div>
      )}

      {/* Recent Activity */}
      {lastEvent && (
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-1">Recent Activity</h4>
          <p className="text-sm text-blue-600">
            {lastEvent.type === 'SEAT_BOOKED' && (
              <>
                Seat {lastEvent.payload.seatNumber} was booked by{' '}
                {lastEvent.payload.studentName}
              </>
            )}
            {lastEvent.type === 'SEAT_RELEASED' && (
              <>
                Seat {lastEvent.payload.seatNumber} was released
                {lastEvent.payload.fromWaitlist &&
                  ` and assigned to ${lastEvent.payload.newStudentName}`}
              </>
            )}
            {lastEvent.type === 'STUDENT_ENROLLED' && (
              <>
                {lastEvent.payload.studentName} was enrolled
                {lastEvent.payload.fromWaitlist && ' from waitlist'}
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}

export default LiveClassroomView;
