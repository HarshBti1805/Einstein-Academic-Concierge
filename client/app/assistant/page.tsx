"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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
  MessageCircle,
  MicOff,
  Volume2,
  Radio,
  Phone,
  PhoneOff,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { GoogleGenAI, Modality } from "@google/genai";
import { decode, decodeAudioData, createBlob } from "@/lib/audioUtils";
import LiveVisualizer from "@/components/LiveVisualizer";

// Import test data for fallback
import chatData from "@/lib/test-data/chat_data.json";

const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY ?? "";

type VoiceStatus = "idle" | "connecting" | "listening" | "speaking" | "error";
interface VoiceTranscriptLine {
  speaker: "user" | "agent";
  text: string;
}

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

// Animated voice waves component
const VoiceWaves = ({
  isActive,
  intensity = "medium",
}: {
  isActive: boolean;
  intensity?: "low" | "medium" | "high";
}) => {
  const bars = intensity === "high" ? 7 : intensity === "medium" ? 5 : 3;
  return (
    <div className="flex items-center justify-center gap-1 h-8">
      {Array.from({ length: bars }).map((_, i) => (
        <motion.div
          key={i}
          className="w-1 bg-gradient-to-t from-gray-600 to-gray-400 rounded-full"
          animate={
            isActive
              ? {
                  height: [8, 20 + Math.random() * 12, 8],
                }
              : { height: 4 }
          }
          transition={{
            duration: 0.5 + Math.random() * 0.3,
            repeat: isActive ? Infinity : 0,
            repeatType: "reverse",
            delay: i * 0.1,
          }}
        />
      ))}
    </div>
  );
};

