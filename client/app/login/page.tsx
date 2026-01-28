"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fontVariables } from "@/lib/fonts";
import {
  GraduationCap,
  Mail,
  Hash,
  Building2,
  ArrowRight,
  Sparkles,
  Loader2,
  Check,
  AlertCircle,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface ReturningLoginResponse {
  success: boolean;
  message: string;
  token?: string;
  student?: {
    student_id: string;
    name: string;
    email: string;
    rollNumber: string;
  };
}

export default function LoginPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [email, setEmail] = useState("");
  const [university, setUniversity] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);
  const [particles, setParticles] = useState<
    Array<{ left: string; duration: number; delay: number }>
  >([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setParticles(
        Array.from({ length: 15 }, () => ({
          left: `${Math.random() * 100}%`,
          duration: 10 + Math.random() * 10,
          delay: Math.random() * 10,
        })),
      );
    }
  }, []);

  useEffect(() => {
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: -5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/returning-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          rollNumber: rollNumber.trim(),
          university: university.trim(),
        }),
      });
      const data: ReturningLoginResponse = await res.json();
      if (!data.success || !data.token || !data.student) {
        setError(data.message || "Invalid email, roll number, or university.");
        setIsLoading(false);
        return;
      }
      setIsSuccess(true);
      setTimeout(() => {
        if (formRef.current) {
          gsap.to(formRef.current, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            onComplete: () => {
              sessionStorage.setItem("authToken", data.token!);
              sessionStorage.setItem(
                "studentData",
                JSON.stringify({
                  student_id: data.student!.student_id,
                  name: data.student!.name,
                  email: data.student!.email,
                  rollNumber: data.student!.rollNumber,
                }),
              );
              router.push("/dashboard");
            },
          });
        }
      }, 800);
    } catch (err) {
      setError("Unable to connect. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative overflow-hidden py-8 bg-gradient-to-br from-slate-50 via-white to-gray-100 ${fontVariables}`}
    >
      <div className="absolute inset-0 overflow-hidden">
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
      </div>
      <div className="orb-1 absolute top-1/4 -left-32 w-[500px] h-[500px] bg-gray-200/40 rounded-full blur-[120px] pointer-events-none" />
      <div className="orb-2 absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-gray-300/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-gray-400/40 rounded-full bottom-0"
            style={{ left: p.left }}
            animate={{ y: "-100vh", opacity: [0, 0.5, 0] }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-md px-4 sm:px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-gray-200/50 via-gray-300/50 to-gray-200/50 rounded-[28px] blur-xl opacity-70" />
          <div
            ref={cardRef}
            className="relative bg-white/90 backdrop-blur-2xl rounded-[26px] p-6 sm:p-8 border border-gray-200/60 shadow-xl shadow-gray-500/5"
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
                className="float-icon inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-lg shadow-gray-900/30 mb-4 p-3"
              >
                <GraduationCap className="h-9 w-9 text-white" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl sm:text-3xl mb-2 bg-gradient-to-r from-gray-800 via-gray-900 to-black bg-clip-text text-transparent"
                style={{
                  fontFamily: "var(--font-vonique), system-ui, sans-serif",
                }}
              >
                Welcome back
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-500 flex items-center justify-center gap-2"
                style={{
                  fontFamily:
                    "var(--font-space-grotesk), system-ui, sans-serif",
                }}
              >
                <Sparkles className="h-4 w-4" />
                Sign in to continue
              </motion.p>
            </div>

            <motion.form
              ref={formRef}
              onSubmit={handleSubmit}
              className="space-y-5"
            >
              <div>
                <label
                  htmlFor="university"
                  className={`block text-sm font-medium mb-2 ${focused === "university" ? "text-gray-900" : "text-gray-600"}`}
                  style={{
                    fontFamily:
                      "var(--font-bogita-mono), system-ui, sans-serif",
                  }}
                >
                  University
                </label>
                <div className="relative group">
                  <div
                    className={`absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                      focused === "university"
                        ? "opacity-20"
                        : "group-hover:opacity-10"
                    }`}
                  />
                  <div className="relative flex items-center">
                    <Building2
                      className={`absolute left-4 h-[18px] w-[18px] transition-all ${
                        focused === "university"
                          ? "text-gray-900 scale-110"
                          : "text-gray-400"
                      }`}
                    />
                    <input
                      id="university"
                      type="text"
                      value={university}
                      onChange={(e) => {
                        setUniversity(e.target.value);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocused("university")}
                      onBlur={() => setFocused(null)}
                      required
                      placeholder="Metropolitan State University"
                      className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 bg-gray-50/80 border border-gray-200 rounded-xl focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-500/20 outline-none transition-all"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="email"
                  className={`block text-sm font-medium mb-2 ${focused === "email" ? "text-gray-900" : "text-gray-600"}`}
                  style={{
                    fontFamily:
                      "var(--font-bogita-mono), system-ui, sans-serif",
                  }}
                >
                  Email
                </label>
                <div className="relative group">
                  <div
                    className={`absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                      focused === "email"
                        ? "opacity-20"
                        : "group-hover:opacity-10"
                    }`}
                  />
                  <div className="relative flex items-center">
                    <Mail
                      className={`absolute left-4 h-[18px] w-[18px] transition-all ${
                        focused === "email"
                          ? "text-gray-900 scale-110"
                          : "text-gray-400"
                      }`}
                    />
                    <input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocused("email")}
                      onBlur={() => setFocused(null)}
                      required
                      placeholder="you@university.edu"
                      className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 bg-gray-50/80 border border-gray-200 rounded-xl focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-500/20 outline-none transition-all"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                      }}
                    />
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="rollNumber"
                  className={`block text-sm font-medium mb-2 ${focused === "rollNumber" ? "text-gray-900" : "text-gray-600"}`}
                  style={{
                    fontFamily:
                      "var(--font-bogita-mono), system-ui, sans-serif",
                  }}
                >
                  Roll number
                </label>
                <div className="relative group">
                  <div
                    className={`absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                      focused === "rollNumber"
                        ? "opacity-20"
                        : "group-hover:opacity-10"
                    }`}
                  />
                  <div className="relative flex items-center">
                    <Hash
                      className={`absolute left-4 h-[18px] w-[18px] transition-all ${
                        focused === "rollNumber"
                          ? "text-gray-900 scale-110"
                          : "text-gray-400"
                      }`}
                    />
                    <input
                      id="rollNumber"
                      type="text"
                      value={rollNumber}
                      onChange={(e) => {
                        setRollNumber(e.target.value);
                        if (error) setError(null);
                      }}
                      onFocus={() => setFocused("rollNumber")}
                      onBlur={() => setFocused(null)}
                      required
                      placeholder="CS2024-001"
                      className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-400 bg-gray-50/80 border border-gray-200 rounded-xl focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-500/20 outline-none transition-all"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                      }}
                    />
                  </div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3"
                  >
                    <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
                    <p
                      className="text-sm text-red-700"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    >
                      {error}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.button
                type="submit"
                disabled={isLoading || isSuccess}
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                className="relative group w-full px-8 py-4 flex items-center justify-center gap-3 text-white font-thin text-lg rounded-xl overflow-hidden disabled:cursor-not-allowed transition-all"
                style={{
                  fontFamily: "var(--font-poppins), system-ui, sans-serif",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-900 to-black" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                <span
                  className="relative z-10 flex items-center gap-2"
                  style={{
                    fontFamily: "var(--font-vonique), system-ui, sans-serif",
                  }}
                >
                  {isSuccess ? (
                    <>
                      <Check className="h-5 w-5" />
                      <span className="text-lg">Success!</span>
                    </>
                  ) : isLoading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </span>
              </motion.button>
            </motion.form>

            <p
              className="mt-6 text-center text-sm text-gray-500"
              style={{
                fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
              }}
            >
              New here?{" "}
              <Link
                href="/register"
                className="text-gray-800 font-medium hover:underline"
              >
                Register
              </Link>
              {" · "}
              <Link href="/" className="text-gray-600 hover:underline">
                Back
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
