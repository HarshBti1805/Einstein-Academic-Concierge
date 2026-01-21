/**
 * useRegistrationSocket Hook
 * 
 * React hook for connecting to the registration WebSocket server.
 * Provides real-time updates for classroom state, seat bookings, etc.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

export interface SeatInfo {
  seatNumber: string;
  row: string;
  column: number;
  isOccupied: boolean;
  studentId?: string;
  studentName?: string;
}

export interface ClassroomState {
  courseId: string;
  courseName: string;
  totalSeats: number;
  availableSeats: number;
  occupiedSeats: number;
  bookingStatus: 'CLOSED' | 'OPEN' | 'WAITLIST_ONLY' | 'STARTED' | 'COMPLETED';
  seats: SeatInfo[];
  lastUpdated: Date;
}

export interface WaitlistEntry {
  position: number;
  studentId: string;
  score: number;
}

export interface WSMessage {
  type: string;
  courseId: string;
  payload: any;
  timestamp: Date;
}

interface UseRegistrationSocketOptions {
  studentId?: string;
  autoConnect?: boolean;
}

interface UseRegistrationSocketReturn {
  isConnected: boolean;
  classroomState: ClassroomState | null;
  waitlistUpdates: WaitlistEntry[];
  lastEvent: WSMessage | null;
  subscribeToCourse: (courseId: string) => void;
  unsubscribeFromCourse: (courseId: string) => void;
  error: string | null;
}

export function useRegistrationSocket(
  options: UseRegistrationSocketOptions = {}
): UseRegistrationSocketReturn {
  const { studentId, autoConnect = true } = options;
  
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [classroomState, setClassroomState] = useState<ClassroomState | null>(null);
  const [waitlistUpdates, setWaitlistUpdates] = useState<WaitlistEntry[]>([]);
  const [lastEvent, setLastEvent] = useState<WSMessage | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Connect to WebSocket server
  useEffect(() => {
    if (!autoConnect) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected:', socket.id);
      setIsConnected(true);
      setError(null);

      // Authenticate if studentId provided
      if (studentId) {
        socket.emit('authenticate', { studentId });
      }
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });

    socket.on('connect_error', (err) => {
      console.error('WebSocket connection error:', err);
      setError('Connection failed. Retrying...');
    });

    // Server events
    socket.on('connected', (data) => {
      console.log('Server welcome:', data);
    });

    socket.on('authenticated', (data) => {
      console.log('Authenticated:', data);
    });

    socket.on('subscribed:course', (data) => {
      console.log('Subscribed to course:', data);
    });

    // Course updates
    socket.on('course:update', (message: WSMessage) => {
      console.log('Course update:', message);
      setLastEvent(message);
      handleCourseUpdate(message);
    });

    socket.on('course:classroomState', (message: WSMessage) => {
      if (message.payload) {
        setClassroomState(message.payload);
      }
    });

    // Personal updates (for the logged-in student)
    socket.on('personal:update', (message: WSMessage) => {
      console.log('Personal update:', message);
      setLastEvent(message);
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect, studentId]);

  // Handle different types of course updates
  const handleCourseUpdate = useCallback((message: WSMessage) => {
    switch (message.type) {
      case 'SEAT_BOOKED':
        setClassroomState((prev) => {
          if (!prev) return prev;
          const { seatNumber, studentId, studentName } = message.payload;
          return {
            ...prev,
            availableSeats: prev.availableSeats - 1,
            occupiedSeats: prev.occupiedSeats + 1,
            seats: prev.seats.map((seat) =>
              seat.seatNumber === seatNumber
                ? { ...seat, isOccupied: true, studentId, studentName }
                : seat
            ),
            lastUpdated: new Date(message.timestamp),
          };
        });
        break;

      case 'SEAT_RELEASED':
        setClassroomState((prev) => {
          if (!prev) return prev;
          const { seatNumber, newStudentId, newStudentName, fromWaitlist } = message.payload;
          
          if (fromWaitlist && newStudentId) {
            // Seat was immediately filled from waitlist
            return {
              ...prev,
              seats: prev.seats.map((seat) =>
                seat.seatNumber === seatNumber
                  ? { ...seat, isOccupied: true, studentId: newStudentId, studentName: newStudentName }
                  : seat
              ),
              lastUpdated: new Date(message.timestamp),
            };
          } else {
            // Seat is now available
            return {
              ...prev,
              availableSeats: prev.availableSeats + 1,
              occupiedSeats: prev.occupiedSeats - 1,
              seats: prev.seats.map((seat) =>
                seat.seatNumber === seatNumber
                  ? { ...seat, isOccupied: false, studentId: undefined, studentName: undefined }
                  : seat
              ),
              lastUpdated: new Date(message.timestamp),
            };
          }
        });
        break;

      case 'WAITLIST_UPDATED':
        setWaitlistUpdates(message.payload.topCandidates || []);
        break;

      case 'BOOKING_STATUS_CHANGED':
        setClassroomState((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            bookingStatus: message.payload.status,
            lastUpdated: new Date(message.timestamp),
          };
        });
        break;

      case 'STUDENT_ENROLLED':
        // Handle new enrollment (similar to SEAT_BOOKED)
        break;

      default:
        console.log('Unknown event type:', message.type);
    }
  }, []);

  // Subscribe to a course's updates
  const subscribeToCourse = useCallback((courseId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:course', { courseId });
    }
  }, []);

  // Unsubscribe from a course
  const unsubscribeFromCourse = useCallback((courseId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:course', { courseId });
    }
  }, []);

  return {
    isConnected,
    classroomState,
    waitlistUpdates,
    lastEvent,
    subscribeToCourse,
    unsubscribeFromCourse,
    error,
  };
}

export default useRegistrationSocket;
