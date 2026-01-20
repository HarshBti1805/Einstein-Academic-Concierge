import prisma from "../db.js";

// In-memory session storage for chat conversations
// In production, use Redis or database
const chatSessions = new Map();

/**
 * Start a new chat session for a student
 */
export const startChat = async (req, res) => {
  try {
    const { student_id } = req.body;
    
    if (!student_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Student ID is required" 
      });
    }

    // Fetch student data for personalized greeting
    const student = await prisma.student.findUnique({
      where: { studentId: student_id },
      include: {
        academic: {
          include: { subjects: true }
        },
        behavioral: true,
        dashboard: {
          include: {
            semesterProgress: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    // Initialize chat session
    const sessionData = {
      student_id,
      studentName: student.name,
      gpa: student.academic?.overallGpa || 0,
      branch: student.branch,
      yearOfStudy: student.yearOfStudy,
      interests: [],
      preferences: {},
      conversationHistory: [],
      canRecommend: false
    };

    chatSessions.set(student_id, sessionData);

    const firstName = student.name.split(' ')[0];
    const greeting = `Hey ${firstName}! Ready to figure out your courses for next semester?\n\nI can see you're studying ${student.branch} in Year ${student.yearOfStudy} with a GPA of ${student.academic?.overallGpa || 'N/A'}. What's been on your mind - any subjects you're excited about or maybe some scheduling preferences?`;

    res.json({
      success: true,
      message: greeting,
      student: {
        name: student.name,
        branch: student.branch,
        yearOfStudy: student.yearOfStudy,
        gpa: student.academic?.overallGpa
      }
    });

  } catch (error) {
    console.error("Start chat error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

/**
 * Process a chat message and generate response
 */
export const sendMessage = async (req, res) => {
  try {
    const { student_id, message } = req.body;

    if (!student_id || !message) {
      return res.status(400).json({ 
        success: false, 
        message: "Student ID and message are required" 
      });
    }

    let session = chatSessions.get(student_id);
    
    if (!session) {
      // Create new session if not exists
      const student = await prisma.student.findUnique({
        where: { studentId: student_id }
      });

      if (!student) {
        return res.status(404).json({ 
          success: false, 
          message: "Student not found" 
        });
      }

      session = {
        student_id,
        studentName: student.name,
        gpa: 0,
        branch: student.branch,
        yearOfStudy: student.yearOfStudy,
        interests: [],
        preferences: {},
        conversationHistory: [],
        canRecommend: false
      };
      chatSessions.set(student_id, session);
    }

    // Add user message to history
    session.conversationHistory.push({ role: 'user', content: message });

    // Analyze message and extract preferences
    const lowerMessage = message.toLowerCase();
    
    // Extract interests from message
    const techKeywords = ['programming', 'coding', 'software', 'tech', 'ai', 'machine learning', 'data', 'web', 'app'];
    const businessKeywords = ['business', 'management', 'finance', 'marketing', 'entrepreneur'];
    const scienceKeywords = ['science', 'physics', 'chemistry', 'biology', 'math', 'research'];
    const artKeywords = ['art', 'design', 'creative', 'music', 'film'];

    if (techKeywords.some(k => lowerMessage.includes(k))) {
      session.interests.push('technology');
    }
    if (businessKeywords.some(k => lowerMessage.includes(k))) {
      session.interests.push('business');
    }
    if (scienceKeywords.some(k => lowerMessage.includes(k))) {
      session.interests.push('science');
    }
    if (artKeywords.some(k => lowerMessage.includes(k))) {
      session.interests.push('arts');
    }

    // Extract schedule preferences
    if (lowerMessage.includes('morning')) {
      session.preferences.timePreference = 'morning';
    } else if (lowerMessage.includes('afternoon') || lowerMessage.includes('evening')) {
      session.preferences.timePreference = 'afternoon';
    }

    // Generate response based on context
    let response = generateConversationalResponse(lowerMessage, session);

    // Add agent response to history
    session.conversationHistory.push({ role: 'agent', content: response });

    // Determine if enough info gathered for recommendations
    if (session.conversationHistory.length >= 4 || session.interests.length >= 1) {
      session.canRecommend = true;
    }

    chatSessions.set(student_id, session);

    res.json({
      success: true,
      response,
      can_recommend: session.canRecommend
    });

  } catch (error) {
    console.error("Send message error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

/**
 * Generate course recommendations based on conversation
 */
export const getRecommendations = async (req, res) => {
  try {
    const { student_id } = req.body;

    if (!student_id) {
      return res.status(400).json({ 
        success: false, 
        message: "Student ID is required" 
      });
    }

    const session = chatSessions.get(student_id);

    // Fetch student with academic data
    const student = await prisma.student.findUnique({
      where: { studentId: student_id },
      include: {
        academic: true,
        enrollments: {
          include: { course: true }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    // Get all available courses with seat info
    const courses = await prisma.course.findMany({
      include: {
        instructor: true,
        seatConfig: true
      }
    });

    // Get already enrolled course IDs
    const enrolledCourseIds = student.enrollments.map(e => e.course.courseId);

    // Filter and score courses
    const recommendations = courses
      .filter(course => !enrolledCourseIds.includes(course.courseId))
      .map((course, index) => {
        let score = 50; // Base score

        // Score based on GPA recommendation
        const studentGpa = student.academic?.overallGpa || 3.0;
        if (studentGpa >= course.minGpaRecommended) {
          score += 20;
        }

        // Score based on interests (from session)
        if (session?.interests) {
          const categoryLower = course.category.toLowerCase();
          if (session.interests.includes('technology') && 
              (categoryLower.includes('computer') || categoryLower.includes('tech') || categoryLower.includes('data'))) {
            score += 30;
          }
          if (session.interests.includes('business') && 
              (categoryLower.includes('business') || categoryLower.includes('management'))) {
            score += 30;
          }
        }

        // Generate reason based on course
        let reason = generateRecommendationReason(course, student, session);

        return {
          code: course.courseId,
          name: course.name,
          credits: 3, // Default credits
          instructor: course.instructor?.name || "TBA",
          schedule: formatSchedule(course.schedule),
          priority: index + 1,
          reason,
          totalSeats: course.seatConfig?.totalSeats || 30,
          occupiedSeats: course.seatConfig?.occupiedSeats?.length || 0,
          bookingStatus: course.seatConfig?.bookingStatus || "open",
          score
        };
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((course, index) => ({
        ...course,
        priority: index + 1
      }));

    const message = "Based on our conversation, I've put together some courses that I think you'd really enjoy! I've considered your interests, your academic standing, and seat availability. Take a look below - you can reorder them by your preference, then head to bookings to secure your spot.";

    res.json({
      success: true,
      message,
      recommendations
    });

  } catch (error) {
    console.error("Get recommendations error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

/**
 * Get student context for chat (academic data, dashboard data)
 */
export const getStudentContext = async (req, res) => {
  try {
    const { student_id } = req.params;

    const student = await prisma.student.findUnique({
      where: { studentId: student_id },
      include: {
        academic: {
          include: { subjects: true }
        },
        behavioral: true,
        dashboard: {
          include: {
            weeklyActivity: true,
            semesterProgress: true,
            upcomingDeadlines: true,
            achievements: true
          }
        },
        enrollments: {
          include: { course: true }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ 
        success: false, 
        message: "Student not found" 
      });
    }

    res.json({
      success: true,
      context: {
        student: {
          name: student.name,
          branch: student.branch,
          yearOfStudy: student.yearOfStudy,
          gpa: student.academic?.overallGpa,
          attendance: student.academic?.attendancePercentage,
          totalCredits: student.academic?.totalCredits
        },
        subjects: student.academic?.subjects || [],
        enrolledCourses: student.enrollments.map(e => e.course.courseId),
        achievements: student.dashboard?.achievements || []
      }
    });

  } catch (error) {
    console.error("Get student context error:", error);
    res.status(500).json({ 
      success: false, 
      message: "Server error" 
    });
  }
};

// Helper functions

function generateConversationalResponse(input, session) {
  if (input.includes("register") || input.includes("enroll") || input.includes("book")) {
    return "Oh you're ready to register? That's great! Before we jump into that, tell me - what kind of classes are you hoping for? More hands-on stuff or lecture-based?";
  }
  if (input.includes("schedule") || input.includes("time") || input.includes("when") || input.includes("morning") || input.includes("afternoon")) {
    return "Got it, schedule matters! Are you more of a morning person or do you prefer afternoon/evening classes? Also, any days you need to keep free?";
  }
  if (input.includes("prerequisite") || input.includes("required") || input.includes("need")) {
    return "Prerequisites can be tricky! Don't worry, I'll make sure any courses I suggest you're actually eligible for. What subjects are you most interested in exploring?";
  }
  if (input.includes("gpa") || input.includes("grade") || input.includes("performance")) {
    return `Your GPA of ${session.gpa || 'your current standing'} looks good! What matters more to you - keeping that GPA up with easier courses, or challenging yourself a bit?`;
  }
  if (input.includes("waitlist") || input.includes("full") || input.includes("available")) {
    return "Yeah some popular courses fill up fast! I can help you find good alternatives too. What area are you most interested in?";
  }
  if (input.includes("help") || input.includes("what can you do")) {
    return "I'm here to help you find courses that actually fit what you want! Just chat with me about your interests, schedule preferences, career goals - whatever's on your mind. What should we start with?";
  }
  if (input.includes("programming") || input.includes("coding") || input.includes("software") || input.includes("tech")) {
    return "Nice, tech stuff! Are you looking for more theory-heavy courses or do you prefer building actual projects? Also, any specific area like AI, web dev, or something else?";
  }
  if (input.includes("business") || input.includes("management") || input.includes("finance")) {
    return "Business track, cool! Are you thinking more entrepreneurship vibes or corporate/finance path? That'll help me figure out what fits.";
  }
  if (input.includes("art") || input.includes("design") || input.includes("creative")) {
    return "Creative stuff is awesome! Digital or traditional? And do you prefer studio-based classes or more theory?";
  }

  const casualResponses = [
    "Interesting! Tell me more about that - what specifically draws you to it?",
    "Cool, I can work with that! Anything else you're considering or any dealbreakers I should know about?",
    "Got it! So if you could design your perfect semester, what would it look like?",
    "Makes sense! What's your ideal balance - challenging courses vs ones where you can cruise a bit?"
  ];
  
  return casualResponses[Math.floor(Math.random() * casualResponses.length)];
}

function generateRecommendationReason(course, student, session) {
  const reasons = [];
  
  if (course.category) {
    reasons.push(`Great fit for ${course.category} track`);
  }
  
  if (course.instructor?.toughnessRating === 'moderate') {
    reasons.push('well-balanced workload');
  }
  
  if (session?.interests?.length > 0) {
    reasons.push('matches your interests');
  }
  
  if (course.skillsDeveloped?.length > 0) {
    reasons.push(`develops ${course.skillsDeveloped[0]}`);
  }

  return reasons.length > 0 
    ? reasons.slice(0, 2).join(' and ') 
    : 'Recommended based on your profile';
}

function formatSchedule(schedule) {
  if (!schedule) return "TBA";
  try {
    const s = typeof schedule === 'string' ? JSON.parse(schedule) : schedule;
    if (s.weekdays && s.timings) {
      return `${s.weekdays.join(', ')} ${s.timings.start}-${s.timings.end}`;
    }
    return "TBA";
  } catch {
    return "TBA";
  }
}
