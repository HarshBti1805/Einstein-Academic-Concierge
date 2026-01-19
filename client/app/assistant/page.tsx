"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fontVariables } from "@/lib/fonts";
import {
  Send,
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  Sparkles,
  ClipboardList,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  Bot,
  User,
  Zap,
  Bell,
  ArrowLeft,
  Settings,
  LogOut,
  GraduationCap,
  Users,
  Calendar,
  Star,
  ArrowUpRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import mock data
import chatData from "@/lib/mock-data/chat.json";
import coursesData from "@/lib/mock-data/courses.json";

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
  totalSeats: number;
  occupiedSeats: number;
  bookingStatus: string;
}

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  BookOpen,
  CheckCircle,
  Clock,
  Eye,
  Sparkles,
  ClipboardList,
};

export default function AssistantPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "msg-0",
      text: chatData.initialMessage.text,
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [recommendedCourses, setRecommendedCourses] = useState<RecommendedCourse[]>([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounterRef = useRef<number>(1);
  const recommendationsShownRef = useRef<boolean>(false);
  const recommendationsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = sessionStorage.getItem("studentData");
      if (!data) {
        router.push("/");
        return;
      }
      try {
        const parsed = JSON.parse(data);
        setStudentName(parsed.name || "Student");
        setMounted(true);
      } catch {
        router.push("/");
      }
    }, 0);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (showRecommendations && recommendationsRef.current) {
      setTimeout(() => {
        recommendationsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 300);
    }
  }, [showRecommendations]);

  useEffect(() => {
    if (mounted) {
      gsap.fromTo(
        ".quick-action-btn",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "back.out(1.7)", delay: 0.3 }
      );
    }
  }, [mounted]);

  const generateAgentResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();
    const responses = chatData.responses;

    if (lowerInput.includes("register") || lowerInput.includes("enroll") || lowerInput.includes("book")) {
      return responses.register;
    }
    if (lowerInput.includes("schedule") || lowerInput.includes("time") || lowerInput.includes("when")) {
      return responses.schedule;
    }
    if (lowerInput.includes("prerequisite") || lowerInput.includes("required") || lowerInput.includes("need")) {
      return responses.prerequisite;
    }
    if (lowerInput.includes("gpa") || lowerInput.includes("grade") || lowerInput.includes("performance")) {
      return responses.gpa;
    }
    if (lowerInput.includes("waitlist") || lowerInput.includes("full") || lowerInput.includes("available")) {
      return responses.waitlist;
    }
    if (lowerInput.includes("help") || lowerInput.includes("what can you do")) {
      return responses.help;
    }

    return `I understand you're asking about: "${userInput}". Let me help you with that. Could you provide a bit more detail? For example:\n\n• Are you looking to register for specific courses?\n• Do you have schedule constraints?\n• Are you checking prerequisites or availability?\n\nI'm here to make your course registration as smooth as possible!`;
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isTyping) return;

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

      if (updatedMessages.length >= 4 && !recommendationsShownRef.current) {
        recommendationsShownRef.current = true;
        setTimeout(() => {
          generateCourseRecommendations();
        }, 2000);
      }
    }, 1500);
  };

  const generateCourseRecommendations = () => {
    setRecommendedCourses(coursesData.recommendedCourses);
    setShowRecommendations(true);

    const recommendationMessageId = `msg-${messageIdCounterRef.current++}`;
    const recommendationMessage: Message = {
      id: recommendationMessageId,
      text: "Based on our discussion and your academic performance (GPA: 3.65), I've identified 5 courses that would be an excellent fit for you. You can review and prioritize them below, then proceed to the bookings page to select your seats.",
      sender: "agent",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, recommendationMessage]);
  };

  const handlePriorityChange = (courseCode: string, direction: "up" | "down") => {
    setRecommendedCourses((prev) => {
      const updated = [...prev];
      const courseIndex = updated.findIndex((c) => c.code === courseCode);
      if (courseIndex === -1) return prev;

      const course = updated[courseIndex];
      const newPriority = direction === "up" 
        ? Math.max(1, course.priority - 1)
        : Math.min(5, course.priority + 1);

      const swapIndex = updated.findIndex((c) => c.priority === newPriority);
      if (swapIndex !== -1) {
        updated[swapIndex].priority = course.priority;
      }
      updated[courseIndex].priority = newPriority;

      return updated.sort((a, b) => a.priority - b.priority);
    });
  };

  const handleGoToBookings = () => {
    sessionStorage.setItem("recommendedCourses", JSON.stringify(recommendedCourses));
    router.push("/bookings");
  };

  const handleQuickAction = (action: string) => {
    setInputMessage(action);
    inputRef.current?.focus();
  };

  if (!mounted) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 flex items-center justify-center ${fontVariables}`}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-10 w-10 border-2 border-gray-200 border-t-gray-800 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 flex flex-col ${fontVariables}`}>
      {/* Background Elements - Fixed */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
          }}
        />
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-gray-200/30 rounded-full blur-[150px]" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-gray-300/30 rounded-full blur-[120px]" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-gray-100/30 rounded-full blur-[180px]" />
      </div>

      {/* Header - Fixed */}
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="sticky top-0 z-50 flex-shrink-0"
      >
        <div className="absolute inset-0 bg-white/80 backdrop-blur-2xl" />
        <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-gray-300/50 to-transparent" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => router.push("/dashboard")}
                className="p-2.5 rounded-xl bg-gray-50 border border-gray-200/60 hover:bg-gray-100 hover:border-gray-300 transition-all"
              >
                <ArrowLeft className="h-4 w-4 text-gray-600" />
              </motion.button>

              <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-gray-700 to-gray-900 rounded-xl blur opacity-30" />
                <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black shadow-lg">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
              </div>
                <div>
                  <h1
                    className="text-base font-bold text-gray-900 tracking-tight"
                    style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                  >
                    AI Assistant
                  </h1>
                  <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                    </span>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                      Einstein Copilot
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2.5 rounded-xl bg-gray-50 border border-gray-200/60 hover:bg-gray-100 hover:border-gray-300 transition-all"
              >
                <Bell className="h-4 w-4 text-gray-600" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-gray-700 rounded-full animate-pulse" />
              </motion.button>

              <div className="hidden sm:block w-[1px] h-8 bg-gradient-to-b from-transparent via-gray-300 to-transparent mx-1" />

              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className={cn(
                    "flex items-center gap-3 p-1.5 pr-3 rounded-xl transition-all",
                    "bg-gray-50 border border-gray-200/60",
                    "hover:bg-gray-100 hover:border-gray-300",
                    showUserMenu && "bg-gray-100 border-gray-300"
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-sm">
                    {studentName.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">{studentName}</p>
                    <p className="text-xs text-gray-500">Student</p>
                  </div>
                </motion.button>

                <AnimatePresence>
                  {showUserMenu && (
                    <>
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-40"
                        onClick={() => setShowUserMenu(false)}
                      />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 mt-2 w-48 rounded-xl bg-white backdrop-blur-xl border border-gray-200 shadow-2xl shadow-gray-200/50 overflow-hidden z-50"
                      >
                        <div className="p-2">
                          {[
                            { icon: User, label: "Profile", action: () => {} },
                            { icon: Settings, label: "Settings", action: () => {} },
                            { icon: LogOut, label: "Sign out", action: () => router.push("/") },
                          ].map((item) => (
                            <motion.button
                              key={item.label}
                              whileHover={{ x: 4 }}
                              onClick={item.action}
                              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                            >
                              <item.icon className="h-4 w-4" />
                              {item.label}
                            </motion.button>
                          ))}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </motion.header>

      {/* Main Content - Scrollable */}
      <main className="flex-1 overflow-y-auto relative z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {/* Chat Interface */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
            {/* Quick Actions Sidebar */}
            <div className="lg:col-span-1 hidden lg:block">
              <div className="sticky top-6">
                <div className="relative rounded-2xl bg-white backdrop-blur-xl border border-gray-200/60 p-5 overflow-hidden shadow-sm">
                  <div className="relative z-10">
                    <div className="mb-4">
                      <h3 
                        className="text-base font-semibold text-gray-900"
                        style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                      >
                        Quick Actions
                      </h3>
                      <p className="text-xs text-gray-500">
                        Select to start a conversation
                      </p>
                    </div>

                    <div className="space-y-2">
                      {chatData.quickActions.map((action) => {
                        const Icon = iconMap[action.icon] || Sparkles;
                        return (
                          <motion.button
                            key={action.id}
                            className="quick-action-btn w-full"
                            whileHover={{ scale: 1.02, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => handleQuickAction(action.text)}
                          >
                            <div
                              className={cn(
                                "flex items-center gap-3 p-3 rounded-xl",
                                "bg-gray-50 border border-gray-100",
                                "hover:bg-gray-100 hover:border-gray-300 transition-all",
                                "text-left"
                              )}
                            >
                              <div className="p-2 rounded-lg bg-gray-100 border border-gray-300">
                                <Icon className="h-4 w-4 text-gray-700" />
                              </div>
                              <span className="text-sm text-gray-700 flex-1">
                                {action.text}
                              </span>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                          </motion.button>
                        );
                      })}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                      <div className="flex flex-wrap gap-2">
                        {chatData.suggestedFollowUps.slice(0, 2).map((suggestion) => (
                          <button
                            key={suggestion}
                            onClick={() => handleQuickAction(suggestion)}
                            className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300 transition-all"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3">
              <div className="relative rounded-2xl bg-white backdrop-blur-xl border border-gray-200/60 overflow-hidden shadow-sm">
                {/* Chat Header */}
                <div className="relative z-10 flex items-center gap-3 p-5 border-b border-gray-100">
                  <div className="relative">
                    <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center shadow-lg shadow-gray-500/20">
                      <Bot className="h-6 w-6 text-white" />
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-emerald-500 rounded-full border-2 border-white" />
                  </div>
                  <div>
                    <h3 
                      className="font-semibold text-gray-900"
                      style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                    >
                      Einstein Copilot
                    </h3>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full animate-pulse" />
                      Online and ready to help
                    </p>
                  </div>
                </div>

                {/* Messages Container - Fixed Height with Internal Scroll */}
                <div 
                  ref={messagesContainerRef}
                  className="relative z-10 h-[450px] overflow-y-auto p-5 space-y-4 scroll-smooth bg-gray-50/50"
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'rgba(100, 100, 100, 0.2) transparent',
                  }}
                >
                  {messages.map((message, index) => {
                    const isUser = message.sender === "user";
                    const showAvatar =
                      index === 0 || messages[index - 1].sender !== message.sender;

                    return (
                      <motion.div
                        key={message.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={cn(
                          "flex gap-3",
                          isUser ? "flex-row-reverse" : "flex-row"
                        )}
                      >
                        {showAvatar && (
                          <div className="flex-shrink-0">
                            <div
                              className={cn(
                                "h-9 w-9 rounded-lg flex items-center justify-center shadow-lg",
                                isUser
                                  ? "bg-gradient-to-br from-gray-600 to-gray-800 shadow-gray-500/20"
                                  : "bg-gradient-to-br from-gray-700 to-black shadow-gray-500/20"
                              )}
                            >
                              {isUser ? (
                                <User className="h-4 w-4 text-white" />
                              ) : (
                                <Bot className="h-4 w-4 text-white" />
                              )}
                            </div>
                          </div>
                        )}

                        <div
                          className={cn(
                            "flex flex-col max-w-[75%]",
                            isUser ? "items-end" : "items-start",
                            !showAvatar && (isUser ? "mr-12" : "ml-12")
                          )}
                        >
                            <div
                              className={cn(
                                "rounded-2xl px-4 py-3",
                                isUser
                                  ? "bg-gradient-to-br from-gray-700 to-gray-900 text-white rounded-br-md shadow-lg shadow-gray-500/20"
                                  : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm"
                              )}
                            >
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                              {message.text}
                            </p>
                          </div>
                          <span className="text-[10px] text-gray-500 mt-1 px-1">
                            {message.timestamp.toLocaleTimeString("en-US", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })}
                          </span>
                        </div>
                      </motion.div>
                    );
                  })}

                  {/* Typing Indicator */}
                  <AnimatePresence>
                    {isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="flex gap-3"
                      >
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-gray-700 to-black flex items-center justify-center flex-shrink-0 shadow-lg shadow-gray-500/20">
                          <Bot className="h-4 w-4 text-white" />
                        </div>
                        <div className="bg-white border border-gray-200 rounded-2xl rounded-bl-md px-4 py-3 shadow-sm">
                          <div className="flex items-center gap-1.5">
                            <div className="h-2 w-2 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                            <div className="h-2 w-2 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                            <div className="h-2 w-2 bg-gray-700 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="relative z-10 p-5 border-t border-gray-100 bg-white">
                  <form onSubmit={handleSendMessage} className="relative">
                    <textarea
                      ref={inputRef}
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your message..."
                      rows={2}
                      className={cn(
                        "w-full px-4 py-3 pr-14 rounded-xl resize-none",
                        "bg-gray-50 border border-gray-200",
                        "text-gray-900 placeholder-gray-400",
                        "focus:outline-none focus:border-gray-400 focus:ring-2 focus:ring-gray-500/20 focus:bg-white",
                        "transition-all"
                      )}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (inputMessage.trim() && !isTyping) {
                            handleSendMessage(e);
                          }
                        }
                      }}
                    />
                    <motion.button
                      type="submit"
                      disabled={!inputMessage.trim() || isTyping}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className={cn(
                        "absolute right-3 bottom-3 p-2.5 rounded-xl",
                        "bg-gradient-to-br from-gray-700 to-gray-900",
                        "text-white shadow-lg shadow-gray-500/25",
                        "disabled:opacity-50 disabled:cursor-not-allowed",
                        "transition-all"
                      )}
                    >
                      <Send className="h-5 w-5" />
                    </motion.button>
                  </form>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    Press{" "}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-600">
                      Enter
                    </kbd>{" "}
                    to send,{" "}
                    <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-200 rounded text-gray-600">
                      Shift+Enter
                    </kbd>{" "}
                    for new line
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Course Recommendations Section - Below Chat */}
          <AnimatePresence>
            {showRecommendations && recommendedCourses.length > 0 && (
              <motion.div
                ref={recommendationsRef}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 30 }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="mt-6"
              >
                <div className="relative rounded-2xl bg-white backdrop-blur-xl border border-gray-200 overflow-hidden shadow-sm">
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-50/50 via-transparent to-gray-100/50" />
                  
                  <div className="relative z-10">
                    {/* Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 border border-gray-300">
                          <Sparkles className="h-6 w-6 text-gray-700" />
                        </div>
                        <div>
                          <h3 
                            className="text-xl font-bold text-gray-900"
                            style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                          >
                            Recommended Courses
                          </h3>
                          <p className="text-sm text-gray-500">
                            {recommendedCourses.length} courses matched your profile • Drag to reorder priority
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGoToBookings}
                        className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white font-semibold shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40 transition-all"
                        style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                      >
                        <Zap className="h-5 w-5" />
                        Proceed to Booking
                        <ArrowUpRight className="h-4 w-4 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </motion.button>
                    </div>

                    {/* Course Cards Grid */}
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                        {recommendedCourses.map((course, index) => {
                          const availableSeats = course.totalSeats - course.occupiedSeats;
                          const seatPercentage = (course.occupiedSeats / course.totalSeats) * 100;
                          
                          return (
                            <motion.div
                              key={course.code}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.1 }}
                              whileHover={{ y: -4 }}
                              className="group relative"
                            >
                              <div className="absolute -inset-0.5 bg-gradient-to-r from-gray-200/50 to-gray-300/50 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity" />
                              
                              <div className="relative bg-white rounded-2xl border border-gray-200 group-hover:border-gray-400 overflow-hidden transition-all shadow-sm">
                                {/* Priority Badge */}
                                <div className="absolute top-4 right-4 flex items-center gap-1">
                                  <div className="flex items-center gap-0.5">
                                    <button
                                      onClick={() => handlePriorityChange(course.code, "up")}
                                      disabled={course.priority === 1}
                                      className={cn(
                                        "p-1 rounded-md transition-colors",
                                        course.priority === 1
                                          ? "text-gray-300 cursor-not-allowed"
                                          : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                                      )}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => handlePriorityChange(course.code, "down")}
                                      disabled={course.priority === recommendedCourses.length}
                                      className={cn(
                                        "p-1 rounded-md transition-colors",
                                        course.priority === recommendedCourses.length
                                          ? "text-gray-300 cursor-not-allowed"
                                          : "text-gray-400 hover:text-gray-900 hover:bg-gray-100"
                                      )}
                                    >
                                      <ChevronDown className="h-4 w-4" />
                                    </button>
                                  </div>
                                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-gray-700 to-black text-white text-sm font-bold shadow-lg shadow-gray-500/30">
                                    {course.priority}
                                  </div>
                                </div>

                                <div className="p-5">
                                  {/* Course Code & Name */}
                                  <div className="mb-4 pr-20">
                                    <div className="flex items-center gap-2 mb-1">
                                      <span 
                                        className="text-lg font-bold text-gray-900"
                                        style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
                                      >
                                        {course.code}
                                      </span>
                                      <span className="px-2 py-0.5 rounded-full bg-gray-100 border border-gray-300 text-xs text-gray-700">
                                        {course.credits} Credits
                                      </span>
                                    </div>
                                    <h4 className="text-sm text-gray-600 line-clamp-1">
                                      {course.name}
                                    </h4>
                                  </div>

                                  {/* Course Details */}
                                  <div className="space-y-3 mb-4">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <GraduationCap className="h-4 w-4 text-gray-400" />
                                      <span className="truncate">{course.instructor}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                      <Calendar className="h-4 w-4 text-gray-400" />
                                      <span>{course.schedule}</span>
                                    </div>
                                  </div>

                                  {/* Seat Availability */}
                                  <div className="mb-4">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <Users className="h-4 w-4 text-gray-400" />
                                        <span className="text-xs text-gray-500">Seat Availability</span>
                                      </div>
                                      <span className={cn(
                                        "text-xs font-semibold",
                                        availableSeats > 10 ? "text-emerald-600" : availableSeats > 5 ? "text-amber-600" : "text-red-600"
                                      )}>
                                        {availableSeats} / {course.totalSeats}
                                      </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${100 - seatPercentage}%` }}
                                        transition={{ delay: 0.3 + index * 0.1, duration: 0.8 }}
                                        className={cn(
                                          "h-full rounded-full",
                                          availableSeats > 10 
                                            ? "bg-gradient-to-r from-emerald-500 to-green-400" 
                                            : availableSeats > 5 
                                            ? "bg-gradient-to-r from-amber-500 to-yellow-400" 
                                            : "bg-gradient-to-r from-red-500 to-rose-400"
                                        )}
                                      />
                                    </div>
                                  </div>

                                  {/* Reason Badge */}
                                  <div className="flex items-start gap-2 p-3 rounded-xl bg-gray-50 border border-gray-100">
                                    <Star className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                                    <p className="text-xs text-gray-600 leading-relaxed line-clamp-2">
                                      {course.reason}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="px-6 py-4 bg-gray-50 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <p className="text-xs text-gray-500 text-center sm:text-left">
                          💡 Tip: Use the arrows to reorder courses by your preference. Higher priority courses will be processed first.
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">Total Credits:</span>
                          <span className="px-2 py-1 rounded-lg bg-gray-100 border border-gray-300 text-sm font-semibold text-gray-700">
                            {recommendedCourses.reduce((sum, c) => sum + c.credits, 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Custom Scrollbar Styles */}
      <style jsx global>{`
        .scroll-smooth::-webkit-scrollbar {
          width: 6px;
        }
        .scroll-smooth::-webkit-scrollbar-track {
          background: transparent;
        }
        .scroll-smooth::-webkit-scrollbar-thumb {
          background: rgba(100, 100, 100, 0.2);
          border-radius: 3px;
        }
        .scroll-smooth::-webkit-scrollbar-thumb:hover {
          background: rgba(100, 100, 100, 0.4);
        }
      `}</style>
    </div>
  );
}