// Pulsing ring animation for voice status
const PulsingRings = ({
  isActive,
  color = "gray",
}: {
  isActive: boolean;
  color?: string;
}) => {
  if (!isActive) return null;
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={cn(
            "absolute rounded-full border-2",
            color === "emerald"
              ? "border-emerald-400/40"
              : "border-gray-400/40",
          )}
          initial={{ width: 80, height: 80, opacity: 0.6 }}
          animate={{
            width: [80, 140],
            height: [80, 140],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
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
  const [voiceReady] = useState(() => !!GEMINI_API_KEY);
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>("idle");
  const [voiceTranscriptLines, setVoiceTranscriptLines] = useState<
    VoiceTranscriptLine[]
  >([]);
  const [currentVoiceLine, setCurrentVoiceLine] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [voiceDuration, setVoiceDuration] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageIdCounterRef = useRef<number>(1);
  const recommendationsRef = useRef<HTMLDivElement>(null);
  const geminiSessionRef = useRef<{
    close: () => void;
    sendRealtimeInput: (arg: { media: Blob }) => void;
  } | null>(null);
  const inputAudioContextRef = useRef<AudioContext | null>(null);
  const outputAudioContextRef = useRef<AudioContext | null>(null);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const lastCommittedLineRef = useRef<string>("");
  const voiceTranscriptEndRef = useRef<HTMLDivElement>(null);
  const isCleaningUpRef = useRef<boolean>(false);
  const voiceTimerRef = useRef<NodeJS.Timeout | null>(null);

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
    voiceTranscriptEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [voiceTranscriptLines, currentVoiceLine]);

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

  // Voice duration timer
  useEffect(() => {
    if (voiceStatus === "listening" || voiceStatus === "speaking") {
      voiceTimerRef.current = setInterval(() => {
        setVoiceDuration((prev) => prev + 1);
      }, 1000);
    } else {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
        voiceTimerRef.current = null;
      }
      if (voiceStatus === "idle") {
        setVoiceDuration(0);
      }
    }
    return () => {
      if (voiceTimerRef.current) {
        clearInterval(voiceTimerRef.current);
      }
    };
  }, [voiceStatus]);

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

  // Format duration for display
  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
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

  // Gemini Live voice: stop session and clean up audio
  const handleVoiceStop = useCallback(() => {
    // Prevent re-entrant cleanup
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    if (geminiSessionRef.current) {
      try {
        geminiSessionRef.current.close();
      } catch (e) {
        console.log("Error closing session:", e);
      }
      geminiSessionRef.current = null;
    }
    if (scriptProcessorRef.current) {
      try {
        scriptProcessorRef.current.disconnect();
      } catch (e) {
        console.log("Error disconnecting script processor:", e);
      }
      scriptProcessorRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (inputAudioContextRef.current) {
      void inputAudioContextRef.current.close().catch(() => {});
      inputAudioContextRef.current = null;
    }
    if (outputAudioContextRef.current) {
      void outputAudioContextRef.current.close().catch(() => {});
      outputAudioContextRef.current = null;
    }
    sourcesRef.current.forEach((s) => {
      try {
        s.stop();
      } catch {
        /* ignore */
      }
    });
    sourcesRef.current.clear();
    nextStartTimeRef.current = 0;
    setVoiceStatus("idle");

    // Reset cleanup flag after a short delay
    setTimeout(() => {
      isCleaningUpRef.current = false;
    }, 100);
  }, []);

  const handleVoiceStart = async () => {
    if (!voiceReady || !GEMINI_API_KEY) {
      setVoiceError(
        "Gemini API key not set. Add NEXT_PUBLIC_GEMINI_API_KEY to .env.",
      );
      return;
    }

    // Prevent starting if already in progress
    if (voiceStatus !== "idle" && voiceStatus !== "error") {
      return;
    }

    setVoiceError(null);
    setVoiceStatus("connecting");
    setVoiceTranscriptLines([]);
    setCurrentVoiceLine("");
    lastCommittedLineRef.current = "";
    isCleaningUpRef.current = false;

    let inputCtx: AudioContext | null = null;
    let outputCtx: AudioContext | null = null;
    let stream: MediaStream | null = null;

    try {
      const systemInstruction = `You are Einstein Copilot, a helpful and friendly course advising assistant for students. The student's name is ${studentName || "there"}. Help them figure out courses for next semester: interests, schedule preferences, prerequisites, workload balance. Be conversational and concise. Keep responses brief for voice. Do not use markdown or bullet points in spoken replies.`;

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

      // Request microphone permission first
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      streamRef.current = stream;

      // Create audio contexts
      inputCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )({ sampleRate: 16000 });
      outputCtx = new (
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext
      )({ sampleRate: 24000 });

      await inputCtx.resume();
      await outputCtx.resume();
      inputAudioContextRef.current = inputCtx;
      outputAudioContextRef.current = outputCtx;

      // Set up audio capture BEFORE connecting to prevent session closing due to no input
      const source = inputCtx.createMediaStreamSource(stream);
      const scriptProcessor = inputCtx.createScriptProcessor(4096, 1, 1);
      scriptProcessorRef.current = scriptProcessor;

      // Buffer to accumulate audio data to send
      let audioBuffer: Float32Array[] = [];
      let sendInterval: NodeJS.Timeout | null = null;

      scriptProcessor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Clone the data since it will be reused
        audioBuffer.push(new Float32Array(inputData));
      };

      source.connect(scriptProcessor);
      scriptProcessor.connect(inputCtx.destination);

      // Now connect to Gemini
      const session = await ai.live.connect({
        model: "gemini-2.0-flash-live-001",
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction,
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: "Kore" } },
          },
        },
        callbacks: {
          onopen: () => {
            console.log("Gemini session opened");
            setVoiceStatus("listening");

            // Start sending audio periodically
            sendInterval = setInterval(() => {
              if (audioBuffer.length > 0 && geminiSessionRef.current) {
                // Concatenate all buffered audio
                const totalLength = audioBuffer.reduce(
                  (sum, arr) => sum + arr.length,
                  0,
                );
                const combined = new Float32Array(totalLength);
                let offset = 0;
                for (const arr of audioBuffer) {
                  combined.set(arr, offset);
                  offset += arr.length;
                }
                audioBuffer = [];

                const pcmBlob = createBlob(combined, inputCtx!.sampleRate);
                try {
                  geminiSessionRef.current.sendRealtimeInput({
                    media: pcmBlob,
                  });
                } catch (e) {
                  console.log("Error sending audio:", e);
                }
              }
            }, 100); // Send audio every 100ms
          },
          onmessage: async (message: {
            serverContent?: {
              outputTranscription?: { text?: string };
              modelTurn?: { parts?: Array<{ inlineData?: { data?: string } }> };
              interrupted?: boolean;
              turnComplete?: boolean;
            };
          }) => {
            const sc = message.serverContent;
            if (!sc) return;

            if (sc.outputTranscription?.text) {
              setCurrentVoiceLine(
                (prev) => prev + (sc.outputTranscription!.text ?? ""),
              );
            }

            const audioData = sc.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              setVoiceStatus("speaking");
              const outputCtx = outputAudioContextRef.current;
              if (!outputCtx) return;
              nextStartTimeRef.current = Math.max(
                nextStartTimeRef.current,
                outputCtx.currentTime,
              );
              const bytes =
                typeof audioData === "string"
                  ? decode(audioData)
                  : new Uint8Array(audioData);
              const buffer = await decodeAudioData(bytes, outputCtx, 24000, 1);
              const audioSource = outputCtx.createBufferSource();
              audioSource.buffer = buffer;
              audioSource.connect(outputCtx.destination);
              audioSource.onended = () => {
                sourcesRef.current.delete(audioSource);
                if (sourcesRef.current.size === 0) setVoiceStatus("listening");
              };
              audioSource.start(nextStartTimeRef.current);
              nextStartTimeRef.current += buffer.duration;
              sourcesRef.current.add(audioSource);
            }

            if (sc.interrupted) {
              sourcesRef.current.forEach((s) => {
                try {
                  s.stop();
                } catch {
                  /* ignore */
                }
              });
              sourcesRef.current.clear();
              nextStartTimeRef.current = 0;
              setVoiceStatus("listening");
              setCurrentVoiceLine((prev) => {
                const trimmed = prev.trim();
                if (trimmed && trimmed !== lastCommittedLineRef.current) {
                  lastCommittedLineRef.current = trimmed;
                  setVoiceTranscriptLines((lines) => [
                    ...lines.slice(-19),
                    { speaker: "agent", text: trimmed },
                  ]);
                }
                return "";
              });
            }

            if (sc.turnComplete) {
              setCurrentVoiceLine((prev) => {
                const trimmed = prev.trim();
                if (trimmed && trimmed !== lastCommittedLineRef.current) {
                  lastCommittedLineRef.current = trimmed;
                  setVoiceTranscriptLines((lines) => [
                    ...lines.slice(-19),
                    { speaker: "agent", text: trimmed },
                  ]);
                }
                return "";
              });
            }
          },
          onerror: (e: { message?: string }) => {
            console.error("Gemini Live error", e);
            if (sendInterval) clearInterval(sendInterval);
            setVoiceError(e?.message ?? "Connection error. Please try again.");
            setVoiceStatus("error");
          },
          onclose: () => {
            console.log("Gemini session closed");
            if (sendInterval) clearInterval(sendInterval);
            // Only call handleVoiceStop if we're not already cleaning up
            if (!isCleaningUpRef.current) {
              handleVoiceStop();
            }
          },
        },
      });

      geminiSessionRef.current = session;
    } catch (err) {
      console.error("Voice start failed", err);
      const msg = err instanceof Error ? err.message : "Failed to connect.";
      setVoiceError(msg);
      setVoiceStatus("error");

      // Clean up on error
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
      if (inputCtx) {
        void inputCtx.close().catch(() => {});
      }
      if (outputCtx) {
        void outputCtx.close().catch(() => {});
      }
      streamRef.current = null;
      inputAudioContextRef.current = null;
      outputAudioContextRef.current = null;
    }
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
                      onClick={() => {
                        if (
                          conversationMode === "voice" &&
                          voiceStatus !== "idle"
                        ) {
                          handleVoiceStop();
                        }
                        setConversationMode("text");
                      }}
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
                          ? "Live voice chat with Gemini (English)"
                          : "Add NEXT_PUBLIC_GEMINI_API_KEY to .env for voice"
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
                    <div className="h-full flex flex-col p-5">
                      {/* Voice Mode Content */}
                      <div className="flex-1 flex flex-col items-center justify-center">
                        {/* Connecting State */}
                        {voiceStatus === "connecting" && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-6"
                          >
                            <div className="relative">
                              <div className="h-32 w-32 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 flex items-center justify-center">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: "linear",
                                  }}
                                  className="h-16 w-16 rounded-full border-4 border-gray-200 border-t-gray-600"
                                />
                              </div>
                              <motion.div
                                className="absolute inset-0 rounded-full border-2 border-gray-400/50"
                                animate={{
                                  scale: [1, 1.2, 1],
                                  opacity: [0.5, 0, 0.5],
                                }}
                                transition={{ duration: 2, repeat: Infinity }}
                              />
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-medium text-gray-700">
                                Connecting...
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                Setting up voice chat
                              </p>
                            </div>
                          </motion.div>
                        )}

                        {/* Active Voice States */}
                        {(voiceStatus === "listening" ||
                          voiceStatus === "speaking") && (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center gap-6"
                          >
                            {/* Main Voice Orb */}
                            <div className="relative">
                              <PulsingRings
                                isActive={voiceStatus === "speaking"}
                                color={
                                  voiceStatus === "speaking"
                                    ? "gray"
                                    : "emerald"
                                }
                              />
                              <motion.div
                                className={cn(
                                  "h-32 w-32 rounded-full flex items-center justify-center transition-all duration-300",
                                  voiceStatus === "speaking"
                                    ? "bg-gradient-to-br from-gray-700 via-gray-800 to-black shadow-2xl shadow-gray-500/40"
                                    : "bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 shadow-lg",
                                )}
                                animate={
                                  voiceStatus === "speaking"
                                    ? {
                                        scale: [1, 1.05, 1],
                                      }
                                    : {}
                                }
                                transition={{ duration: 0.8, repeat: Infinity }}
                              >
                                {voiceStatus === "speaking" ? (
                                  <Volume2 className="h-12 w-12 text-white" />
                                ) : (
                                  <Mic className="h-12 w-12 text-gray-600" />
                                )}
                              </motion.div>

                              {/* Status Ring */}
                              <motion.div
                                className={cn(
                                  "absolute -inset-2 rounded-full border-4",
                                  voiceStatus === "speaking"
                                    ? "border-gray-600/30"
                                    : "border-emerald-500/30",
                                )}
                                animate={{ rotate: 360 }}
                                transition={{
                                  duration: 8,
                                  repeat: Infinity,
                                  ease: "linear",
                                }}
                                style={{
                                  borderTopColor:
                                    voiceStatus === "speaking"
                                      ? "rgba(75, 85, 99, 0.8)"
                                      : "rgba(16, 185, 129, 0.8)",
                                  borderRightColor: "transparent",
                                }}
                              />
                            </div>

                            {/* Voice Visualizer */}
                            <div className="h-12 flex items-center">
                              <VoiceWaves
                                isActive={
                                  voiceStatus === "speaking" ||
                                  voiceStatus === "listening"
                                }
                                intensity={
                                  voiceStatus === "speaking" ? "high" : "medium"
                                }
                              />
                            </div>

                            {/* Status Text */}
                            <div className="text-center">
                              <p className="text-lg font-medium text-gray-700">
                                {voiceStatus === "speaking"
                                  ? "Einstein is speaking"
                                  : "Listening..."}
                              </p>
                              <p className="text-sm text-gray-500 mt-1">
                                {voiceStatus === "speaking"
                                  ? "Wait for response to complete"
                                  : "Speak naturally, I'm listening"}
                              </p>
                            </div>

                            {/* Duration Counter */}
                            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-gray-100 border border-gray-200">
                              <Radio className="h-3 w-3 text-emerald-500 animate-pulse" />
                              <span className="text-sm font-mono text-gray-600">
                                {formatDuration(voiceDuration)}
                              </span>
                            </div>
                          </motion.div>
                        )}

                        {/* Idle / Error State */}
                        {(voiceStatus === "idle" ||
                          voiceStatus === "error") && (
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex flex-col items-center gap-6 max-w-md text-center"
                          >
                            {voiceError && (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="w-full rounded-2xl bg-red-50 border border-red-200 px-5 py-4"
                              >
                                <div className="flex items-start gap-3">
                                  <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
                                  <div className="text-left">
                                    <p className="text-sm font-medium text-red-800">
                                      Connection Error
                                    </p>
                                    <p className="text-sm text-red-600 mt-1">
                                      {voiceError}
                                    </p>
                                  </div>
                                </div>
                              </motion.div>
                            )}

                            <div className="relative">
                              <div className="h-28 w-28 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 border-2 border-gray-300 flex items-center justify-center shadow-lg">
                                <MicOff className="h-10 w-10 text-gray-400" />
                              </div>
                            </div>

                            <div>
                              <h3 className="text-xl font-semibold text-gray-800">
                                Voice Chat
                              </h3>
                              <p className="text-sm text-gray-500 mt-2 leading-relaxed">
                                Have a natural conversation with Einstein
                                Copilot. Click the button below to start
                                speaking.
                              </p>
                            </div>

                            <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100">
                                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>Real-time</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100">
                                <Volume2 className="h-3 w-3" />
                                <span>Natural voice</span>
                              </div>
                              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100">
                                <Sparkles className="h-3 w-3" />
                                <span>AI-powered</span>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>

                      {/* Transcript Section */}
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className={cn(
                          "mt-4 rounded-xl border overflow-hidden transition-all",
                          voiceTranscriptLines.length > 0 || currentVoiceLine
                            ? "bg-white border-gray-200 shadow-sm"
                            : "bg-gray-50/80 border-gray-100",
                        )}
                        style={{ maxHeight: 180 }}
                      >
                        <div className="px-4 py-2.5 border-b border-gray-100 bg-gray-50/80 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ClipboardList className="h-3.5 w-3.5 text-gray-500" />
                            <span className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
                              Live Transcript
                            </span>
                          </div>
                          {voiceTranscriptLines.length > 0 && (
                            <span className="text-[10px] text-gray-400">
                              {voiceTranscriptLines.length} message
                              {voiceTranscriptLines.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div
                          className="p-4 overflow-y-auto"
                          style={{ maxHeight: 130 }}
                        >
                          {voiceTranscriptLines.length === 0 &&
                            !currentVoiceLine && (
                              <p className="text-sm text-gray-400 italic text-center py-4">
                                Transcript will appear here as you speak...
                              </p>
                            )}
                          <div className="space-y-3">
                            {voiceTranscriptLines.map((line, i) => (
                              <motion.div
                                key={i}
                                initial={{
                                  opacity: 0,
                                  x: line.speaker === "agent" ? -10 : 10,
                                }}
                                animate={{ opacity: 1, x: 0 }}
                                className={cn(
                                  "flex gap-2",
                                  line.speaker === "agent"
                                    ? "justify-start"
                                    : "justify-end",
                                )}
                              >
                                {line.speaker === "agent" && (
                                  <div className="h-6 w-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0">
                                    <Bot className="h-3 w-3 text-white" />
                                  </div>
                                )}
                                <div
                                  className={cn(
                                    "px-3 py-2 rounded-xl max-w-[80%]",
                                    line.speaker === "agent"
                                      ? "bg-gray-100 text-gray-700"
                                      : "bg-gray-700 text-white",
                                  )}
                                >
                                  <p className="text-sm leading-relaxed">
                                    {line.text}
                                  </p>
                                </div>
                                {line.speaker === "user" && (
                                  <div className="h-6 w-6 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                                    <User className="h-3 w-3 text-gray-600" />
                                  </div>
                                )}
                              </motion.div>
                            ))}
                            {currentVoiceLine.trim() && (
                              <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex gap-2 justify-start"
                              >
                                <div className="h-6 w-6 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center flex-shrink-0">
                                  <Bot className="h-3 w-3 text-white" />
                                </div>
                                <div className="px-3 py-2 rounded-xl bg-gray-100 text-gray-700 max-w-[80%]">
                                  <p className="text-sm leading-relaxed">
                                    {currentVoiceLine}
                                    <motion.span
                                      className="inline-block w-1.5 h-4 bg-gray-500 ml-1 align-middle rounded-sm"
                                      animate={{ opacity: [1, 0, 1] }}
                                      transition={{
                                        duration: 0.8,
                                        repeat: Infinity,
                                      }}
                                    />
                                  </p>
                                </div>
                              </motion.div>
                            )}
                          </div>
                          <div ref={voiceTranscriptEndRef} />
                        </div>
                      </motion.div>
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
                    <div className="flex flex-col items-center gap-4">
                      {voiceReady ? (
                        <div className="flex items-center gap-4">
                          {(voiceStatus === "idle" ||
                            voiceStatus === "error") && (
                            <motion.button
                              type="button"
                              onClick={handleVoiceStart}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="group flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-gradient-to-r from-gray-800 to-black text-white font-medium shadow-xl hover:shadow-2xl hover:shadow-gray-500/30 transition-all"
                            >
                              <div className="relative">
                                <Phone className="h-5 w-5" />
                                <motion.div
                                  className="absolute -inset-1 rounded-full bg-white/20"
                                  animate={{
                                    scale: [1, 1.5, 1],
                                    opacity: [0.5, 0, 0.5],
                                  }}
                                  transition={{ duration: 2, repeat: Infinity }}
                                />
                              </div>
                              <span>Start Voice Chat</span>
                            </motion.button>
                          )}

                          {(voiceStatus === "listening" ||
                            voiceStatus === "speaking" ||
                            voiceStatus === "connecting") && (
                            <motion.button
                              type="button"
                              onClick={handleVoiceStop}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex items-center gap-3 px-6 py-3.5 rounded-2xl bg-red-50 border-2 border-red-200 text-red-700 font-medium hover:bg-red-100 hover:border-red-300 transition-all shadow-lg"
                            >
                              <PhoneOff className="h-5 w-5" />
                              <span>End Call</span>
                              <div className="flex items-center gap-1 ml-2 pl-3 border-l border-red-200">
                                <span className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                                <span className="text-sm font-mono">
                                  {formatDuration(voiceDuration)}
                                </span>
                              </div>
                            </motion.button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 px-5 py-3 rounded-xl bg-amber-50 border border-amber-200">
                          <AlertCircle className="h-5 w-5 text-amber-600" />
                          <p className="text-sm text-amber-700">
                            Add{" "}
                            <code className="px-1.5 py-0.5 bg-amber-100 rounded text-xs">
                              NEXT_PUBLIC_GEMINI_API_KEY
                            </code>{" "}
                            to enable voice chat
                          </p>
                        </div>
                      )}

                      <p className="text-xs text-gray-400 text-center max-w-md">
                        {voiceStatus === "idle" || voiceStatus === "error"
                          ? "Use headphones for best experience. Voice chat is powered by Gemini."
                          : "Speak naturally. The AI will respond when you pause."}
                      </p>
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
