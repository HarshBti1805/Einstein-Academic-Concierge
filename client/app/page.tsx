"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { fontVariables } from "@/lib/fonts";
import {
  GraduationCap,
  UserPlus,
  LogIn,
  Sparkles,
  Shield,
  ArrowRight,
} from "lucide-react";

export default function WelcomePage() {
  const router = useRouter();
  const [particles, setParticles] = useState<
    Array<{ left: string; duration: number; delay: number; size: number }>
  >([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = setTimeout(() => {
      setParticles(
        Array.from({ length: 18 }, () => ({
          left: `${Math.random() * 100}%`,
          duration: 12 + Math.random() * 10,
          delay: Math.random() * 10,
          size: Math.random() > 0.6 ? 2 : 1,
        })),
      );
    }, 0);
    return () => clearTimeout(id);
  }, []);

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative overflow-hidden py-8 px-4 sm:px-6 ${fontVariables}`}
      style={{
        background:
          "linear-gradient(165deg, #f8fafc 0%, #f1f5f9 35%, #e2e8f0 70%, #f1f5f9 100%)",
      }}
    >
      {/* Grid */}
      <div
        className="absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(148, 163, 184, 0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(148, 163, 184, 0.08) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
        }}
      />

      {/* Orbs */}
      <div
        className="absolute top-0 right-0 w-[560px] h-[560px] rounded-full blur-[120px] pointer-events-none opacity-60 -translate-y-1/4 translate-x-1/4"
        style={{
          background:
            "radial-gradient(circle, rgba(148,163,184,0.35) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[480px] h-[480px] rounded-full blur-[100px] pointer-events-none opacity-50 translate-y-1/4 -translate-x-1/4"
        style={{
          background:
            "radial-gradient(circle, rgba(148,163,184,0.3) 0%, transparent 70%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[640px] h-[640px] rounded-full blur-[140px] pointer-events-none opacity-30 -translate-x-1/2 -translate-y-1/2"
        style={{
          background:
            "radial-gradient(circle, rgba(226,232,240,0.8) 0%, transparent 65%)",
        }}
      />

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bottom-0 bg-slate-400/50"
            style={{
              left: p.left,
              width: p.size,
              height: p.size,
            }}
            animate={{
              y: "-100vh",
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: p.duration,
              repeat: Infinity,
              delay: p.delay,
              ease: "linear",
            }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-xl">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          {/* Card glow */}
          <div
            className="absolute -inset-px rounded-[28px] opacity-60"
            style={{
              background:
                "linear-gradient(135deg, rgba(148,163,184,0.4) 0%, rgba(226,232,240,0.5) 50%, rgba(148,163,184,0.4) 100%)",
              filter: "blur(20px)",
            }}
          />

          <div className="relative rounded-[26px] border border-slate-200/80 bg-white/95 backdrop-blur-2xl shadow-xl shadow-slate-400/10 text-center overflow-hidden">
            {/* Top highlight */}
            <div
              className="absolute inset-x-0 top-0 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent)",
              }}
            />

            <div className="relative p-8 sm:p-10 md:p-12">
              {/* Badge */}
              {/* <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100/80 text-slate-600 text-xs font-medium tracking-wide mb-6"
                style={{
                  fontFamily:
                    "var(--font-space-grotesk), system-ui, sans-serif",
                }}
              >
                <Sparkles className="h-3.5 w-3.5 text-slate-500" />
                AI-Powered Registration
              </motion.div> */}

              {/* Icon */}
              <motion.div
                initial={{ scale: 0, rotate: -12, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 18,
                  delay: 0.2,
                }}
                className="relative inline-flex mb-6"
              >
                <div
                  className="absolute -inset-3 rounded-3xl opacity-40"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(71,85,105,0.2) 0%, transparent 70%)",
                    filter: "blur(12px)",
                  }}
                />
                <div className="relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-4 shadow-lg shadow-slate-900/25 ring-1 ring-white/10">
                  <GraduationCap
                    className="h-11 w-11 text-white"
                    strokeWidth={1.5}
                  />
                </div>
              </motion.div>

              {/* Title */}
              <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.45 }}
                className="text-slate-500 text-sm font-medium tracking-widest uppercase mb-2"
                style={{
                  fontFamily:
                    "var(--font-space-grotesk), system-ui, sans-serif",
                }}
              >
                Welcome to
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4, duration: 0.5 }}
                className="text-3xl sm:text-4xl md:text-[3rem] font-semibold tracking-tight mb-3 bg-gradient-to-r from-slate-800 via-slate-900 to-slate-800 bg-clip-text text-transparent"
                style={{
                  fontFamily: "var(--font-vonique), system-ui, sans-serif",
                  letterSpacing: "0.04em",
                }}
              >
                Student Portal
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
                className="text-slate-500 text-base max-w-sm mx-auto mb-10"
                style={{
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                }}
              >
                Sign in or create an account to access your dashboard and
                courses.
              </motion.p>

              {/* Divider label */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="text-slate-400 text-sm mb-5"
                style={{
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                }}
              >
                How would you like to continue?
              </motion.p>

              {/* Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  type="button"
                  onClick={() => router.push("/register")}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-7 py-4 rounded-2xl bg-gradient-to-r from-slate-700 via-slate-800 to-slate-900 text-white font-semibold shadow-lg shadow-slate-900/25 overflow-hidden flex items-center justify-center gap-3 ring-1 ring-black/10"
                  style={{
                    fontFamily: "var(--font-raleway), system-ui, sans-serif",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  <UserPlus className="h-5 w-5 relative z-10" />
                  <span className="relative z-10">New student</span>
                  <ArrowRight className="h-4 w-4 relative z-10 opacity-70 group-hover:translate-x-0.5 group-hover:opacity-100 transition-all" />
                </motion.button>
                <motion.button
                  type="button"
                  onClick={() => router.push("/login")}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.65, duration: 0.4 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-7 py-4 rounded-2xl bg-white border-2 border-slate-200 text-slate-700 font-semibold hover:border-slate-400 hover:bg-slate-50/80 overflow-hidden flex items-center justify-center gap-3 transition-colors shadow-sm"
                  style={{
                    fontFamily: "var(--font-raleway), system-ui, sans-serif",
                  }}
                >
                  <LogIn className="h-5 w-5 text-slate-500 group-hover:text-slate-700 transition-colors" />
                  <span>Returning student</span>
                </motion.button>
              </div>

              {/* Trust line */}
              {/* <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.85 }}
                className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-center gap-2 text-slate-400 text-xs"
                style={{
                  fontFamily:
                    "var(--font-space-grotesk), system-ui, sans-serif",
                }}
              >
                <Shield className="h-3.5 w-3.5" />
                <span>Secure sign-in</span>
              </motion.div> */}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
