"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

interface RecommendedCourse {
  code: string;
  name: string;
  credits: number;
  instructor: string;
  schedule: string;
  priority: number;
  reason: string;
}

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-0",
      text: "Hello! I'm your course registration assistant. I can help you find and register for courses based on your academic goals, prerequisites, and personal constraints. How can I assist you today?",
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<RecommendedCourse | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounterRef = useRef<number>(1);
  const recommendationsShownRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if user is logged in
    const data = sessionStorage.getItem("studentData");
    if (!data) {
      router.push("/");
    }
  }, [router]);

  useEffect(() => {
    // Auto-scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim()) return;

    const userMessageId = `msg-${messageIdCounterRef.current++}`;
    const userMessage: Message = {
      id: userMessageId,
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputMessage("");
    setIsTyping(true);

    // Simulate agent response (in real app, this would be an API call)
    setTimeout(() => {
      const agentResponse = generateAgentResponse(inputMessage);
      const agentMessageId = `msg-${messageIdCounterRef.current++}`;
      const agentMessage: Message = {
        id: agentMessageId,
        text: agentResponse,
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsTyping(false);

      // After a few messages (user + agent pairs), show course recommendations
      if (updatedMessages.length >= 4 && !recommendationsShownRef.current) {
        recommendationsShownRef.current = true;
        setTimeout(() => {
          generateCourseRecommendations();
        }, 2000);
      }
    }, 1500);
  };

  const generateAgentResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    if (lowerInput.includes("register") || lowerInput.includes("enroll") || lowerInput.includes("book")) {
      return "I'd be happy to help you register for courses! Could you tell me:\n\n1. Which courses are you interested in?\n2. What's your preferred schedule (e.g., no classes before 10am)?\n3. Are there any prerequisites I should consider?\n\nBased on your academic history, I can suggest an optimal schedule that fits your requirements.";
    }

    if (lowerInput.includes("schedule") || lowerInput.includes("time") || lowerInput.includes("when")) {
      return "I can help you find courses that fit your schedule! Here are some options:\n\n• **Morning Classes (8am-12pm)**: CS301, MATH205\n• **Afternoon Classes (12pm-4pm)**: CS302, PHYS201, ENG101\n• **Evening Classes (4pm-8pm)**: CS303\n\nWhat time constraints do you have? I can filter courses accordingly.";
    }

    if (lowerInput.includes("prerequisite") || lowerInput.includes("required") || lowerInput.includes("need")) {
      return "Let me check your prerequisites:\n\n✅ **CS301** (Data Structures) - Requires: CS201 (Completed)\n✅ **CS302** (Database Systems) - Requires: CS201 (Completed)\n✅ **MATH205** (Calculus II) - Requires: MATH204 (Completed)\n✅ **CS303** (Software Engineering) - Requires: CS301, CS302 (In Progress)\n\nAll prerequisites are satisfied! Would you like me to proceed with registration?";
    }

    if (lowerInput.includes("gpa") || lowerInput.includes("grade") || lowerInput.includes("performance")) {
      return "Based on your current GPA of 3.65, you're doing great! Here's my analysis:\n\n📊 **Current Performance**:\n• Strong in CS courses (A, A-)\n• Good performance in Math (B+)\n• Excellent attendance (87.5%)\n\n💡 **Recommendations**:\n• Consider advanced CS courses to maintain your strong performance\n• You're on track for graduation in Spring 2026\n• Would you like me to suggest courses that align with your strengths?";
    }

    if (lowerInput.includes("waitlist") || lowerInput.includes("full") || lowerInput.includes("available")) {
      return "I can monitor waitlists for you! Here's the current status:\n\n📋 **Course Availability**:\n• CS301: 5 spots available ✅\n• CS302: Waitlist (Position 3) - I'm monitoring this\n• MATH205: 12 spots available ✅\n• CS303: Waitlist (Position 1) - High chance of enrollment\n\nI'll automatically register you when spots open. Would you like me to add you to any waitlists?";
    }

    if (lowerInput.includes("help") || lowerInput.includes("what can you do")) {
      return "I'm here to help with your course registration! Here's what I can do:\n\n🎯 **My Capabilities**:\n• Find courses based on your goals and constraints\n• Check prerequisites and course availability\n• Monitor waitlists and auto-register when spots open\n• Optimize your schedule to avoid conflicts\n• Answer questions about courses, professors, and requirements\n• Run 'what-if' scenarios to test different schedules\n\nWhat would you like to do?";
    }

    return "I understand you're asking about: \"" + userInput + "\". Let me help you with that. Could you provide a bit more detail? For example:\n\n• Are you looking to register for specific courses?\n• Do you have schedule constraints?\n• Are you checking prerequisites or availability?\n\nI'm here to make your course registration as smooth as possible!";
  };

  const quickActions = [
    { text: "Show available courses", icon: "📚" },
    { text: "Check my prerequisites", icon: "✅" },
    { text: "Find courses by schedule", icon: "🕐" },
    { text: "Monitor waitlists", icon: "👀" },
  ];

  const handleQuickAction = (action: string) => {
    setInputMessage(action);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const generateCourseRecommendations = () => {
    // Sample recommended courses based on grades and discussion
    const courses: RecommendedCourse[] = [
      {
        code: "CS401",
        name: "Advanced Algorithms",
        credits: 3,
        instructor: "Dr. Sarah Johnson",
        schedule: "Mon, Wed 10:00 AM - 11:30 AM",
        priority: 1,
        reason: "Strong performance in CS courses (A, A-) suggests readiness for advanced topics"
      },
      {
        code: "CS402",
        name: "Machine Learning Fundamentals",
        credits: 3,
        instructor: "Dr. Michael Chen",
        schedule: "Tue, Thu 2:00 PM - 3:30 PM",
        priority: 2,
        reason: "Aligns with your interest in data structures and strong CS foundation"
      },
      {
        code: "CS403",
        name: "Cloud Computing",
        credits: 3,
        instructor: "Dr. Emily Rodriguez",
        schedule: "Mon, Wed 1:00 PM - 2:30 PM",
        priority: 3,
        reason: "Builds on your database systems knowledge and industry-relevant skills"
      },
      {
        code: "MATH301",
        name: "Linear Algebra",
        credits: 4,
        instructor: "Dr. James Wilson",
        schedule: "Tue, Thu 11:00 AM - 12:30 PM",
        priority: 4,
        reason: "Prerequisite for advanced CS courses, complements your Calculus II background"
      },
      {
        code: "CS404",
        name: "Web Development",
        credits: 3,
        instructor: "Dr. David Kim",
        schedule: "Fri 9:00 AM - 12:00 PM",
        priority: 5,
        reason: "Practical skills course, fits your schedule and complements software engineering"
      }
    ];

    setRecommendedCourses(courses);
    setShowRecommendations(true);

    // Add recommendation message
    const recommendationMessageId = `msg-${messageIdCounterRef.current++}`;
    const recommendationMessage: Message = {
      id: recommendationMessageId,
      text: "Based on our discussion and your academic performance (GPA: 3.65), I've identified 5 courses that would be an excellent fit for you. You can review and prioritize them below, then proceed to the bookings page to register.",
      sender: "agent",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, recommendationMessage]);
  };

  const handlePriorityChange = (courseCode: string, newPriority: number) => {
    setRecommendedCourses((prev) => {
      const updated = [...prev];
      const courseIndex = updated.findIndex((c) => c.code === courseCode);
      if (courseIndex !== -1) {
        // Swap priorities
        const oldPriority = updated[courseIndex].priority;
        const swapIndex = updated.findIndex((c) => c.priority === newPriority);
        if (swapIndex !== -1) {
          updated[swapIndex].priority = oldPriority;
        }
        updated[courseIndex].priority = newPriority;
      }
      return updated.sort((a, b) => a.priority - b.priority);
    });
  };

  const handleGoToBookings = () => {
    // Store recommended courses in sessionStorage
    sessionStorage.setItem("recommendedCourses", JSON.stringify(recommendedCourses));
    router.push("/bookings");
  };

  const handleCourseClick = (course: RecommendedCourse) => {
    setSelectedCourse(course);
    setSelectedSeats([]);
    // Set default date to today
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
    setSelectedDate(dateStr);
  };

  const handleSeatClick = (seatNumber: number) => {
    setSelectedSeats((prev) => {
      if (prev.includes(seatNumber)) {
        return prev.filter((s) => s !== seatNumber);
      } else {
        return [...prev, seatNumber];
      }
    });
  };

  const getSeatStatus = (seatNumber: number): "available" | "reserved" | "selected" => {
    if (selectedSeats.includes(seatNumber)) {
      return "selected";
    }
    // Simulate some reserved seats (random for demo)
    const reservedSeats = [3, 7, 12, 18, 25, 30, 35, 42];
    if (reservedSeats.includes(seatNumber)) {
      return "reserved";
    }
    return "available";
  };

  const generateDates = () => {
    const dates = [];
    const today = new Date();
    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      dates.push({
        day: date.toLocaleDateString('en-US', { weekday: 'short' }),
        number: date.getDate(),
        full: date.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' }),
      });
    }
    return dates;
  };

  const generateTimeSlots = () => {
    return [
      "8:00 AM", "9:00 AM", "10:00 AM", "11:00 AM", "11:30 AM",
      "12:00 PM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM", "5:00 PM"
    ];
  };

  const handleContinueBooking = () => {
    if (selectedSeats.length === 0) {
      alert("Please select at least one seat");
      return;
    }
    if (!selectedDate) {
      alert("Please select a date");
      return;
    }
    if (!selectedTime) {
      alert("Please select a time");
      return;
    }
    // Store booking info and proceed
    alert(`Booking confirmed for ${selectedCourse?.code}!\nSeats: ${selectedSeats.join(", ")}\nDate: ${selectedDate}\nTime: ${selectedTime}`);
    setSelectedCourse(null);
    setSelectedSeats([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Course Registration Assistant</h1>
                <p className="text-sm text-gray-600 mt-1">Powered by Einstein Copilot</p>
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
        {/* Course Recommendations Section */}
        {showRecommendations && recommendedCourses.length > 0 && (
          <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Recommended Courses</h2>
                <p className="text-sm text-gray-600 mt-1">Based on your grades and our discussion</p>
              </div>
              <button
                onClick={handleGoToBookings}
                className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transition-all flex items-center gap-2"
              >
                Go to Bookings
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            <div className="space-y-3">
              {recommendedCourses.map((course) => (
                <div
                  key={course.code}
                  onClick={() => handleCourseClick(course)}
                  className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="flex flex-col items-center justify-center w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg text-white font-bold">
                      {course.priority}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-gray-900">{course.code}</h3>
                        <span className="text-sm text-gray-600">-</span>
                        <span className="text-sm text-gray-700">{course.name}</span>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                        <span>{course.credits} Credits</span>
                        <span>•</span>
                        <span>{course.instructor}</span>
                        <span>•</span>
                        <span>{course.schedule}</span>
                      </div>
                      <p className="text-xs text-gray-600 mt-1 italic">{course.reason}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handlePriorityChange(course.code, Math.max(1, course.priority - 1))}
                      disabled={course.priority === 1}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move up"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handlePriorityChange(course.code, Math.min(5, course.priority + 1))}
                      disabled={course.priority === 5}
                      className="p-1.5 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      title="Move down"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Seat Selection Modal */}
        {selectedCourse && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Choose Seat</h2>
                  <p className="text-sm text-gray-600 mt-1">{selectedCourse.code} - {selectedCourse.name}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedCourse(null);
                    setSelectedSeats([]);
                    setSelectedDate("");
                    setSelectedTime("");
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* Screen Indicator */}
                <div className="relative">
                  <div className="h-1 bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-400 rounded-full"></div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xs font-semibold text-gray-700 bg-white px-3">Screen</span>
                  </div>
                </div>

                {/* Seat Grid */}
                <div className="space-y-2">
                  {Array.from({ length: 7 }, (_, rowIndex) => (
                    <div key={rowIndex} className="flex items-center justify-center gap-2">
                      <span className="text-xs font-semibold text-gray-500 w-6">{String.fromCharCode(65 + rowIndex)}</span>
                      <div className="flex gap-2">
                        {Array.from({ length: 8 }, (_, colIndex) => {
                          const seatNumber = rowIndex * 8 + colIndex + 1;
                          const status = getSeatStatus(seatNumber);
                          return (
                            <button
                              key={seatNumber}
                              onClick={() => handleSeatClick(seatNumber)}
                              disabled={status === "reserved"}
                              className={`
                                w-10 h-10 rounded-t-lg transition-all
                                ${status === "available" 
                                  ? "bg-gray-100 border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50" 
                                  : status === "reserved"
                                  ? "bg-gray-400 border-2 border-gray-500 cursor-not-allowed"
                                  : "bg-blue-500 border-2 border-blue-600 shadow-lg scale-105"
                                }
                              `}
                              title={`Seat ${String.fromCharCode(65 + rowIndex)}${colIndex + 1}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-100 border-2 border-gray-300"></div>
                    <span className="text-gray-700">Available</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-gray-400 border-2 border-gray-500"></div>
                    <span className="text-gray-700">Reserved</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded bg-blue-500 border-2 border-blue-600"></div>
                    <span className="text-gray-700">Selected</span>
                  </div>
                </div>

                {/* Date Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Date</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent">
                    {generateDates().map((date, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedDate(date.full)}
                        className={`
                          flex-shrink-0 px-4 py-3 rounded-xl font-semibold transition-all
                          ${selectedDate === date.full
                            ? "bg-blue-500 text-white shadow-lg scale-105"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }
                        `}
                      >
                        <div className="text-xs">{date.day}</div>
                        <div className="text-lg">{date.number}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">Select Time</h3>
                  <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                    {generateTimeSlots().map((time, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedTime(time)}
                        className={`
                          flex-shrink-0 px-4 py-3 rounded-xl font-semibold transition-all
                          ${selectedTime === time
                            ? "bg-blue-500 text-white shadow-lg scale-105"
                            : "bg-gray-800 text-gray-300 hover:bg-gray-700"
                          }
                        `}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Continue Button */}
                <button
                  onClick={handleContinueBooking}
                  disabled={selectedSeats.length === 0 || !selectedDate || !selectedTime}
                  className="w-full py-4 bg-blue-500 text-white font-bold text-lg rounded-xl shadow-lg hover:bg-blue-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-500"
                >
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6 h-[calc(100vh-12rem)] min-h-0">
          {/* Left Side - Quick Actions & Input */}
          <div className="lg:col-span-1 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-w-0">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
              <p className="text-sm text-gray-600 mt-1">Select a quick action or type your message</p>
            </div>

            {/* Quick Actions */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gray-50 flex-1 overflow-y-auto min-h-0">
              <div className="space-y-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.text)}
                    className="w-full text-left inline-flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-blue-50 hover:border-blue-400 hover:text-blue-700 transition-all shadow-sm hover:shadow-md"
                  >
                    <span className="text-lg sm:text-xl flex-shrink-0">{action.icon}</span>
                    <span className="flex-1 min-w-0 truncate">{action.text}</span>
                    <svg className="h-4 w-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input Area */}
            <div className="p-4 sm:p-6 border-t border-gray-200 bg-white flex-shrink-0">
              <form onSubmit={handleSendMessage} className="space-y-3 sm:space-y-4">
                <div className="relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 pr-10 sm:pr-12 text-sm sm:text-base text-gray-900 bg-gray-50 border border-gray-300 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    rows={3}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (inputMessage.trim() && !isTyping) {
                          handleSendMessage(e);
                        }
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isTyping}
                    className="absolute bottom-2.5 sm:bottom-3 right-2.5 sm:right-3 p-1.5 sm:p-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                    title="Send message"
                  >
                    <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Press <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Enter</kbd> to send, <kbd className="px-1.5 py-0.5 bg-gray-200 rounded text-xs">Shift+Enter</kbd> for new line
                </p>
              </form>
            </div>
          </div>

          {/* Right Side - Chat Area */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col min-w-0 overflow-hidden">
            {/* Chat Header */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative flex-shrink-0">
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                      <svg className="h-5 w-5 sm:h-6 sm:w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <div className="absolute bottom-0 right-0 h-3 w-3 bg-green-500 rounded-full border-2 border-white"></div>
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Einstein Copilot</h2>
                    <p className="text-xs text-gray-600 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse flex-shrink-0"></span>
                      <span className="truncate">Online and ready to help</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Display */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4 sm:space-y-6 bg-gradient-to-b from-gray-50 to-white min-h-0">
              {messages.map((message, index) => {
                const isUser = message.sender === "user";
                const showAvatar = index === 0 || messages[index - 1].sender !== message.sender;
                
                return (
                  <div
                    key={message.id}
                    className={`flex gap-2 sm:gap-3 min-w-0 ${isUser ? "flex-row-reverse" : "flex-row"}`}
                  >
                    {/* Avatar */}
                    {showAvatar && (
                      <div className="flex-shrink-0">
                        {isUser ? (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center shadow-md">
                            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        ) : (
                          <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                            <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* Message Bubble */}
                    <div className={`flex flex-col min-w-0 flex-1 ${isUser ? "items-end" : "items-start"} ${!showAvatar ? (isUser ? "mr-10 sm:mr-11" : "ml-10 sm:ml-11") : ""}`}>
                      <div
                        className={`w-full max-w-[85%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2 sm:py-3 shadow-sm ${
                          isUser
                            ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-br-sm"
                            : "bg-white text-gray-900 border border-gray-200 rounded-bl-sm"
                        }`}
                      >
                        <div className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words overflow-wrap-anywhere" style={{ wordBreak: "break-word", overflowWrap: "anywhere" }}>{message.text}</div>
                      </div>
                      <div className={`text-xs mt-1 sm:mt-1.5 px-1 ${isUser ? "text-gray-500" : "text-gray-400"}`}>
                        {message.timestamp.toLocaleTimeString("en-US", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex gap-2 sm:gap-3 min-w-0">
                  <div className="flex-shrink-0">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-600 flex items-center justify-center shadow-md">
                      <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex items-center min-w-0">
                    <div className="bg-white rounded-2xl rounded-bl-sm px-3 sm:px-4 py-2 sm:py-3 border border-gray-200 shadow-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="flex gap-1">
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                          <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
