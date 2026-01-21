/**
 * Registration API Service
 * 
 * Client-side API calls for the registration system.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/registration';

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
    bookingStatus: 'CLOSED' | 'OPEN' | 'WAITLIST_ONLY' | 'STARTED' | 'COMPLETED';
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
  lastUpdated: Date;
}

export interface ApplyResult {
  studentId: string;
  courseId: string;
  success: boolean;
  status: 'PENDING' | 'WAITLISTED' | 'ENROLLED' | 'DROPPED' | 'REJECTED';
  message: string;
  waitlistPosition?: number;
  score?: number;
  seatNumber?: string;
}

export interface StudentStatus {
  studentId: string;
  name: string;
  enrolledCourses: Array<{
    courseId: string;
    courseName: string;
    seatNumber: string;
    status: string;
  }>;
  waitlistedCourses: Array<{
    courseId: string;
    courseName: string;
    position: number;
    score: number;
  }>;
  preferences: Array<{
    courseId: string;
    courseName: string;
    priority: number;
    matchReason: string;
  }>;
}

export interface WaitlistInfo {
  courseId: string;
  totalWaitlisted: number;
  entries: Array<{
    position: number;
    studentId: string;
    studentName: string;
    score: number;
    appliedAt: Date;
  }>;
}

export interface CoursePreference {
  courseId: string;
  priority: number;
  matchReason?: string;
}

// API Functions
class RegistrationAPI {
  private baseUrl: string;

  constructor(baseUrl: string = API_URL) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  }

  // ==================== Courses ====================

  /**
   * Get all available courses
   */
  async getCourses(): Promise<Course[]> {
    const response = await this.request<{ success: boolean; data: Course[] }>('/courses');
    return response.data;
  }

  /**
   * Get classroom state (seat map)
   */
  async getClassroomState(courseId: string): Promise<ClassroomState> {
    const response = await this.request<{ success: boolean; data: ClassroomState }>(
      `/classroom/${courseId}`
    );
    return response.data;
  }

  // ==================== Registration ====================

  /**
   * Apply for a course
   */
  async applyForCourse(
    studentId: string,
    courseId: string,
    options: { preferredSeat?: string; autoRegister?: boolean } = {}
  ): Promise<ApplyResult> {
    return this.request<ApplyResult>('/apply', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        courseId,
        ...options,
      }),
    });
  }

  /**
   * Book a specific seat
   */
  async bookSeat(
    studentId: string,
    courseId: string,
    seatNumber: string
  ): Promise<ApplyResult> {
    return this.request<ApplyResult>('/book-seat', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        courseId,
        seatNumber,
      }),
    });
  }

  /**
   * Drop a course
   */
  async dropCourse(
    studentId: string,
    courseId: string
  ): Promise<ApplyResult & { vacancyFilledBy?: any }> {
    return this.request<ApplyResult & { vacancyFilledBy?: any }>('/drop', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        courseId,
      }),
    });
  }

  // ==================== Status ====================

  /**
   * Get student's registration status
   */
  async getStudentStatus(studentId: string): Promise<StudentStatus> {
    const response = await this.request<{ success: boolean; data: StudentStatus }>(
      `/student/${studentId}/status`
    );
    return response.data;
  }

  /**
   * Get course waitlist
   */
  async getWaitlist(courseId: string, limit: number = 10): Promise<WaitlistInfo> {
    const response = await this.request<{ success: boolean; data: WaitlistInfo }>(
      `/waitlist/${courseId}?limit=${limit}`
    );
    return response.data;
  }

  // ==================== Preferences ====================

  /**
   * Set student's course preferences
   */
  async setPreferences(
    studentId: string,
    preferences: CoursePreference[]
  ): Promise<{ success: boolean; message: string }> {
    return this.request('/preferences', {
      method: 'POST',
      body: JSON.stringify({
        studentId,
        preferences,
      }),
    });
  }

  /**
   * Get student's course preferences
   */
  async getPreferences(studentId: string): Promise<any[]> {
    const response = await this.request<{ success: boolean; data: any[] }>(
      `/student/${studentId}/preferences`
    );
    return response.data;
  }

  // ==================== Admin ====================

  /**
   * Open booking for a course
   */
  async openBooking(courseId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/course/${courseId}/open-booking`, {
      method: 'POST',
    });
  }

  /**
   * Close booking for a course
   */
  async closeBooking(courseId: string): Promise<{ success: boolean; message: string }> {
    return this.request(`/course/${courseId}/close-booking`, {
      method: 'POST',
    });
  }
}

// Export singleton instance
export const registrationAPI = new RegistrationAPI();
export default registrationAPI;
