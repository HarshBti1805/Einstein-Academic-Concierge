/**
 * Registration API Service
 * 
 * Client-side API wrapper for the course registration system.
 */

// Build API URL - ensure proper formatting
const getApiUrl = () => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
  // Remove trailing slash if present
  return `${baseUrl.replace(/\/$/, '')}/api/registration`;
};

const API_URL = getApiUrl();

// Types
export interface Course {
  id: string;
  courseId: string;
  name: string;
  category: string;
  difficulty: string;
  instructor: {
    name: string;
    email: string;
  };
  schedule: {
    weekdays: string[];
    timings: { start: string; end: string };
  };
  classroomNumber: string;
  minGpaRecommended: number;
  prerequisites: string[];
  seatConfig: {
    totalSeats: number;
    availableSeats: number;
    occupiedSeats: number;
    bookingStatus: string;
  };
  waitlistCount: number;
}

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
  bookingStatus: string;
  seats: SeatInfo[];
  lastUpdated: string;
}

export interface WaitlistEntry {
  position: number;
  studentId: string;
  studentName: string;
  score: number;
  appliedAt: string;
}

export interface ApplyResult {
  studentId: string;
  courseId: string;
  success: boolean;
  status: string;
  message: string;
  waitlistPosition?: number;
  score?: number;
  seatNumber?: string;
}

export interface CoursePreference {
  priority: number;
  matchReason?: string;
  course: {
    id: string;
    courseId: string;
    name: string;
    instructor: string;
    availableSeats: number;
    totalSeats: number;
    bookingStatus: string;
  };
}

// API Functions
export const registrationAPI = {
  /**
   * Get all courses with seat availability
   */
  async getCourses(): Promise<Course[]> {
    const response = await fetch(`${API_URL}/courses`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch courses');
    }
    return data.data;
  },

  /**
   * Get classroom state for a course
   */
  async getClassroomState(courseId: string): Promise<ClassroomState> {
    const response = await fetch(`${API_URL}/classroom/${courseId}`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch classroom state');
    }
    return data.data;
  },

  /**
   * Apply for a course
   */
  async apply(
    studentId: string,
    courseId: string,
    options?: { preferredSeat?: string; autoRegister?: boolean }
  ): Promise<ApplyResult> {
    const response = await fetch(`${API_URL}/apply`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        studentId,
        courseId,
        ...options,
      }),
    });
    const data = await response.json();
    return data;
  },

  /**
   * Book a specific seat
   */
  async bookSeat(
    studentId: string,
    courseId: string,
    seatNumber: string
  ): Promise<ApplyResult> {
    const response = await fetch(`${API_URL}/book-seat`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        studentId,
        courseId,
        seatNumber,
      }),
    });
    const data = await response.json();
    return data;
  },

  /**
   * Drop a course
   */
  async dropCourse(studentId: string, courseId: string): Promise<ApplyResult> {
    const response = await fetch(`${API_URL}/drop`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        studentId,
        courseId,
      }),
    });
    const data = await response.json();
    return data;
  },

  /**
   * Get waitlist for a course
   */
  async getWaitlist(courseId: string, limit = 10): Promise<{
    courseId: string;
    totalWaitlisted: number;
    entries: WaitlistEntry[];
  }> {
    const response = await fetch(
      `${API_URL}/waitlist/${courseId}?limit=${limit}`,
      { headers: getAuthHeaders() }
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch waitlist');
    }
    return data.data;
  },

  /**
   * Get student status
   */
  async getStudentStatus(studentId: string): Promise<{
    studentId: string;
    name: string;
    enrolledCourses: Array<{
      courseId: string;
      courseName: string;
      seatNumber?: string;
      status: string;
    }>;
    waitlistedCourses: Array<{
      courseId: string;
      courseName: string;
      position?: number;
      score?: number;
    }>;
    preferences: Array<{
      courseId: string;
      courseName: string;
      priority: number;
      matchReason?: string;
    }>;
  }> {
    const response = await fetch(`${API_URL}/student/${studentId}/status`, {
      headers: getAuthHeaders(),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch student status');
    }
    return data.data;
  },

  /**
   * Get student's course preferences
   */
  async getPreferences(studentId: string): Promise<CoursePreference[]> {
    const response = await fetch(
      `${API_URL}/student/${studentId}/preferences`,
      { headers: getAuthHeaders() }
    );
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to fetch preferences');
    }
    return data.data;
  },

  /**
   * Set student's course preferences
   */
  async setPreferences(
    studentId: string,
    preferences: Array<{
      courseId: string;
      priority: number;
      matchReason?: string;
    }>
  ): Promise<void> {
    const response = await fetch(`${API_URL}/preferences`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({
        studentId,
        preferences,
      }),
    });
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Failed to save preferences');
    }
  },

  /**
   * Open booking for a course (admin)
   */
  async openBooking(courseId: string): Promise<boolean> {
    const response = await fetch(
      `${API_URL}/course/${courseId}/open-booking`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    const data = await response.json();
    return data.success;
  },

  /**
   * Close booking for a course (admin)
   */
  async closeBooking(courseId: string): Promise<boolean> {
    const response = await fetch(
      `${API_URL}/course/${courseId}/close-booking`,
      {
        method: 'POST',
        headers: getAuthHeaders(),
      }
    );
    const data = await response.json();
    return data.success;
  },
};

// Helper to get auth headers
function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' 
    ? sessionStorage.getItem('authToken') 
    : null;
  
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default registrationAPI;
