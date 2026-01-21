/**
 * WebSocket Service
 * 
 * Handles real-time communication for live classroom views.
 * Uses Socket.IO for reliable WebSocket connections.
 */

import { Server as SocketIOServer } from 'socket.io';

class WebSocketService {
  constructor(server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        methods: ['GET', 'POST'],
        credentials: true,
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    // Track connected clients
    // socketId -> { studentId, subscribedCourses, joinedAt }
    this.clients = new Map();
    
    // Track course rooms
    // courseId -> Set<socketId>
    this.courseRooms = new Map();

    this.setupEventHandlers();
    console.log('WebSocket service initialized');
  }

  setupEventHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`Client connected: ${socket.id}`);

      // Register client
      this.clients.set(socket.id, {
        socketId: socket.id,
        subscribedCourses: new Set(),
        joinedAt: new Date(),
      });

      // Handle authentication
      socket.on('authenticate', (data) => {
        this.handleAuthenticate(socket, data.studentId);
      });

      // Subscribe to course updates (join classroom view)
      socket.on('subscribe:course', (data) => {
        this.handleSubscribeCourse(socket, data.courseId);
      });

      // Unsubscribe from course
      socket.on('unsubscribe:course', (data) => {
        this.handleUnsubscribeCourse(socket, data.courseId);
      });

      // Request classroom state (will be handled by registration service)
      socket.on('get:classroomState', (data, callback) => {
        socket.emit('ack:classroomState', { courseId: data.courseId });
      });

      // Handle disconnect
      socket.on('disconnect', (reason) => {
        this.handleDisconnect(socket, reason);
      });

      // Send welcome message
      socket.emit('connected', {
        message: 'Connected to registration system',
        socketId: socket.id,
        timestamp: new Date(),
      });
    });
  }

  handleAuthenticate(socket, studentId) {
    const client = this.clients.get(socket.id);
    if (client) {
      client.studentId = studentId;
      console.log(`Client ${socket.id} authenticated as student: ${studentId}`);
      socket.emit('authenticated', { studentId });
    }
  }

  handleSubscribeCourse(socket, courseId) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // Add to client's subscriptions
    client.subscribedCourses.add(courseId);

    // Add to course room
    if (!this.courseRooms.has(courseId)) {
      this.courseRooms.set(courseId, new Set());
    }
    this.courseRooms.get(courseId).add(socket.id);

    // Join Socket.IO room
    socket.join(`course:${courseId}`);

    console.log(`Client ${socket.id} subscribed to course: ${courseId}`);

    socket.emit('subscribed:course', {
      courseId,
      message: `Subscribed to updates for course ${courseId}`,
    });
  }

  handleUnsubscribeCourse(socket, courseId) {
    const client = this.clients.get(socket.id);
    if (!client) return;

    // Remove from client's subscriptions
    client.subscribedCourses.delete(courseId);

    // Remove from course room
    const room = this.courseRooms.get(courseId);
    if (room) {
      room.delete(socket.id);
      if (room.size === 0) {
        this.courseRooms.delete(courseId);
      }
    }

    // Leave Socket.IO room
    socket.leave(`course:${courseId}`);

    console.log(`Client ${socket.id} unsubscribed from course: ${courseId}`);
  }

  handleDisconnect(socket, reason) {
    const client = this.clients.get(socket.id);
    if (client) {
      // Remove from all course rooms
      for (const courseId of client.subscribedCourses) {
        const room = this.courseRooms.get(courseId);
        if (room) {
          room.delete(socket.id);
          if (room.size === 0) {
            this.courseRooms.delete(courseId);
          }
        }
      }
    }

    this.clients.delete(socket.id);
    console.log(`Client disconnected: ${socket.id}, reason: ${reason}`);
  }

  // ==================== PUBLIC BROADCAST METHODS ====================

  /**
   * Broadcast a message to all clients subscribed to a course
   */
  broadcastToCourse(courseId, message) {
    this.io.to(`course:${courseId}`).emit('course:update', message);
    console.log(`Broadcast to course ${courseId}:`, message.type);
  }

  /**
   * Send classroom state to all subscribers
   */
  broadcastClassroomState(courseId, state) {
    this.io.to(`course:${courseId}`).emit('course:classroomState', {
      type: 'CLASSROOM_STATE',
      courseId,
      payload: state,
      timestamp: new Date(),
    });
  }

  /**
   * Send a message to a specific student
   */
  sendToStudent(studentId, message) {
    for (const [socketId, client] of this.clients) {
      if (client.studentId === studentId) {
        this.io.to(socketId).emit('personal:update', message);
      }
    }
  }

  /**
   * Broadcast seat booking event
   */
  broadcastSeatBooked(courseId, seatNumber, studentId, studentName) {
    this.broadcastToCourse(courseId, {
      type: 'SEAT_BOOKED',
      courseId,
      payload: {
        seatNumber,
        studentId,
        studentName,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast seat release event
   */
  broadcastSeatReleased(courseId, seatNumber, previousStudentId, newStudentId, newStudentName) {
    this.broadcastToCourse(courseId, {
      type: 'SEAT_RELEASED',
      courseId,
      payload: {
        seatNumber,
        previousStudentId,
        newStudentId,
        newStudentName,
        fromWaitlist: !!newStudentId,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast waitlist update
   */
  broadcastWaitlistUpdate(courseId, waitlistSize, topCandidates) {
    this.broadcastToCourse(courseId, {
      type: 'WAITLIST_UPDATED',
      courseId,
      payload: {
        waitlistSize,
        topCandidates,
      },
      timestamp: new Date(),
    });
  }

  /**
   * Broadcast booking status change
   */
  broadcastBookingStatusChange(courseId, newStatus) {
    this.broadcastToCourse(courseId, {
      type: 'BOOKING_STATUS_CHANGED',
      courseId,
      payload: { status: newStatus },
      timestamp: new Date(),
    });
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Get count of clients watching a course
   */
  getCourseViewerCount(courseId) {
    return this.courseRooms.get(courseId)?.size || 0;
  }

  /**
   * Get all courses being watched
   */
  getWatchedCourses() {
    return Array.from(this.courseRooms.keys());
  }

  /**
   * Get connected clients count
   */
  getConnectedClientsCount() {
    return this.clients.size;
  }

  /**
   * Get Socket.IO server instance
   */
  getIO() {
    return this.io;
  }
}

export default WebSocketService;
