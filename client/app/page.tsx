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
          "linear-gradient(165deg, #e2e8f0 0%, #cbd5e1 30%, #94a3b8 60%, #e2e8f0 100%)",
      }}
    >
      {/* Grid - glassmorphism base */}
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

      {/* Orbs - stronger for glass bleed-through */}
      <div
        className="absolute top-0 right-0 w-[560px] h-[560px] rounded-full blur-[140px] pointer-events-none opacity-70 -translate-y-1/4 translate-x-1/4"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.4) 0%, rgba(148,163,184,0.25) 40%, transparent 70%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-[480px] h-[480px] rounded-full blur-[120px] pointer-events-none opacity-60 translate-y-1/4 -translate-x-1/4"
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

      {/* Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((p, i) => (
          <motion.div
            key={i}
            className="absolute rounded-full bottom-0 bg-white/40"
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
          {/* Glass card glow / halo */}
          <div
            className="absolute -inset-1 rounded-[30px] opacity-80"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.5) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0.4) 100%)",
              filter: "blur(24px)",
            }}
          />

          {/* Main glass card - improved glassmorphism */}
          <div
            className="relative rounded-[26px] text-center overflow-hidden isolate"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              backdropFilter: "blur(24px) saturate(180%)",
              WebkitBackdropFilter: "blur(24px) saturate(180%)",
              border: "1px solid rgba(255, 255, 255, 0.45)",
              boxShadow:
                "0 8px 32px rgba(0,0,0,0.1), 0 0 0 1px rgba(255,255,255,0.1) inset, inset 0 1px 0 rgba(255,255,255,0.7)",
            }}
          >
            {/* Inner glass highlight - top edge */}
            <div
              className="absolute inset-x-0 top-0 h-[1px]"
              style={{
                background:
                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.95), transparent)",
              }}
            />
            {/* Subtle inner glow */}
            <div
              className="absolute inset-0 pointer-events-none rounded-[26px] opacity-40"
              style={{
                background:
                  "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(255,255,255,0.5), transparent 60%)",
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
                {/* Icon glass container */}
                <div
                  className="relative flex items-center justify-center rounded-2xl p-4"
                  style={{
                    background: "rgba(255, 255, 255, 0.3)",
                    backdropFilter: "blur(14px) saturate(150%)",
                    WebkitBackdropFilter: "blur(14px) saturate(150%)",
                    border: "1px solid rgba(255, 255, 255, 0.55)",
                    boxShadow:
                      "0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
                  }}
                >
                  <GraduationCap
                    className="h-11 w-11 text-slate-700"
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
                className="text-3xl sm:text-4xl md:text-[3rem] font-semibold tracking-tight mb-3 bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent drop-shadow-sm"
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

              {/* Divider label - glass pill */}
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.55 }}
                className="text-slate-600 text-sm mb-5 inline-block px-4 py-2 rounded-full"
                style={{
                  fontFamily: "var(--font-manrope), system-ui, sans-serif",
                  background: "rgba(255, 255, 255, 0.4)",
                  backdropFilter: "blur(12px) saturate(140%)",
                  WebkitBackdropFilter: "blur(12px) saturate(140%)",
                  border: "1px solid rgba(255, 255, 255, 0.55)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6)",
                }}
              >
                How would you like to continue?
              </motion.p>

              {/* Buttons - glass style */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <motion.button
                  type="button"
                  onClick={() => router.push("/register")}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.6, duration: 0.4 }}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative px-7 py-4 rounded-2xl text-white font-semibold overflow-hidden flex items-center justify-center gap-3"
                  style={{
                    fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    background: "rgba(51, 65, 85, 0.7)",
                    backdropFilter: "blur(14px) saturate(150%)",
                    WebkitBackdropFilter: "blur(14px) saturate(150%)",
                    border: "1px solid rgba(255, 255, 255, 0.2)",
                    boxShadow:
                      "0 8px 28px rgba(0,0,0,0.12), inset 0 1px 0 rgba(255,255,255,0.15)",
                  }}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
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
                  className="group relative px-7 py-4 rounded-2xl text-slate-700 font-semibold overflow-hidden flex items-center justify-center gap-3 transition-all"
                  style={{
                    fontFamily: "var(--font-raleway), system-ui, sans-serif",
                    background: "rgba(255, 255, 255, 0.4)",
                    backdropFilter: "blur(14px) saturate(150%)",
                    WebkitBackdropFilter: "blur(14px) saturate(150%)",
                    border: "1px solid rgba(255, 255, 255, 0.55)",
                    boxShadow:
                      "0 4px 20px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.65)",
                  }}
                >
                  <LogIn className="h-5 w-5 text-slate-600 group-hover:text-slate-800 transition-colors" />
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
