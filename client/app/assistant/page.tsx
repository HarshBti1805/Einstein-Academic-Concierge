"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  text: string;
  sender: "user" | "agent";
  timestamp: Date;
}

export default function AssistantPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your course registration assistant. I can help you find and register for courses based on your academic goals, prerequisites, and personal constraints. How can I assist you today?",
      sender: "agent",
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

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

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate agent response (in real app, this would be an API call)
    setTimeout(() => {
      const agentResponse = generateAgentResponse(inputMessage);
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: agentResponse,
        sender: "agent",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, agentMessage]);
      setIsTyping(false);
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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[calc(100vh-12rem)]">
          {/* Left Side - Message Prompt Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Your Messages</h2>
              <p className="text-sm text-gray-600 mt-1">Type your questions or requests here</p>
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <p className="text-xs font-medium text-gray-700 mb-2">Quick Actions:</p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuickAction(action.text)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 hover:border-blue-500 hover:text-blue-600 transition-colors"
                  >
                    <span>{action.icon}</span>
                    <span>{action.text}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Message Input Area */}
            <div className="flex-1 flex flex-col p-6">
              <form onSubmit={handleSendMessage} className="flex-1 flex flex-col">
                <textarea
                  ref={inputRef}
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message here... (e.g., 'I want to register for CS301 and CS302', 'What courses are available?', 'Check my prerequisites')"
                  className="flex-1 w-full px-4 py-3 text-gray-900 bg-gray-50 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={8}
                />
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-gray-500">
                    Press Enter to send, Shift+Enter for new line
                  </p>
                  <button
                    type="submit"
                    disabled={!inputMessage.trim() || isTyping}
                    className="px-6 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg shadow-lg shadow-blue-500/30 hover:from-blue-700 hover:to-indigo-700 hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                    Send Message
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Right Side - Agent Response Area */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
                  <p className="text-xs text-gray-600">Einstein Copilot is ready to help</p>
                </div>
              </div>
            </div>

            {/* Messages Display */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      message.sender === "user"
                        ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white"
                        : "bg-gray-100 text-gray-900 border border-gray-200"
                    }`}
                  >
                    <div className="text-sm whitespace-pre-wrap">{message.text}</div>
                    <div
                      className={`text-xs mt-2 ${
                        message.sender === "user" ? "text-blue-100" : "text-gray-500"
                      }`}
                    >
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-2xl px-4 py-3 border border-gray-200">
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1.5">
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
                        <div className="h-2 w-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
                      </div>
                      <span className="text-xs text-gray-500 ml-2">Agent is typing...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Agent Status */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Agent is online and ready to assist</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
