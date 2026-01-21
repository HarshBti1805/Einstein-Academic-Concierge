/**
 * useRegistrationSocket Hook
 * 
 * React hook for managing WebSocket connections to the registration system.
 * Provides real-time updates for classroom views.
 */

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:8080';

// Event types from the server
export interface WSMessage {
  type: string;
  courseId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

export interface SeatBookedEvent {
  seatNumber: string;
  studentId: string;
  studentName: string;
}

export interface SeatReleasedEvent {
  seatNumber: string;
  previousStudentId: string;
  newStudentId?: string;
  newStudentName?: string;
  fromWaitlist: boolean;
}

export interface WaitlistUpdatedEvent {
  waitlistSize: number;
  topCandidates: Array<{
    position: number;
    studentId: string;
    score: number;
  }>;
}

export interface BookingStatusChangedEvent {
  status: string;
}

export interface UseRegistrationSocketOptions {
  studentId?: string;
  autoConnect?: boolean;
  onConnect?: () => void;
  onDisconnect?: (reason: string) => void;
  onError?: (error: Error) => void;
}

export interface UseRegistrationSocketReturn {
  isConnected: boolean;
  getSocket: () => Socket | null;
  subscribeToCourse: (courseId: string) => void;
  unsubscribeFromCourse: (courseId: string) => void;
  onSeatBooked: (callback: (event: SeatBookedEvent, courseId: string) => void) => void;
  onSeatReleased: (callback: (event: SeatReleasedEvent, courseId: string) => void) => void;
  onWaitlistUpdated: (callback: (event: WaitlistUpdatedEvent, courseId: string) => void) => void;
  onBookingStatusChanged: (callback: (event: BookingStatusChangedEvent, courseId: string) => void) => void;
  onCourseUpdate: (callback: (message: WSMessage) => void) => void;
}

export function useRegistrationSocket(
  options: UseRegistrationSocketOptions = {}
): UseRegistrationSocketReturn {
  const { studentId, autoConnect = true, onConnect, onDisconnect, onError } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const subscribedCoursesRef = useRef<Set<string>>(new Set());
  const studentIdRef = useRef(studentId);
  
  // Store callbacks in refs to avoid dependency issues
  const onConnectRef = useRef(onConnect);
  const onDisconnectRef = useRef(onDisconnect);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onConnectRef.current = onConnect;
    onDisconnectRef.current = onDisconnect;
    onErrorRef.current = onError;
    studentIdRef.current = studentId;
  }, [onConnect, onDisconnect, onError, studentId]);
  
  // Event callbacks
  const seatBookedCallbackRef = useRef<((event: SeatBookedEvent, courseId: string) => void) | null>(null);
  const seatReleasedCallbackRef = useRef<((event: SeatReleasedEvent, courseId: string) => void) | null>(null);
  const waitlistUpdatedCallbackRef = useRef<((event: WaitlistUpdatedEvent, courseId: string) => void) | null>(null);
  const bookingStatusChangedCallbackRef = useRef<((event: BookingStatusChangedEvent, courseId: string) => void) | null>(null);
  const courseUpdateCallbackRef = useRef<((message: WSMessage) => void) | null>(null);

  // Initialize socket connection - only run once when autoConnect is true
  useEffect(() => {
    if (!autoConnect) return;
    
    // Don't create a new socket if one already exists
    if (socketRef.current) return;

    const socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socketRef.current = socket;

    // Connection events
    socket.on('connect', () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      
      // Authenticate if we have a student ID
      if (studentIdRef.current) {
        socket.emit('authenticate', { studentId: studentIdRef.current });
      }
      
      // Resubscribe to any courses
      subscribedCoursesRef.current.forEach((courseId) => {
        socket.emit('subscribe:course', { courseId });
      });
      
      onConnectRef.current?.();
    });

    socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
      onDisconnectRef.current?.(reason);
    });

    socket.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error);
      onErrorRef.current?.(error);
    });

    // Handle course updates
    socket.on('course:update', (message: WSMessage) => {
      console.log('Course update received:', message);
      
      // Call general course update callback
      courseUpdateCallbackRef.current?.(message);
      
      // Route to specific callbacks based on event type
      switch (message.type) {
        case 'SEAT_BOOKED':
          seatBookedCallbackRef.current?.(
            message.payload as unknown as SeatBookedEvent,
            message.courseId
          );
          break;
          
        case 'SEAT_RELEASED':
          seatReleasedCallbackRef.current?.(
            message.payload as unknown as SeatReleasedEvent,
            message.courseId
          );
          break;
          
        case 'WAITLIST_UPDATED':
          waitlistUpdatedCallbackRef.current?.(
            message.payload as unknown as WaitlistUpdatedEvent,
            message.courseId
          );
          break;
          
        case 'BOOKING_STATUS_CHANGED':
          bookingStatusChangedCallbackRef.current?.(
            message.payload as unknown as BookingStatusChangedEvent,
            message.courseId
          );
          break;
          
        case 'STUDENT_AUTO_ENROLLED':
          // Handle auto-enrollment (seat booked from waitlist)
          seatBookedCallbackRef.current?.(
            message.payload as unknown as SeatBookedEvent,
            message.courseId
          );
          break;
      }
    });

    // Cleanup only when component unmounts
    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [autoConnect]); // Only depend on autoConnect, not callbacks or studentId

  // Subscribe to course updates
  const subscribeToCourse = useCallback((courseId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('subscribe:course', { courseId });
    }
    subscribedCoursesRef.current.add(courseId);
    console.log('Subscribed to course:', courseId);
  }, []);

  // Unsubscribe from course updates
  const unsubscribeFromCourse = useCallback((courseId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('unsubscribe:course', { courseId });
    }
    subscribedCoursesRef.current.delete(courseId);
    console.log('Unsubscribed from course:', courseId);
  }, []);

  // Event callback setters
  const onSeatBooked = useCallback(
    (callback: (event: SeatBookedEvent, courseId: string) => void) => {
      seatBookedCallbackRef.current = callback;
    },
    []
  );

  const onSeatReleased = useCallback(
    (callback: (event: SeatReleasedEvent, courseId: string) => void) => {
      seatReleasedCallbackRef.current = callback;
    },
    []
  );

  const onWaitlistUpdated = useCallback(
    (callback: (event: WaitlistUpdatedEvent, courseId: string) => void) => {
      waitlistUpdatedCallbackRef.current = callback;
    },
    []
  );

  const onBookingStatusChanged = useCallback(
    (callback: (event: BookingStatusChangedEvent, courseId: string) => void) => {
      bookingStatusChangedCallbackRef.current = callback;
    },
    []
  );

  const onCourseUpdate = useCallback(
    (callback: (message: WSMessage) => void) => {
      courseUpdateCallbackRef.current = callback;
    },
    []
  );

  // Getter function for socket (to avoid accessing ref during render)
  const getSocket = useCallback(() => socketRef.current, []);

  return {
    isConnected,
    getSocket,
    subscribeToCourse,
    unsubscribeFromCourse,
    onSeatBooked,
    onSeatReleased,
    onWaitlistUpdated,
    onBookingStatusChanged,
    onCourseUpdate,
  };
}

export default useRegistrationSocket;
