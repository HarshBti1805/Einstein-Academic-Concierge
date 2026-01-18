"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
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
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { GradientCard } from "@/components/ui/animated-card";
import { GridBackground } from "@/components/ui/background-beams";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounterRef = useRef<number>(1);
  const recommendationsShownRef = useRef<boolean>(false);

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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (mounted) {
      gsap.fromTo(
        ".quick-action-btn",
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.4, stagger: 0.1, ease: "back.out(1.7)" }
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
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-indigo-500/20 border-t-indigo-500 rounded-full"
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] relative">
      <GridBackground />

      <Header
        title="AI Course Assistant"
        subtitle="Powered by Einstein Copilot"
        showBackButton
        backPath="/dashboard"
        userName={studentName}
        userRole="Student"
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 relative z-10">
        {/* Course Recommendations */}
        <AnimatePresence>
          {showRecommendations && recommendedCourses.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="mb-6"
            >
              <GradientCard>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-indigo-500/10">
                      <Sparkles className="h-5 w-5 text-indigo-400" />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">
                        Recommended Courses
                      </h2>
                      <p className="text-sm text-zinc-400">
                        Based on your grades and discussion
                      </p>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={handleGoToBookings}
                    className="btn-primary flex items-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    Book Seats
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>

                <div className="space-y-3">
                  {recommendedCourses.map((course, index) => (
                    <motion.div
                      key={course.code}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={cn(
                        "flex items-center gap-4 p-4 rounded-xl",
                        "bg-white/5 border border-white/5",
                        "hover:bg-white/10 hover:border-indigo-500/30 transition-all"
                      )}
                    >
                      <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold">
                        {course.priority}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">
                            {course.code}
                          </h3>
                          <span className="text-zinc-500">-</span>
                          <span className="text-zinc-300 truncate">
                            {course.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-zinc-500">
                          <span>{course.credits} Credits</span>
                          <span>•</span>
                          <span>{course.instructor}</span>
                          <span>•</span>
                          <span>{course.schedule}</span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-1 italic">
                          {course.reason}
                        </p>
                      </div>

                      <div className="flex flex-col gap-1">
                        <button
                          onClick={() => handlePriorityChange(course.code, "up")}
                          disabled={course.priority === 1}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            course.priority === 1
                              ? "text-zinc-600 cursor-not-allowed"
                              : "text-zinc-400 hover:text-white hover:bg-white/10"
                          )}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handlePriorityChange(course.code, "down")}
                          disabled={course.priority === 5}
                          className={cn(
                            "p-1.5 rounded-lg transition-colors",
                            course.priority === 5
                              ? "text-zinc-600 cursor-not-allowed"
                              : "text-zinc-400 hover:text-white hover:bg-white/10"
                          )}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-right">
                        <div
                          className={cn(
                            "inline-flex px-2.5 py-1 rounded-full text-xs font-semibold",
                            course.bookingStatus === "open"
                              ? course.totalSeats - course.occupiedSeats > 0
                                ? "bg-green-500/10 text-green-400"
                                : "bg-yellow-500/10 text-yellow-400"
                              : course.bookingStatus === "not_started"
                              ? "bg-blue-500/10 text-blue-400"
                              : "bg-red-500/10 text-red-400"
                          )}
                        >
                          {course.bookingStatus === "open"
                            ? `${course.totalSeats - course.occupiedSeats} seats left`
                            : course.bookingStatus === "not_started"
                            ? "Coming Soon"
                            : "Closed"}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </GradientCard>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat Interface */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-16rem)]">
          {/* Quick Actions Sidebar */}
          <div className="lg:col-span-1">
            <GradientCard className="h-full flex flex-col">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-white">
                  Quick Actions
                </h3>
                <p className="text-sm text-zinc-400">
                  Select to start a conversation
                </p>
              </div>

              <div className="space-y-2 flex-1 overflow-y-auto">
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
                          "bg-white/5 border border-white/5",
                          "hover:bg-indigo-500/10 hover:border-indigo-500/30 transition-all",
                          "text-left"
                        )}
                      >
                        <div className="p-2 rounded-lg bg-indigo-500/10">
                          <Icon className="h-4 w-4 text-indigo-400" />
                        </div>
                        <span className="text-sm text-zinc-300 flex-1">
                          {action.text}
                        </span>
                        <ChevronRight className="h-4 w-4 text-zinc-600" />
                      </div>
                    </motion.button>
                  );
                })}
              </div>

              {/* Suggested Follow-ups */}
              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-xs text-zinc-500 mb-2">Try asking:</p>
                <div className="flex flex-wrap gap-2">
                  {chatData.suggestedFollowUps.slice(0, 2).map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => handleQuickAction(suggestion)}
                      className="text-xs px-2 py-1 rounded-lg bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            </GradientCard>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-3 flex flex-col">
            <GradientCard className="flex-1 flex flex-col min-h-0">
              {/* Chat Header */}
              <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
                <div className="relative">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                    <Bot className="h-6 w-6 text-white" />
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 bg-green-500 rounded-full border-2 border-[#111118]" />
                </div>
                <div>
                  <h3 className="font-semibold text-white">Einstein Copilot</h3>
                  <p className="text-xs text-zinc-400 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 bg-green-500 rounded-full animate-pulse" />
                    Online and ready to help
                  </p>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-2">
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
                              "h-8 w-8 rounded-full flex items-center justify-center",
                              isUser
                                ? "bg-gradient-to-br from-blue-500 to-indigo-600"
                                : "bg-gradient-to-br from-purple-500 to-pink-600"
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
                          !showAvatar && (isUser ? "mr-11" : "ml-11")
                        )}
                      >
                        <div
                          className={cn(
                            "rounded-2xl px-4 py-3",
                            isUser
                              ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-br-md"
                              : "bg-white/5 border border-white/10 text-zinc-200 rounded-bl-md"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.text}
                          </p>
                        </div>
                        <span className="text-[10px] text-zinc-500 mt-1 px-1">
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
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 flex items-center justify-center flex-shrink-0">
                        <Bot className="h-4 w-4 text-white" />
                      </div>
                      <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <div className="typing-dot h-2 w-2 bg-zinc-400 rounded-full" />
                          <div className="typing-dot h-2 w-2 bg-zinc-400 rounded-full" />
                          <div className="typing-dot h-2 w-2 bg-zinc-400 rounded-full" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="pt-4 border-t border-white/10 mt-4">
                <form onSubmit={handleSendMessage} className="relative">
                  <textarea
                    ref={inputRef}
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="Type your message..."
                    rows={2}
                    className={cn(
                      "w-full px-4 py-3 pr-14 rounded-xl resize-none",
                      "bg-white/5 border border-white/10",
                      "text-white placeholder-zinc-500",
                      "focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20",
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
                      "absolute right-3 bottom-3 p-2 rounded-lg",
                      "bg-gradient-to-br from-indigo-500 to-purple-600",
                      "text-white shadow-lg shadow-indigo-500/25",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                      "transition-opacity"
                    )}
                  >
                    <Send className="h-5 w-5" />
                  </motion.button>
                </form>
                <p className="text-xs text-zinc-500 mt-2 text-center">
                  Press{" "}
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-zinc-400">
                    Enter
                  </kbd>{" "}
                  to send,{" "}
                  <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-zinc-400">
                    Shift+Enter
                  </kbd>{" "}
                  for new line
                </p>
              </div>
            </GradientCard>
          </div>
        </div>
      </main>
    </div>
  );
}
