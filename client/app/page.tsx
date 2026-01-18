"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
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
  Loader2
} from "lucide-react";

export default function Home() {
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
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Generate particle data using lazy initialization to avoid calling Math.random during render
  const [particles] = useState<Array<{
    x: number;
    y: number;
    duration: number;
    delay: number;
    left: string;
  }>>(() => {
    if (typeof window === 'undefined') {
      return [];
    }
    return Array.from({ length: 15 }, () => ({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + 10,
      duration: 10 + Math.random() * 10,
      delay: Math.random() * 10,
      left: `${Math.random() * 100}%`,
    }));
  });

  useEffect(() => {
    // GSAP animations
    if (titleRef.current) {
      gsap.fromTo(
        titleRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 1, ease: "power3.out" }
      );
    }

    // Floating animation for the icon
    gsap.to(".float-icon", {
      y: -8,
      duration: 2.5,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });

    // Subtle card float
    if (cardRef.current) {
      gsap.to(cardRef.current, {
        y: -5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }

    // Animate gradient orbs
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsLoading(false);
    setIsSuccess(true);

    // Animate out after success
    setTimeout(() => {
      if (formRef.current) {
        gsap.to(formRef.current, {
          opacity: 0,
          y: -20,
          duration: 0.3,
          onComplete: () => {
            sessionStorage.setItem("studentData", JSON.stringify(formData));
            router.push("/dashboard");
          },
        });
      }
    }, 1000);
  };

  const leftColumnFields = [
    { name: "name", label: "Full Name", type: "text", icon: User, placeholder: "John Doe" },
    { name: "rollNumber", label: "Roll Number", type: "text", icon: Hash, placeholder: "2024CS001" },
    { name: "email", label: "Email Address", type: "email", icon: Mail, placeholder: "john@university.edu" },
    { name: "university", label: "University", type: "text", icon: Building2, placeholder: "Stanford University" },
  ];

  const rightColumnFields = [
    { name: "yearOfStudy", label: "Year of Study", type: "select", icon: Calendar, placeholder: "Select year", options: ["1st Year", "2nd Year", "3rd Year", "4th Year", "5th Year"] },
    { name: "passoutYear", label: "Passout Year", type: "select", icon: GraduationCap, placeholder: "Select year", options: ["2024", "2025", "2026", "2027", "2028", "2029"] },
    { name: "branch", label: "Branch / Major", type: "text", icon: BookOpen, placeholder: "Computer Science" },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        type: "spring" as const,
        stiffness: 100,
        damping: 12,
      },
    },
  };

  return (
    <div className={`min-h-screen flex items-center justify-center relative overflow-hidden py-8 bg-[#0a0a0f] ${fontVariables}`}>
      {/* Animated Grid Background */}
      <div className="absolute inset-0 overflow-hidden">
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(139, 92, 246, 0.5) 1px, transparent 1px),
              linear-gradient(90deg, rgba(139, 92, 246, 0.5) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
          }}
        />
      </div>

      {/* Gradient orbs */}
      <div className="orb-1 absolute top-1/4 -left-32 w-[500px] h-[500px] bg-violet-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="orb-2 absolute bottom-1/4 -right-32 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[100px] pointer-events-none" />
      <div className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {particles.map((particle, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 bg-purple-400/30 rounded-full"
            initial={{
              x: particle.x,
              y: particle.y,
            }}
            animate={{
              y: -10,
              opacity: [0, 0.5, 0],
            }}
            transition={{
              duration: particle.duration,
              repeat: Infinity,
              delay: particle.delay,
              ease: "linear",
            }}
            style={{
              left: particle.left,
            }}
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
          {/* Card glow effect */}
          <div className="absolute -inset-1 bg-gradient-to-r from-violet-600/20 via-purple-600/20 to-indigo-600/20 rounded-[28px] blur-xl opacity-70" />
          
          {/* Animated border */}
          <div className="absolute inset-0 rounded-[26px] p-px overflow-hidden">
            <div 
              className="absolute inset-0 rounded-[26px]"
              style={{
                background: 'linear-gradient(90deg, transparent, rgba(139, 92, 246, 0.3), transparent)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 3s linear infinite',
              }}
            />
          </div>

          {/* Main card */}
          <div 
            ref={cardRef}
            className="relative bg-[#0d0d14]/95 backdrop-blur-2xl rounded-[26px] p-6 sm:p-8 md:p-10 border border-white/8 shadow-2xl shadow-purple-500/5"
          >
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.1 }}
                className="float-icon inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-600 shadow-lg shadow-purple-500/30 mb-6 p-4 relative"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                <GraduationCap className="h-10 w-10 text-white relative z-10" />
              </motion.div>
              
              <motion.h1
                ref={titleRef}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-violet-400 via-purple-400 to-indigo-400 bg-clip-text text-transparent"
                style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
              >
                STUDENT PORTAL
              </motion.h1>
              
              <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="text-zinc-500 text-md flex items-center justify-center gap-2"
                style={{ fontFamily: "var(--font-syne), system-ui, sans-serif" }}
              >
                <motion.span
                  animate={{ rotate: [0, 15, -15, 0] }}
                  transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                >
                  <Sparkles className="h-4 w-4 text-purple-400" />
                </motion.span>
                AI-Powered Registration System
              </motion.p>
            </div>

            {/* Form */}
            <motion.form 
              ref={formRef} 
              onSubmit={handleSubmit}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 lg:gap-x-8 gap-y-5">
                {/* Left Column */}
                <div className="space-y-5">
                  {leftColumnFields.map((field) => (
                    <motion.div key={field.name} variants={itemVariants}>
                      <label
                        htmlFor={field.name}
                        className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                          focusedField === field.name ? 'text-purple-400' : 'text-zinc-400'
                        }`}
                        style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                      >
                        {field.label}
                      </label>
                      <div className="relative group">
                        {/* Input glow on focus */}
                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                          focusedField === field.name ? 'opacity-30' : 'group-hover:opacity-10'
                        }`} />
                        
                        <div className="relative flex items-center">
                          <div className={`absolute left-4 transition-all duration-300 ${
                            focusedField === field.name 
                              ? 'text-purple-400 scale-110' 
                              : 'text-zinc-600 group-hover:text-zinc-500'
                          }`}>
                            <field.icon className="h-[18px] w-[18px]" />
                          </div>
                          <input
                            type={field.type}
                            id={field.name}
                            name={field.name}
                            value={formData[field.name as keyof typeof formData]}
                            onChange={handleChange}
                            onFocus={() => setFocusedField(field.name)}
                            onBlur={() => setFocusedField(null)}
                            required
                            className="w-full pl-12 pr-4 py-3.5 text-white placeholder-zinc-600 bg-zinc-900/60 border border-zinc-800/80 rounded-xl focus:border-purple-500/50 focus:bg-zinc-900/80 outline-none transition-all duration-300"
                            placeholder={field.placeholder}
                            style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                          />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Right Column */}
                <div className="space-y-5">
                  {rightColumnFields.map((field) => (
                    <motion.div key={field.name} variants={itemVariants}>
                      <label
                        htmlFor={field.name}
                        className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                          focusedField === field.name ? 'text-purple-400' : 'text-zinc-400'
                        }`}
                        style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                      >
                        {field.label}
                      </label>
                      <div className="relative group">
                        {/* Input glow on focus */}
                        <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                          focusedField === field.name ? 'opacity-30' : 'group-hover:opacity-10'
                        }`} />
                        
                        <div className="relative flex items-center">
                          <div className={`absolute left-4 transition-all duration-300 z-10 ${
                            focusedField === field.name 
                              ? 'text-purple-400 scale-110' 
                              : 'text-zinc-600 group-hover:text-zinc-500'
                          }`}>
                            <field.icon className="h-[18px] w-[18px]" />
                          </div>
                          
                          {field.type === "select" ? (
                            <>
                              <select
                                id={field.name}
                                name={field.name}
                                value={formData[field.name as keyof typeof formData]}
                                onChange={handleChange}
                                onFocus={() => setFocusedField(field.name)}
                                onBlur={() => setFocusedField(null)}
                                required
                                className="w-full pl-12 pr-10 py-3.5 text-white bg-zinc-900/60 border border-zinc-800/80 rounded-xl focus:border-purple-500/50 focus:bg-zinc-900/80 outline-none transition-all duration-300 appearance-none cursor-pointer"
                                style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                              >
                                <option value="" disabled className="bg-zinc-900 text-zinc-500">
                                  {field.placeholder}
                                </option>
                                {field.options?.map((option) => (
                                  <option key={option} value={option} className="bg-zinc-900 text-white py-2">
                                    {option}
                                  </option>
                                ))}
                              </select>
                              <ChevronDown className={`absolute right-4 h-4 w-4 pointer-events-none transition-all duration-300 ${
                                focusedField === field.name ? 'text-purple-400 rotate-180' : 'text-zinc-600'
                              }`} />
                            </>
                          ) : (
                            <input
                              type={field.type}
                              id={field.name}
                              name={field.name}
                              value={formData[field.name as keyof typeof formData]}
                              onChange={handleChange}
                              onFocus={() => setFocusedField(field.name)}
                              onBlur={() => setFocusedField(null)}
                              required
                              className="w-full pl-12 pr-4 py-3.5 text-white placeholder-zinc-600 bg-zinc-900/60 border border-zinc-800/80 rounded-xl focus:border-purple-500/50 focus:bg-zinc-900/80 outline-none transition-all duration-300"
                              placeholder={field.placeholder}
                              style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}

                  {/* About Yourself - Textarea */}
                  <motion.div variants={itemVariants}>
                    <label
                      htmlFor="aboutYourself"
                      className={`block text-sm font-medium mb-2 transition-colors duration-300 ${
                        focusedField === 'aboutYourself' ? 'text-purple-400' : 'text-zinc-400'
                      }`}
                      style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}
                    >
                      Tell Us About Yourself
                    </label>
                    <div className="relative group">
                      {/* Textarea glow on focus */}
                      <div className={`absolute -inset-0.5 bg-gradient-to-r from-violet-600 to-purple-600 rounded-xl opacity-0 blur transition-opacity duration-300 ${
                        focusedField === 'aboutYourself' ? 'opacity-30' : 'group-hover:opacity-10'
                      }`} />
                      
                      <div className="relative">
                        <div className={`absolute left-4 top-4 transition-all duration-300 ${
                          focusedField === 'aboutYourself' 
                            ? 'text-purple-400 scale-110' 
                            : 'text-zinc-600 group-hover:text-zinc-500'
                        }`}>
                          <MessageSquare className="h-[18px] w-[18px]" />
                        </div>
                        <textarea
                          id="aboutYourself"
                          name="aboutYourself"
                          value={formData.aboutYourself}
                          onChange={handleChange}
                          onFocus={() => setFocusedField('aboutYourself')}
                          onBlur={() => setFocusedField(null)}
                          rows={3}
                          className="w-full pl-12 pr-4 py-3.5 text-white placeholder-zinc-600 bg-zinc-900/60 border border-zinc-800/80 rounded-xl focus:border-purple-500/50 focus:bg-zinc-900/80 outline-none transition-all duration-300 resize-none"
                          placeholder="Share your interests, goals, or anything about yourself..."
                          style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
                        />
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Submit Button */}
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
                  style={{ fontFamily: "var(--font-poppins), system-ui, sans-serif" }}
                >
                  {/* Button gradient background */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 transition-all duration-300" />
                  
                  {/* Hover shine effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                  
                  {/* Button glow */}
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 blur-xl opacity-50 group-hover:opacity-70 transition-opacity duration-300" />
                  
                  {/* Button content */}
                  <span className="relative z-10 flex items-center gap-2">
                    <AnimatePresence mode="wait">
                      {isSuccess ? (
                        <motion.span
                          key="success"
                          initial={{ opacity: 0, scale: 0.5 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="flex items-center gap-2"
                        >
                          <Check className="h-5 w-5" />
                          Success!
                        </motion.span>
                      ) : isLoading ? (
                        <motion.span
                          key="loading"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2"
                          style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}

                        >
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Processing...
                        </motion.span>
                      ) : (
                        <motion.span
                          key="default"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          className="flex items-center gap-2 text-lg"
                          style={{ fontFamily: "var(--font-raleway), system-ui, sans-serif" }}

                        >
                          GET STARTED
                          <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </span>
                </motion.button>
              </motion.div>
            </motion.form>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-8 text-center text-xs text-zinc-600"
              style={{ fontFamily: "var(--font-manrope), system-ui, sans-serif" }}
            >
              By signing in, you agree to our{" "}
              <span className="text-zinc-500 hover:text-purple-400 cursor-pointer transition-colors">
                terms of service
              </span>{" "}
              and{" "}
              <span className="text-zinc-500 hover:text-purple-400 cursor-pointer transition-colors">
                privacy policy
              </span>
            </motion.p>
          </div>
        </motion.div>
      </div>

      {/* Global styles for shimmer animation */}
      <style jsx global>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}