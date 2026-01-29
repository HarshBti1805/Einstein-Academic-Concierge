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
  AlertCircle,
  Mic,
  MicOff,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Import test data for fallback
import chatData from "@/lib/test-data/chat_data.json";

// API URLs - Express for auth/data, Flask for AI chat
const EXPRESS_API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const AI_API_URL =
  process.env.NEXT_PUBLIC_AI_API_URL || "http://localhost:5000";

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
  const [studentId, setStudentId] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [recommendedCourses, setRecommendedCourses] = useState<
    RecommendedCourse[]
  >([]);
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [apiConnected, setApiConnected] = useState(false);
  const [canRecommend, setCanRecommend] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] =
    useState(false);
  type ConversationMode = "text" | "voice";
  const [conversationMode, setConversationMode] =
    useState<ConversationMode>("text");
  const [voiceReady, setVoiceReady] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounterRef = useRef<number>(1);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Check API health and initialize chat
  useEffect(() => {
    const initializeChat = async () => {
      const token = sessionStorage.getItem("authToken");
      const data = sessionStorage.getItem("studentData");

      if (!token || !data) {
        router.push("/");
        return;
      }

      try {
        const parsed = JSON.parse(data);
        setStudentName(parsed.name || "Student");
        setStudentId(parsed.student_id || "");

        // Check if Flask AI API is available
        try {
          const healthResponse = await fetch(`${AI_API_URL}/api/health`);
          if (healthResponse.ok) {
            const healthData = await healthResponse.json();

            // Check if vector store is ready (AI is properly initialized)
            if (healthData.vectorstore_ready) {
              setApiConnected(true);
              setVoiceReady(!!healthData.voice_ready);

              // Start chat session with Flask AI API
              const startResponse = await fetch(
                `${AI_API_URL}/api/chat/start`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({ student_id: parsed.student_id }),
                },
              );

              if (startResponse.ok) {
                const startData = await startResponse.json();
                setMessages([
                  {
                    id: "msg-0",
                    text: startData.message,
                    sender: "agent",
                    timestamp: new Date(),
                  },
                ]);
              } else {
                throw new Error("Failed to start chat");
              }
            } else {
              throw new Error(
                "AI not initialized - check PINECONE_API_KEY and OPENAI_API_KEY",
              );
            }
          } else {
            throw new Error("AI API not healthy");
          }
        } catch (error) {
          // Fallback to local mode
          console.log("AI API not available, using local mode:", error);
          setApiConnected(false);
          setMessages([
            {
              id: "msg-0",
              text: `Hey ${parsed.name?.split(" ")[0] || "there"}! Ready to figure out your courses for next semester?\n\nWhat's been on your mind - any subjects you're excited about or maybe some scheduling preferences?`,
              sender: "agent",
              timestamp: new Date(),
            },
          ]);
        }

        setMounted(true);
      } catch {
        router.push("/");
      }
    };

    initializeChat();
  }, [router]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  useEffect(() => {
    if (showRecommendations && recommendationsRef.current) {
      setTimeout(() => {
        recommendationsRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 300);
    }
  }, [showRecommendations]);

  useEffect(() => {
    if (mounted) {
      gsap.fromTo(
        ".quick-action-btn",
        { opacity: 0, y: 20 },
        {
          opacity: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: "back.out(1.7)",
          delay: 0.3,
        },
      );
    }
  }, [mounted]);

  // Format message text - strip markdown formatting for cleaner display
  const formatMessageText = (text: string): string => {
    return (
      text
        // Remove bold markers
        .replace(/\*\*(.*?)\*\*/g, "$1")
        .replace(/__(.*?)__/g, "$1")
        // Remove italic markers
        .replace(/\*(.*?)\*/g, "$1")
        .replace(/_(.*?)_/g, "$1")
        // Convert bullet points to simple dashes
        .replace(/^[•●◦]\s*/gm, "- ")
        // Clean up multiple newlines
        .replace(/\n{3,}/g, "\n\n")
    );
  };

  // Local fallback response generator - casual tone
  const generateLocalResponse = (userInput: string): string => {
    const lowerInput = userInput.toLowerCase();

    if (
      lowerInput.includes("register") ||
      lowerInput.includes("enroll") ||
      lowerInput.includes("book")
    ) {
      return "Oh you're ready to register? That's great! Before we jump into that, tell me - what kind of classes are you hoping for? More hands-on stuff or lecture-based?";
    }
    if (
      lowerInput.includes("schedule") ||
      lowerInput.includes("time") ||
      lowerInput.includes("when") ||
      lowerInput.includes("morning") ||
      lowerInput.includes("afternoon")
    ) {
      return "Got it, schedule matters! Are you more of a morning person or do you prefer afternoon/evening classes? Also, any days you need to keep free?";
    }
    if (
      lowerInput.includes("prerequisite") ||
      lowerInput.includes("required") ||
      lowerInput.includes("need")
    ) {
      return "Prerequisites can be tricky! Don't worry, I'll make sure any courses I suggest you're actually eligible for. What subjects are you most interested in exploring?";
    }
    if (
      lowerInput.includes("gpa") ||
      lowerInput.includes("grade") ||
      lowerInput.includes("performance")
    ) {
      return "Your grades are looking good! No stress there. What matters more to you - keeping that GPA up with easier courses, or challenging yourself a bit?";
    }
    if (
      lowerInput.includes("waitlist") ||
      lowerInput.includes("full") ||
      lowerInput.includes("available")
    ) {
      return "Yeah some popular courses fill up fast! I can help you find good alternatives too. What area are you most interested in?";
    }
    if (lowerInput.includes("help") || lowerInput.includes("what can you do")) {
      return "I'm here to help you find courses that actually fit what you want! Just chat with me about your interests, schedule preferences, career goals - whatever's on your mind. What should we start with?";
    }
    if (
      lowerInput.includes("programming") ||
      lowerInput.includes("coding") ||
      lowerInput.includes("software") ||
      lowerInput.includes("tech")
    ) {
      return "Nice, tech stuff! Are you looking for more theory-heavy courses or do you prefer building actual projects? Also, any specific area like AI, web dev, or something else?";
    }
    if (
      lowerInput.includes("business") ||
      lowerInput.includes("management") ||
      lowerInput.includes("finance")
    ) {
      return "Business track, cool! Are you thinking more entrepreneurship vibes or corporate/finance path? That'll help me figure out what fits.";
    }
    if (
      lowerInput.includes("art") ||
      lowerInput.includes("design") ||
      lowerInput.includes("creative")
    ) {
      return "Creative stuff is awesome! Digital or traditional? And do you prefer studio-based classes or more theory?";
    }

    // Default casual responses
    const casualResponses = [
      "Interesting! Tell me more about that - what specifically draws you to it?",
      "Cool, I can work with that! Anything else you're considering or any dealbreakers I should know about?",
      "Got it! So if you could design your perfect semester, what would it look like?",
      "Makes sense! What's your ideal balance - challenging courses vs ones where you can cruise a bit?",
    ];

    return casualResponses[Math.floor(Math.random() * casualResponses.length)];
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

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage;
    setInputMessage("");
    setIsTyping(true);

    if (apiConnected && studentId) {
      // Use Flask AI API for response
      try {
        const response = await fetch(`${AI_API_URL}/api/chat/message`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            student_id: studentId,
            message: currentInput,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const agentMessageId = `msg-${messageIdCounterRef.current++}`;
          const agentMessage: Message = {
            id: agentMessageId,
            text: data.response,
            sender: "agent",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, agentMessage]);
          setCanRecommend(data.can_recommend);
        } else {
          throw new Error("API error");
        }
      } catch {
        // Fallback to local
        const agentResponse = generateLocalResponse(currentInput);
        const agentMessageId = `msg-${messageIdCounterRef.current++}`;
        const agentMessage: Message = {
          id: agentMessageId,
          text: agentResponse,
          sender: "agent",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);
        if (messages.length >= 4) {
          setCanRecommend(true);
        }
      }
    } else {
      // Local mode
      setTimeout(() => {
        const agentResponse = generateLocalResponse(currentInput);
        const agentMessageId = `msg-${messageIdCounterRef.current++}`;
        const agentMessage: Message = {
          id: agentMessageId,
          text: agentResponse,
          sender: "agent",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, agentMessage]);
        if (messages.length >= 4) {
          setCanRecommend(true);
        }
      }, 1000);
    }

    setIsTyping(false);
  };

  const generateCourseRecommendations = async () => {
    setIsLoadingRecommendations(true);

    if (apiConnected && studentId) {
      try {
        // Use Flask AI API for recommendations
        const response = await fetch(`${AI_API_URL}/api/chat/recommend`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ student_id: studentId }),
        });

        if (response.ok) {
          const data = await response.json();
          setRecommendedCourses(data.recommendations);
          setShowRecommendations(true);

          const recommendationMessageId = `msg-${messageIdCounterRef.current++}`;
          const recommendationMessage: Message = {
            id: recommendationMessageId,
            text: data.message,
            sender: "agent",
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, recommendationMessage]);
        } else {
          throw new Error("Failed to get recommendations");
        }
      } catch {
        // Fallback to local recommendations
        setRecommendedCourses(chatData.recommendedCourses);
        setShowRecommendations(true);

        const recommendationMessageId = `msg-${messageIdCounterRef.current++}`;
        const recommendationMessage: Message = {
          id: recommendationMessageId,
          text: "Alright, based on our chat I've pulled together some courses that I think you'd actually enjoy! Take a look below - you can reorder them by priority, then head to bookings to grab your seats.",
          sender: "agent",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, recommendationMessage]);
      }
    } else {
      // Local mode
      setRecommendedCourses(chatData.recommendedCourses);
      setShowRecommendations(true);

      const recommendationMessageId = `msg-${messageIdCounterRef.current++}`;
      const recommendationMessage: Message = {
        id: recommendationMessageId,
        text: "Alright, based on our chat I've pulled together some courses that I think you'd actually enjoy! Take a look below - you can reorder them by priority, then head to bookings to grab your seats.",
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, recommendationMessage]);
    }

    setIsLoadingRecommendations(false);
  };

  const handlePriorityChange = (
    courseCode: string,
    direction: "up" | "down",
  ) => {
    setRecommendedCourses((prev) => {
      const updated = [...prev];
      const courseIndex = updated.findIndex((c) => c.code === courseCode);
      if (courseIndex === -1) return prev;

      const course = updated[courseIndex];
      const newPriority =
        direction === "up"
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
    sessionStorage.setItem(
      "recommendedCourses",
      JSON.stringify(recommendedCourses),
    );
    router.push("/bookings");
  };

  const handleQuickAction = (action: string) => {
    setInputMessage(action);
    inputRef.current?.focus();
  };

  // Voice: process recorded audio → transcribe → chat → TTS → play
  // When voiceOnly is true, no text is shown; conversation continues in voice only.
  const processVoiceInput = async (
    audioBlob: Blob,
    voiceOnly: boolean = false,
  ) => {
    if (!studentId || !voiceReady) return;
    setVoiceError(null);
    setIsTyping(true);
    try {
      const form = new FormData();
      form.append("audio", audioBlob, "recording.webm");
      const transcribeRes = await fetch(`${AI_API_URL}/api/chat/transcribe`, {
        method: "POST",
        body: form,
      });
      if (!transcribeRes.ok) {
        const err = await transcribeRes.json().catch(() => ({}));
        throw new Error(
          (err as { error?: string }).error || "Transcription failed",
        );
      }
      const { text } = (await transcribeRes.json()) as { text: string };
      const trimmed = (text || "").trim();
      if (!trimmed) {
        setIsTyping(false);
        return;
      }

      if (!voiceOnly) {
        const userMessageId = `msg-${messageIdCounterRef.current++}`;
        setMessages((prev) => [
          ...prev,
          {
            id: userMessageId,
            text: trimmed,
            sender: "user",
            timestamp: new Date(),
          },
        ]);
      }

      const messageRes = await fetch(`${AI_API_URL}/api/chat/message`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ student_id: studentId, message: trimmed }),
      });
      if (!messageRes.ok) throw new Error("Chat failed");
      const msgData = (await messageRes.json()) as {
        response: string;
        can_recommend?: boolean;
      };
      if (msgData.can_recommend) setCanRecommend(true);

      if (!voiceOnly) {
        const agentMessageId = `msg-${messageIdCounterRef.current++}`;
        setMessages((prev) => [
          ...prev,
          {
            id: agentMessageId,
            text: msgData.response,
            sender: "agent",
            timestamp: new Date(),
          },
        ]);
      }

      const speakRes = await fetch(`${AI_API_URL}/api/chat/speak`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msgData.response }),
      });
      if (!speakRes.ok) throw new Error("Voice synthesis failed");
      const audioBlobResponse = await speakRes.blob();
      const url = URL.createObjectURL(audioBlobResponse);
      const audio = new Audio(url);
      setIsTyping(false);
      setIsSpeaking(true);
      audio.onended = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        setIsSpeaking(false);
      };
      await audio.play();
    } catch (e) {
      console.error("Voice pipeline error:", e);
      const errMsg = e instanceof Error ? e.message : "Something went wrong";
      if (voiceOnly) {
        setVoiceError(errMsg);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-${messageIdCounterRef.current++}`,
            text: `Sorry, voice error: ${errMsg}. Please try again or switch to text.`,
            sender: "agent",
            timestamp: new Date(),
          },
        ]);
      }
      setIsTyping(false);
      setIsSpeaking(false);
    }
  };

  const getPreferredAudioMime = (): string => {
    const types = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/ogg;codecs=opus",
      "audio/mp4",
    ];
    for (const t of types) {
      if (
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported(t)
      )
        return t;
    }
    return "";
  };

  const handleStartRecording = async () => {
    if (!voiceReady || isRecording || isSpeaking) return;
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      audioChunksRef.current = [];
      const mime = getPreferredAudioMime();
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : {});
      mediaRecorderRef.current = mr;
      mr.ondataavailable = (e) => {
        if (e.data.size) audioChunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const mime = mr.mimeType || "audio/webm";
        mediaRecorderRef.current = null;
        streamRef.current = null;
        const blob = new Blob(audioChunksRef.current, { type: mime });
        if (blob.size > 0) processVoiceInput(blob, true);
        setIsRecording(false);
      };
      mr.start(200);
      setIsRecording(true);
    } catch (e) {
      console.error("Mic access error:", e);
      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${messageIdCounterRef.current++}`,
          text: "Could not access the microphone. Please allow mic access or use text mode.",
          sender: "agent",
          timestamp: new Date(),
        },
      ]);
    }
  };

  const handleStopRecording = () => {
    if (
      !isRecording ||
      !mediaRecorderRef.current ||
      mediaRecorderRef.current.state === "inactive"
    )
      return;
    mediaRecorderRef.current.stop();
  };

  if (!mounted) {
    return (
      <div
        className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 flex items-center justify-center ${fontVariables}`}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-10 w-10 border-2 border-gray-200 border-t-gray-800 rounded-full"
        />
      </div>
    );
  }

  return (
    <div
      className={`min-h-screen bg-gradient-to-br from-slate-50 via-white to-gray-100 flex flex-col ${fontVariables}`}
    >
      {/* Background Elements - Fixed */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className="absolute inset-0 opacity-[0.6]"
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
                    className="text-2xl font-bold text-gray-900 tracking-tight"
                    style={{
                      fontFamily:
                        "var(--font-montserrat), system-ui, sans-serif",
                    }}
                  >
                    AI Assistant
                  </h1>
                  {/* <div className="flex items-center gap-1.5">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className={cn(
                        "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                        apiConnected ? "bg-emerald-400" : "bg-amber-400"
                      )}></span>
                      <span className={cn(
                        "relative inline-flex rounded-full h-1.5 w-1.5",
                        apiConnected ? "bg-emerald-500" : "bg-amber-500"
                      )}></span>
                    </span>
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">
                      {apiConnected ? "AI Powered" : "Local Mode"}
                    </p>
                  </div> */}
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Get Recommendations Button */}
              {/* {canRecommend && !showRecommendations && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={generateCourseRecommendations}
                  disabled={isLoadingRecommendations}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white text-sm font-medium shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40 transition-all disabled:opacity-50"
                >
                  {isLoadingRecommendations ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  Get Recommendations
                </motion.button>
              )} */}

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
                    showUserMenu && "bg-gray-100 border-gray-300",
                  )}
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center text-white font-semibold text-sm">
                    {studentName.charAt(0)}
                  </div>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium text-gray-900">
                      {studentName}
                    </p>
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
                            {
                              icon: Settings,
                              label: "Settings",
                              action: () => {},
                            },
                            {
                              icon: LogOut,
                              label: "Sign out",
                              action: () => {
                                sessionStorage.removeItem("authToken");
                                sessionStorage.removeItem("studentData");
                                router.push("/");
                              },
                            },
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

      {/* API Status Banner */}
      {!apiConnected && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center gap-2 text-sm text-amber-700">
            <AlertCircle className="h-4 w-4" />
            <span>
              Running in local mode. Start the Flask AI API (python
              models/app.py) with valid OPENAI_API_KEY and PINECONE_API_KEY for
              AI-powered recommendations.
            </span>
          </div>
        </div>
      )}

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
                        style={{
                          fontFamily: "var(--font-syne), system-ui, sans-serif",
                        }}
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
                            style={{
                              fontFamily:
                                "var(--font-syne), system-ui, sans-serif",
                            }}
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
                                "text-left",
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
                      <p
                        style={{
                          fontFamily: "var(--font-syne), system-ui, sans-serif",
                        }}
                        className="text-xs text-gray-500 mb-2"
                      >
                        Try asking:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {chatData.suggestedFollowUps
                          .slice(0, 2)
                          .map((suggestion) => (
                            <button
                              style={{
                                fontFamily:
                                  "var(--font-syne), system-ui, sans-serif",
                              }}
                              key={suggestion}
                              onClick={() => handleQuickAction(suggestion)}
                              className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-50 border border-gray-100 text-gray-600 hover:text-gray-900 hover:bg-gray-100 hover:border-gray-300 transition-all"
                            >
                              {suggestion}
                            </button>
                          ))}
                      </div>
                    </div>

                    {/* Mobile Recommend Button */}
                    {canRecommend && !showRecommendations && (
                      <motion.button
                        style={{
                          fontFamily: "var(--font-syne), system-ui, sans-serif",
                        }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onClick={generateCourseRecommendations}
                        disabled={isLoadingRecommendations}
                        className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white font-medium shadow-lg disabled:opacity-50"
                      >
                        {isLoadingRecommendations ? (
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{
                              duration: 1,
                              repeat: Infinity,
                              ease: "linear",
                            }}
                            className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full"
                          />
                        ) : (
                          <Sparkles className="h-4 w-4" />
                        )}
                        Get Recommendations
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Chat Area */}
            <div className="lg:col-span-3">
              <div className="relative rounded-2xl bg-white backdrop-blur-xl border border-gray-200/60 overflow-hidden shadow-sm">
                {/* Chat Header */}
                <div className="relative z-10 flex items-center justify-between gap-3 p-5 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-gray-700 via-gray-800 to-black flex items-center justify-center shadow-lg shadow-gray-500/20">
                        <Bot className="h-6 w-6 text-white" />
                      </div>
                      <div
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white",
                          apiConnected ? "bg-emerald-500" : "bg-amber-500",
                        )}
                      />
                    </div>
                    <div
                      className="tracking-wide"
                      style={{
                        fontFamily:
                          "var(--font-violet-sans, system-ui, sans-serif",
                      }}
                    >
                      <h3 className="font-semibold text-gray-900">
                        Einstein Copilot
                      </h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-1.5 w-1.5 rounded-full animate-pulse",
                            apiConnected ? "bg-emerald-500" : "bg-amber-500",
                          )}
                        />
                        {apiConnected
                          ? "AI Powered - Ready to help"
                          : "Local Mode - Limited responses"}
                      </p>
                    </div>
                  </div>
                  {/* Text / Voice mode toggle */}
                  <div className="flex items-center gap-1 p-1 rounded-xl bg-gray-100 border border-gray-200/60">
                    <motion.button
                      type="button"
                      onClick={() => setConversationMode("text")}
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        conversationMode === "text"
                          ? "bg-white text-gray-900 border border-gray-300/60 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white/60",
                      )}
                      aria-pressed={conversationMode === "text"}
                      aria-label="Text chat mode"
                    >
                      <MessageCircle className="h-4 w-4" />
                      <span className="hidden sm:inline">Chat</span>
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={() => voiceReady && setConversationMode("voice")}
                      disabled={!voiceReady}
                      title={
                        voiceReady
                          ? "Voice conversation (English)"
                          : "Start the Flask AI API with OPENAI_API_KEY for voice"
                      }
                      className={cn(
                        "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                        conversationMode === "voice"
                          ? "bg-white text-gray-900 border border-gray-300/60 shadow-sm"
                          : "text-gray-600 hover:text-gray-900 hover:bg-white/60",
                        !voiceReady && "opacity-50 cursor-not-allowed",
                      )}
                      aria-pressed={conversationMode === "voice"}
                      aria-label="Voice chat mode"
                    >
                      <Mic className="h-4 w-4" />
                      <span className="hidden sm:inline">Voice</span>
                    </motion.button>
                  </div>
                </div>

                {/* Messages (text mode) or Voice-only panel (voice mode) */}
                <div
                  ref={messagesContainerRef}
                  className="relative z-10 h-[450px] overflow-y-auto scroll-smooth bg-gray-50/50"
                  style={{
                    scrollbarWidth: "thin",
                    scrollbarColor: "rgba(100, 100, 100, 0.2) transparent",
                  }}
                >
                  {conversationMode === "voice" ? (
                    <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                      <p
                        className="text-gray-500 mb-6 max-w-sm"
                        style={{
                          fontFamily:
                            "var(--font-space-grotesk), system-ui, sans-serif",
                        }}
                      >
                        Voice conversation — no text. Use the mic below to talk.
                        Everything stays in voice.
                      </p>
                      <AnimatePresence mode="wait">
                        {isRecording && (
                          <motion.div
                            key="recording"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-red-50 border border-red-200"
                          >
                            <span className="h-3 w-3 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-red-700">
                              Listening...
                            </span>
                          </motion.div>
                        )}
                        {isTyping && !isRecording && (
                          <motion.div
                            key="typing"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-white border border-gray-200 shadow-sm"
                          >
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-2 w-2 bg-gray-700 rounded-full animate-bounce"
                                style={{ animationDelay: "0ms" }}
                              />
                              <div
                                className="h-2 w-2 bg-gray-700 rounded-full animate-bounce"
                                style={{ animationDelay: "150ms" }}
                              />
                              <div
                                className="h-2 w-2 bg-gray-700 rounded-full animate-bounce"
                                style={{ animationDelay: "300ms" }}
                              />
                            </div>
                            <span className="text-sm text-gray-600">
                              Processing...
                            </span>
                          </motion.div>
                        )}
                        {isSpeaking && !isTyping && !isRecording && (
                          <motion.div
                            key="speaking"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="flex items-center gap-3 px-5 py-3 rounded-2xl bg-emerald-50 border border-emerald-200"
                          >
                            <span className="h-3 w-3 bg-emerald-500 rounded-full animate-pulse" />
                            <span className="text-sm font-medium text-emerald-700">
                              Speaking...
                            </span>
                          </motion.div>
                        )}
                        {!isRecording &&
                          !isTyping &&
                          !isSpeaking &&
                          voiceError && (
                            <motion.div
                              key="error"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              exit={{ opacity: 0 }}
                              className="rounded-2xl bg-amber-50 border border-amber-200 px-5 py-3 max-w-md"
                            >
                              <p className="text-sm text-amber-800">
                                {voiceError}
                              </p>
                              <p className="text-xs text-amber-600 mt-1">
                                Try again or switch to Chat.
                              </p>
                            </motion.div>
                          )}
                        {!isRecording &&
                          !isTyping &&
                          !isSpeaking &&
                          !voiceError && (
                            <motion.div
                              key="idle"
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex flex-col items-center gap-2"
                            >
                              <div className="h-14 w-14 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center">
                                <Mic className="h-7 w-7 text-gray-400" />
                              </div>
                              <span className="text-sm text-gray-400">
                                Click the mic below to speak
                              </span>
                            </motion.div>
                          )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <div className="p-5 space-y-4">
                      {messages.map((message, index) => {
                        const isUser = message.sender === "user";
                        const showAvatar =
                          index === 0 ||
                          messages[index - 1].sender !== message.sender;

                        return (
                          <motion.div
                            key={message.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                              fontFamily:
                                "var(--font-space-grotesk), system-ui, sans-serif",
                            }}
                            className={cn(
                              "flex gap-3",
                              isUser ? "flex-row-reverse" : "flex-row",
                            )}
                          >
                            {showAvatar && (
                              <div className="flex-shrink-0">
                                <div
                                  className={cn(
                                    "h-9 w-9 rounded-lg flex items-center justify-center shadow-lg",
                                    isUser
                                      ? "bg-gradient-to-br from-gray-600 to-gray-800 shadow-gray-500/20"
                                      : "bg-gradient-to-br from-gray-700 to-black shadow-gray-500/20",
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
                                !showAvatar && (isUser ? "mr-12" : "ml-12"),
                              )}
                            >
                              <div
                                className={cn(
                                  "rounded-2xl px-4 py-3",
                                  isUser
                                    ? "bg-gradient-to-br from-gray-700 to-gray-900 text-white rounded-br-md shadow-lg shadow-gray-500/20"
                                    : "bg-white border border-gray-200 text-gray-800 rounded-bl-md shadow-sm",
                                )}
                              >
                                <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                  {formatMessageText(message.text)}
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

                      {/* Typing indicator (text mode only) */}
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
                                <div
                                  className="h-2 w-2 bg-gray-700 rounded-full animate-bounce"
                                  style={{ animationDelay: "0ms" }}
                                />
                                <div
                                  className="h-2 w-2 bg-gray-700 rounded-full animate-bounce"
                                  style={{ animationDelay: "150ms" }}
                                />
                                <div
                                  className="h-2 w-2 bg-gray-700 rounded-full animate-bounce"
                                  style={{ animationDelay: "300ms" }}
                                />
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>

                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </div>

                {/* Input Area: Text or Voice */}
                <div className="relative z-10 p-5 border-t border-gray-100 bg-white">
                  {conversationMode === "voice" ? (
                    <div className="flex flex-col items-center justify-center gap-4 py-2">
                      <p className="text-sm text-gray-500 text-center">
                        {voiceReady
                          ? "Click the mic to start speaking, then click again to send. Conversations are in English."
                          : "Voice mode requires the Flask AI API with OPENAI_API_KEY. Use Chat mode or start the API."}
                      </p>
                      {voiceReady && (
                        <motion.button
                          type="button"
                          onClick={
                            isRecording
                              ? handleStopRecording
                              : handleStartRecording
                          }
                          disabled={isTyping || isSpeaking}
                          whileHover={
                            !isTyping && !isSpeaking
                              ? { scale: 1.05 }
                              : undefined
                          }
                          whileTap={
                            !isTyping && !isSpeaking
                              ? { scale: 0.95 }
                              : undefined
                          }
                          className={cn(
                            "flex items-center justify-center w-20 h-20 rounded-full border-2 transition-all",
                            isRecording
                              ? "bg-red-50 border-red-400 text-red-600 shadow-lg shadow-red-200/50"
                              : "bg-gray-50 border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-100",
                            (isTyping || isSpeaking) &&
                              "opacity-50 cursor-not-allowed",
                          )}
                          aria-label={
                            isRecording ? "Stop recording" : "Start recording"
                          }
                        >
                          {isRecording ? (
                            <MicOff className="h-9 w-9" />
                          ) : (
                            <Mic className="h-9 w-9" />
                          )}
                        </motion.button>
                      )}
                      {(isRecording || isTyping || isSpeaking) && (
                        <p className="text-xs text-gray-500">
                          {isRecording
                            ? "Listening... Click again to send."
                            : isTyping
                              ? "Processing..."
                              : "Speaking..."}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <form onSubmit={handleSendMessage} className="relative">
                        <textarea
                          style={{
                            fontFamily:
                              "var(--font-space-mono), system-ui, sans-serif",
                          }}
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
                            "transition-all",
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
                            "absolute right-3 bottom-5 p-3 rounded-xl",
                            "bg-gradient-to-br from-gray-700 to-gray-900",
                            "text-white shadow-lg shadow-gray-500/25",
                            "disabled:opacity-50 disabled:cursor-not-allowed",
                            "transition-all",
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
                    </>
                  )}
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
                            style={{
                              fontFamily:
                                "var(--font-syne), system-ui, sans-serif",
                            }}
                          >
                            Recommended Courses
                          </h3>
                          <p className="text-sm text-gray-500">
                            {recommendedCourses.length} courses matched your
                            profile • Drag to reorder priority
                          </p>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleGoToBookings}
                        className="group flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-gray-800 to-black text-white font-semibold shadow-lg shadow-gray-500/25 hover:shadow-gray-500/40 transition-all"
                        style={{
                          fontFamily:
                            "var(--font-manrope), system-ui, sans-serif",
                        }}
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
                          const availableSeats =
                            course.totalSeats - course.occupiedSeats;
                          const seatPercentage =
                            (course.occupiedSeats / course.totalSeats) * 100;

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
                                      onClick={() =>
                                        handlePriorityChange(course.code, "up")
                                      }
                                      disabled={course.priority === 1}
                                      className={cn(
                                        "p-1 rounded-md transition-colors",
                                        course.priority === 1
                                          ? "text-gray-300 cursor-not-allowed"
                                          : "text-gray-400 hover:text-gray-900 hover:bg-gray-100",
                                      )}
                                    >
                                      <ChevronUp className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() =>
                                        handlePriorityChange(
                                          course.code,
                                          "down",
                                        )
                                      }
                                      disabled={
                                        course.priority ===
                                        recommendedCourses.length
                                      }
                                      className={cn(
                                        "p-1 rounded-md transition-colors",
                                        course.priority ===
                                          recommendedCourses.length
                                          ? "text-gray-300 cursor-not-allowed"
                                          : "text-gray-400 hover:text-gray-900 hover:bg-gray-100",
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
                                        style={{
                                          fontFamily:
                                            "var(--font-syne), system-ui, sans-serif",
                                        }}
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
                                      <span className="truncate">
                                        {course.instructor}
                                      </span>
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
                                        <span className="text-xs text-gray-500">
                                          Seat Availability
                                        </span>
                                      </div>
                                      <span
                                        className={cn(
                                          "text-xs font-semibold",
                                          availableSeats > 10
                                            ? "text-emerald-600"
                                            : availableSeats > 5
                                              ? "text-amber-600"
                                              : "text-red-600",
                                        )}
                                      >
                                        {availableSeats} / {course.totalSeats}
                                      </span>
                                    </div>
                                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{
                                          width: `${100 - seatPercentage}%`,
                                        }}
                                        transition={{
                                          delay: 0.3 + index * 0.1,
                                          duration: 0.8,
                                        }}
                                        className={cn(
                                          "h-full rounded-full",
                                          availableSeats > 10
                                            ? "bg-gradient-to-r from-emerald-500 to-green-400"
                                            : availableSeats > 5
                                              ? "bg-gradient-to-r from-amber-500 to-yellow-400"
                                              : "bg-gradient-to-r from-red-500 to-rose-400",
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
                          Use the arrows to reorder courses by your preference.
                          Higher priority courses will be processed first.
                        </p>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-500">
                            Total Credits:
                          </span>
                          <span className="px-2 py-1 rounded-lg bg-gray-100 border border-gray-300 text-sm font-semibold text-gray-700">
                            {recommendedCourses.reduce(
                              (sum, c) => sum + c.credits,
                              0,
                            )}
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
