"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fontVariables } from "@/lib/fonts";
import {
  GraduationCap,
  User,
  Hash,
  Mail,
  Building2,
  ArrowRight,
  Sparkles,
  Calendar,
  BookOpen,
  MessageSquare,
  ChevronDown,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  student?: {
    student_id: string;
    name: string;
    email: string;
    rollNumber: string;
    universityName: string;
    branch: string;
    yearOfStudy: number;
    expectedGraduation: number;
  };
}

export default function RegisterPage() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const [formData, setFormData] = useState({
    name: "",
    rollNumber: "",
    email: "",
    university: "",
    yearOfStudy: "",
    passoutYear: "",
    branch: "",
    aboutYourself: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [particles, setParticles] = useState<
    Array<{
      x: number;
      y: number;
      duration: number;
      delay: number;
      left: string;
    }>
  >([]);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setParticles(
        Array.from({ length: 15 }, () => ({
          x: Math.random() * window.innerWidth,
          y: window.innerHeight + 10,
          duration: 10 + Math.random() * 10,
          delay: Math.random() * 10,
          left: `${Math.random() * 100}%`,
        })),
      );
    }
  }, []);

  useEffect(() => {
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out" },
      );
    }
    gsap.to(".float-icon", {
      y: -8,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
      delay: 0.5,
    });
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: -5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
    gsap.to(".orb-1", {
      x: 30,
      y: -20,
      duration: 8,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    gsap.to(".orb-2", {
      x: -30,
      y: 20,
      duration: 10,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
    gsap.to(".orb-3", {
      scale: 1.1,
      duration: 6,
      repeat: -1,
      yoyo: true,
      ease: "sine.inOut",
    });
  }, []);

  const loginWithAPI = async (
    data: typeof formData,
  ): Promise<LoginResponse> => {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: data.name.trim(),
        rollNumber: data.rollNumber.trim(),
        email: data.email.trim(),
        university: data.university.trim(),
        yearOfStudy: data.yearOfStudy,
        passoutYear: data.passoutYear,
        branch: data.branch.trim(),
      }),
    });
    return response.json();
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    if (error) setError(null);
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      const response = await loginWithAPI(formData);
      if (!response.success || !response.token || !response.student) {
        setIsLoading(false);
        setError(
          response.message ||
            "Invalid credentials. Please check your information and try again.",
        );
        return;
      }
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        if (formRef.current) {
          gsap.to(formRef.current, {
            opacity: 0,
            y: -20,
            duration: 0.3,
            onComplete: () => {
              sessionStorage.setItem("authToken", response.token!);
              sessionStorage.setItem(
                "studentData",
                JSON.stringify({
                  student_id: response.student!.student_id,
                  name: response.student!.name,
                  email: response.student!.email,
                  rollNumber: response.student!.rollNumber,
                }),
              );
              router.push("/survey");
            },
          });
        }
      }, 1000);
    } catch (err) {
      setIsLoading(false);
      setError("Unable to connect to server. Please try again later.");
      console.error("Login error:", err);
    }
  };

  const leftColumnFields = [
    {
      name: "name",
      label: "Full Name",
      type: "text",
      icon: User,
      placeholder: "Alex Thompson",
    },
    {
      name: "rollNumber",
      label: "Roll Number",
      type: "text",
      icon: Hash,
      placeholder: "CS2024-001",
    },
    {
      name: "email",
      label: "Email Address",
      type: "email",
      icon: Mail,
      placeholder: "alex.thompson@university.edu",
    },
    {
      name: "university",
      label: "University Name",
      type: "text",
      icon: Building2,
      placeholder: "Metropolitan State University",
    },
  ];

  const rightColumnFields = [
    {
      name: "yearOfStudy",
      label: "Year of Study",
      type: "select",
      icon: Calendar,
      placeholder: "Select year",
      options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"],
    },
    {
      name: "passoutYear",
      label: "Expected Graduation Year",
      type: "select",
      icon: GraduationCap,
      placeholder: "Select year",
      options: ["2024", "2025", "2026", "2027", "2028", "2029"],
    },
    {
      name: "branch",
      label: "Branch / Major",
      type: "text",
      icon: BookOpen,
      placeholder: "Computer Science",
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.2 },
    },
  };
  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring" as const, stiffness: 100, damping: 12 },
    },
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
            backgroundImage: `linear-gradient(rgba(255,255,255,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.15) 1px, transparent 1px)`,
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
        className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[720px] h-[720px] rounded-full blur-[160px] pointer-events-none opacity-50"
        style={{
          background:
            "radial-gradient(circle, rgba(255,255,255,0.5) 0%, rgba(226,232,240,0.3) 50%, transparent 65%)",
        }}
      />
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-white/40 rounded-full"
            initial={{ x: particle.x, y: particle.y }}
            animate={{ y: -10, opacity: [0, 0.5, 0] }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear",
            }}
            style={{ left: particle.left }}
          />
        ))}
      </div>

      <div className="relative z-10 w-full max-w-4xl px-4 sm:px-6">
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
            className="relative rounded-[26px] p-6 sm:p-8 md:p-10 overflow-hidden isolate"
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
            <div className="text-center mb-10 relative">
              <motion.div
                initial={{ scale: 0, rotate: -180, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{
                  type: "spring",
                  stiffness: 200,
                  damping: 15,
                  delay: 0.1,
                  opacity: { duration: 0.3, delay: 0.1 },
                }}
                className="float-icon inline-flex items-center justify-center rounded-2xl mb-6 p-4 relative"
                style={{
                  opacity: 1,
                  background: "rgba(255, 255, 255, 0.3)",
                  backdropFilter: "blur(14px) saturate(150%)",
                  WebkitBackdropFilter: "blur(14px) saturate(150%)",
                  border: "1px solid rgba(255, 255, 255, 0.55)",
                  boxShadow:
                    "0 8px 24px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.5)",
                }}
              >
                <GraduationCap className="h-10 w-10 text-slate-700 relative z-10" />
              </motion.div>
              <motion.h1
                ref={titleRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-3xl sm:text-4xl mb-3 bg-gradient-to-r from-gray-800 via-gray-900 to-black bg-clip-text text-transparent"
                style={{
                  fontFamily: "var(--font-vonique), system-ui, sans-serif",
                }}
              >
                STUDENT REGISTRATION
              </motion.h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-gray-500 text-lg flex items-center justify-center gap-2"
                style={{
                  fontFamily:
                    "var(--font-space-grotesk), system-ui, sans-serif",
                }}
              >
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="h-4 w-4 text-gray-700" />
                </motion.span>
                New student sign-up
              </motion.p>
            </div>

            <motion.form
              ref={formRef}
              onSubmit={handleSubmit}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-5">
                <div className="space-y-5">
                  {leftColumnFields.map((field) => (
                    <motion.div key={field.name} variants={itemVariants}>
                      <label
                        htmlFor={field.name}
                        className={`block text-sm font-medium mb-2 transition-colors duration-300 ${focusedField === field.name ? "text-gray-900" : "text-gray-600"}`}
                        style={{
                          fontFamily:
                            "var(--font-bogita-mono), system-ui, sans-serif",
                        }}
                      >
                        {field.label}
                      </label>
                      <div className="relative group">
                        <div
                          className={`absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                            focusedField === field.name
                              ? "opacity-20"
                              : "group-hover:opacity-10"
                          }`}
                        />
                        <div className="relative flex items-center">
                          <div
                            className={`absolute left-4 transition-all duration-300 ${focusedField === field.name ? "text-gray-900 scale-110" : "text-gray-400 group-hover:text-gray-500"}`}
                          >
                            <field.icon className="h-[18px] w-[18px]" />
                          </div>
                          <input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={
                              formData[field.name as keyof typeof formData]
                            }
                            onChange={handleChange}
                            onFocus={() => setFocusedField(field.name)}
                            onBlur={() => setFocusedField(null)}
                            required
                            className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-white/30 outline-none transition-all duration-300"
                            placeholder={field.placeholder}
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
                    </motion.div>
                  ))}
                </div>
                <div className="space-y-5">
                  {rightColumnFields.map((field) => (
                    <motion.div key={field.name} variants={itemVariants}>
                      <label
                        htmlFor={field.name}
                        className={`block text-sm font-medium mb-2 transition-colors duration-300 ${focusedField === field.name ? "text-gray-900" : "text-gray-600"}`}
                        style={{
                          fontFamily:
                            "var(--font-bogita-mono), system-ui, sans-serif",
                        }}
                      >
                        {field.label}
                      </label>
                      <div className="relative group">
                        <div
                          className={`absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                            focusedField === field.name
                              ? "opacity-20"
                              : "group-hover:opacity-10"
                          }`}
                        />
                        <div className="relative flex items-center">
                          <div
                            className={`absolute left-4 transition-all duration-300 z-10 ${focusedField === field.name ? "text-gray-900 scale-110" : "text-gray-400 group-hover:text-gray-500"}`}
                          >
                            <field.icon className="h-[18px] w-[18px]" />
                          </div>
                          {field.type === "select" ? (
                            <>
                              <select
                                id={field.name}
                                name={field.name}
                                value={
                                  formData[field.name as keyof typeof formData]
                                }
                                onChange={handleChange}
                                onFocus={() => setFocusedField(field.name)}
                                onBlur={() => setFocusedField(null)}
                                required
                                className="w-full pl-12 pr-10 py-3.5 text-gray-900 rounded-xl focus:ring-2 focus:ring-white/30 outline-none transition-all duration-300 appearance-none cursor-pointer"
                                style={{
                                  fontFamily:
                                    "var(--font-bogita-mono), system-ui, sans-serif",
                                  background: "rgba(255, 255, 255, 0.35)",
                                  backdropFilter: "blur(10px)",
                                  WebkitBackdropFilter: "blur(10px)",
                                  border: "1px solid rgba(255, 255, 255, 0.5)",
                                  boxShadow:
                                    "inset 0 1px 0 rgba(255,255,255,0.4)",
                                }}
                              >
                                <option
                                  value=""
                                  disabled
                                  className="bg-white text-gray-400"
                                >
                                  {field.placeholder}
                                </option>
                                {field.options?.map((option) => (
                                  <option
                                    key={option}
                                    value={option}
                                    className="bg-white text-gray-900 py-2"
                                  >
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown
                                className={`absolute right-4 h-4 w-4 pointer-events-none transition-all duration-300 ${focusedField === field.name ? "text-gray-900 rotate-180" : "text-gray-400"}`}
                              />
                            </>
                          ) : (
                            <input
                              type={field.type}
                              id={field.name}
                              name={field.name}
                              value={
                                formData[field.name as keyof typeof formData]
                              }
                              onChange={handleChange}
                              onFocus={() => setFocusedField(field.name)}
                              onBlur={() => setFocusedField(null)}
                              required
                              className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-white/30 outline-none transition-all duration-300"
                              placeholder={field.placeholder}
                              style={{
                                fontFamily:
                                  "var(--font-manrope), system-ui, sans-serif",
                                background: "rgba(255, 255, 255, 0.35)",
                                backdropFilter: "blur(10px)",
                                WebkitBackdropFilter: "blur(10px)",
                                border: "1px solid rgba(255, 255, 255, 0.5)",
                                boxShadow:
                                  "inset 0 1px 0 rgba(255,255,255,0.4)",
                              }}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  <motion.div variants={itemVariants}>
                    <label
                      htmlFor="aboutYourself"
                      className={`block text-sm font-medium mb-2 transition-colors duration-300 ${focusedField === "aboutYourself" ? "text-gray-900" : "text-gray-600"}`}
                      style={{
                        fontFamily:
                          "var(--font-raleway), system-ui, sans-serif",
                      }}
                    >
                      Tell Us About Yourself
                    </label>
                    <div className="relative group">
                      <div
                        className={`absolute -inset-0.5 bg-gradient-to-r from-gray-600 to-gray-800 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                          focusedField === "aboutYourself"
                            ? "opacity-20"
                            : "group-hover:opacity-10"
                        }`}
                      />
                      <div className="relative">
                        <div
                          className={`absolute left-4 top-4 transition-all duration-300 ${
                            focusedField === "aboutYourself"
                              ? "text-gray-900 scale-110"
                              : "text-gray-400 group-hover:text-gray-500"
                          }`}
                        >
                          <MessageSquare className="h-[18px] w-[18px]" />
                        </div>
                        <textarea
                          id="aboutYourself"
                          name="aboutYourself"
                          value={formData.aboutYourself}
                          onChange={handleChange}
                          onFocus={() => setFocusedField("aboutYourself")}
                          onBlur={() => setFocusedField(null)}
                          rows={3}
                          className="w-full pl-12 pr-4 py-3.5 text-gray-900 placeholder-gray-500 rounded-xl focus:ring-2 focus:ring-white/30 outline-none transition-all duration-300 resize-none"
                          placeholder="Share your interests, goals, or anything about yourself..."
                          style={{
                            fontFamily:
                              "var(--font-manrope), system-ui, sans-serif",
                            background: "rgba(255, 255, 255, 0.35)",
                            backdropFilter: "blur(10px)",
                            WebkitBackdropFilter: "blur(10px)",
                            border: "1px solid rgba(255, 255, 255, 0.5)",
                            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.4)",
                          }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              <AnimatePresence>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mt-6 p-4 rounded-xl flex items-center gap-3"
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

              <motion.div
                variants={itemVariants}
                className="mt-8 flex justify-center"
              >
                <motion.button
                  type="submit"
                  disabled={isLoading || isSuccess}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  className="relative group px-10 sm:px-14 py-4 flex items-center justify-center gap-3 text-white font-semibold rounded-xl overflow-hidden disabled:cursor-not-allowed transition-all duration-300"
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
                  <span className="relative z-10 flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {isSuccess ? (
                        <motion.span
                          key="success"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex tracking-widest items-center gap-2"
                          style={{
                            fontFamily:
                              "var(--font-vonique), system-ui, sans-serif",
                          }}
                        >
                          <Check className="h-5 w-5" />
                          Success!
                        </motion.span>
                      ) : isLoading ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex tracking-widest items-center gap-2"
                          style={{
                            fontFamily:
                              "var(--font-vonique), system-ui, sans-serif",
                          }}
                        >
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="default"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2 font-thin tracking-widest text-lg"
                          style={{
                            fontFamily:
                              "var(--font-vonique), system-ui, sans-serif",
                          }}
                        >
                          REGISTER
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.button>
              </motion.div>
            </motion.form>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-center text-sm text-slate-600 relative"
              style={{
                fontFamily: "var(--font-space-grotesk), system-ui, sans-serif",
              }}
            >
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-slate-700 hover:text-slate-900 font-medium cursor-pointer transition-colors"
              >
                Sign in
              </Link>
              {" · "}
              <Link
                href="/"
                className="text-slate-600 hover:text-slate-900 cursor-pointer transition-colors"
              >
                Back
              </Link>
            </motion.p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
