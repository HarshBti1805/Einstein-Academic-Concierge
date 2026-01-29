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
      className={`min-h-screen flex items-center justify-center relative overflow-hidden py-8 px-4 sm:px-6 ${fontVariables}`}
      style={{
        background:
          "linear-gradient(165deg, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 60%, #e2e8f0 100%)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)
            `,
            backgroundSize: "40px 40px",
          }}
        />
      </div>
      <div
        className="orb-1 absolute top-1/4 -left-32 w-[560px] h-[560px] rounded-full blur-[140px] pointer-events-none opacity-70"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(148,163,184,0.25) 40%, transparent 70%)",
        }}
      />
      <div
        className="orb-2 absolute bottom-1/4 -right-32 w-[480px] h-[480px] rounded-full blur-[120px] pointer-events-none opacity-60"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.35) 0%, rgba(148,163,184,0.2) 50%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[720px] h-[720px] rounded-full blur-[160px] pointer-events-none opacity-50 -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(226,232,240,0.3) 50%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full bottom-0"
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
          <div
            className="absolute -inset-1 rounded-[30px] opacity-80"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.4) 100%)",
              filter: "blur(24px)",
            }}
          />
          <div
            ref={cardRef}
            className="relative rounded-[26px] p-6 sm:p-8 overflow-hidden isolate"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.45)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1) inset, inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            <div
              className="absolute inset-x-0 top-0 h-[1px] pointer-events-none"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
              }}
            />
            <div
              className="absolute inset-0 pointer-events-none rounded-[26px] opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.5), transparent 60%)",
              }}
            />
            <div className="text-center mb-8 relative">
              <motion.div
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                }}
                className="float-icon inline-flex items-center justify-center rounded-2xl mb-4 p-3"
                style={{
                  background: "rgba(255, 255, 255, 0.3)",
                  backdropFilter: "blur(14px) saturate(150%)",
                  WebkitBackdropFilter: "blur(14px) saturate(150%)",
                  border: "1px solid rgba(255, 255, 255, 0.55)",
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <GraduationCap className="h-9 w-9 text-slate-700" />
              </motion.div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-2xl sm:text-3xl mb-2 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent"
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
                className="text-slate-600 flex items-center justify-center gap-2"
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
                      className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-white/30 outline-none transition-all"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                        background: "rgba(255, 255, 255, 0.35)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.5)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
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
                      className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-white/30 outline-none transition-all"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                        background: "rgba(255, 255, 255, 0.35)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.5)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
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
                      className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-white/30 outline-none transition-all"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                        background: "rgba(255, 255, 255, 0.35)",
                        backdropFilter: "blur(10px)",
                        WebkitBackdropFilter: "blur(10px)",
                        border: "1px solid rgba(255, 255, 255, 0.5)",
                        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
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
                    className="p-4 rounded-xl flex items-center gap-3"
                    style={{
                      background: "rgba(254, 226, 226, 0.5)",
                      backdropFilter: "blur(10px)",
                      WebkitBackdropFilter: "blur(10px)",
                      border: "1px solid rgba(248, 113, 113, 0.4)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)",
                    }}
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
                  background: "rgba(51, 65, 85, 0.7)",
                  backdropFilter: "blur(14px) saturate(150%)",
                  WebkitBackdropFilter: "blur(14px) saturate(150%)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  boxShadow:
                    "0 8px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
                }}
              >
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
              className="mt-6 text-center text-sm text-slate-600 relative"
              style={{
                fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
              }}
            >
              New here?{" "}
              <Link
                href="/register"
                className="text-slate-700 font-medium hover:underline"
              >
                Register
              </Link>
              {" · "}
              <Link href="/" className="text-slate-600 hover:underline">
                Back
              </Link>
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
