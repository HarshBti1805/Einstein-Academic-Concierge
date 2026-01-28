"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import gsap from "gsap";
import { fontVariables } from "@/lib/fonts";
import {
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Check,
  Target,
  BookOpen,
  Heart,
  Briefcase,
  Lightbulb,
  Clock,
  Layers,
  Calendar,
  Settings2,
  Monitor,
  Sunrise,
  Sun,
  Moon,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const TOTAL_STEPS = 7;

const INTEREST_OPTIONS = [
  "Web development",
  "Data science",
  "Machine learning",
  "Mobile apps",
  "Cloud & DevOps",
  "Cybersecurity",
  "Design (UI/UX)",
  "Research",
  "Writing",
  "Public speaking",
  "Team projects",
  "Open source",
  "Theory & algorithms",
  "Databases",
];

const LEARNING_STYLES = [
  { id: "visual", label: "Visual", desc: "Charts, diagrams, videos" },
  { id: "reading", label: "Reading", desc: "Textbooks, articles" },
  { id: "hands-on", label: "Hands-on", desc: "Labs, projects, coding" },
  { id: "group", label: "Group", desc: "Discussions, study groups" },
];

const GOAL_OPTIONS = [
  "Get an internship",
  "Land a full-time job",
  "Pursue higher studies",
  "Build a startup",
  "Contribute to research",
  "Switch career",
  "Upskill in current field",
  "Graduate on time",
];

const PREFERRED_TIMES = [
  { id: "morning", label: "Morning", desc: "Before 12 PM", icon: Sunrise },
  { id: "afternoon", label: "Afternoon", desc: "12 PM – 5 PM", icon: Sun },
  { id: "evening", label: "Evening", desc: "After 5 PM", icon: Moon },
  { id: "flexible", label: "Flexible", desc: "Any time works", icon: Clock },
];

const COURSE_LOAD_OPTIONS = [
  { id: "light", label: "Light", desc: "3–4 courses, focus on balance" },
  { id: "medium", label: "Medium", desc: "4–5 courses, standard load" },
  { id: "full", label: "Full", desc: "5–6 courses, maximize progress" },
];

const GRADUATION_TIMELINE_OPTIONS = [
  { id: "on_track", label: "On track", desc: "Graduating as planned" },
  { id: "accelerate", label: "Accelerate", desc: "Want to finish earlier" },
  { id: "flexible", label: "Flexible", desc: "No strict deadline" },
];

const CONSTRAINT_OPTIONS = [
  {
    id: "work_schedule",
    label: "I have a job",
    desc: "Need to work around work hours",
  },
  {
    id: "prefer_online",
    label: "Prefer online",
    desc: "Fully or mostly remote",
  },
  {
    id: "prefer_hybrid",
    label: "Prefer hybrid",
    desc: "Mix of in-person and online",
  },
  {
    id: "prefer_in_person",
    label: "Prefer in-person",
    desc: "On-campus preferred",
  },
  {
    id: "no_back_to_back",
    label: "Avoid back-to-back",
    desc: "Gaps between classes",
  },
  { id: "cluster_days", label: "Cluster days", desc: "Fewer days on campus" },
];

export default function SurveyPage() {
  const router = useRouter();
  const cardRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<string[]>([]);
  const [learningStyle, setLearningStyle] = useState<string | null>(null);
  const [goals, setGoals] = useState<string[]>([]);
  const [extraGoals, setExtraGoals] = useState("");
  const [preferredTimes, setPreferredTimes] = useState<string[]>([]);
  const [courseLoad, setCourseLoad] = useState<string | null>(null);
  const [graduationTimeline, setGraduationTimeline] = useState<string | null>(
    null,
  );
  const [constraints, setConstraints] = useState<string[]>([]);
  const [constraintsOther, setConstraintsOther] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [particles, setParticles] = useState<
    Array<{ left: string; duration: number; delay: number }>
  >([]);

  useEffect(() => {
    const token = sessionStorage.getItem("authToken");
    const data = sessionStorage.getItem("studentData");
    if (!token || !data) {
      router.replace("/");
      return;
    }
    const id = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(id);
  }, [router]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = setTimeout(
      () =>
        setParticles(
          Array.from({ length: 15 }, () => ({
            left: `${Math.random() * 100}%`,
            duration: 10 + Math.random() * 10,
            delay: Math.random() * 10,
          })),
        ),
      0,
    );
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    if (cardRef.current && mounted) {
      gsap.to(cardRef.current, {
        y: -5,
        duration: 4,
        repeat: -1,
        yoyo: true,
        ease: "sine.inOut",
      });
    }
  }, [mounted]);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    val: string,
  ) => {
    setter((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val],
    );
  };

  const canProceed = () => {
    if (step === 0) return interests.length >= 1;
    if (step === 1) return !!learningStyle;
    if (step === 2) return goals.length >= 1 || extraGoals.trim().length > 0;
    if (step === 3) return preferredTimes.length >= 1;
    if (step === 4) return !!courseLoad;
    if (step === 5) return !!graduationTimeline;
    return true;
  };

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) setStep((s) => s + 1);
    else handleSubmit();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const payload = {
      interests,
      learningStyle,
      goals: [...goals, ...(extraGoals.trim() ? [extraGoals.trim()] : [])],
      preferredClassTimes: preferredTimes,
      courseLoadPreference: courseLoad,
      graduationTimeline,
      constraints: [
        ...constraints,
        ...(constraintsOther.trim() ? [constraintsOther.trim()] : []),
      ],
    };
    try {
      const data = sessionStorage.getItem("studentData");
      const token = sessionStorage.getItem("authToken");
      if (data && token) {
        const parsed = JSON.parse(data);
        await fetch(
          `${API_BASE_URL}/api/students/${parsed.student_id}/survey`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(payload),
          },
        ).catch(() => {});
      }
      sessionStorage.setItem("surveyData", JSON.stringify(payload));
    } catch {
      // ignore
    }
    setTimeout(() => router.push("/dashboard"), 600);
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

  const stepLabels = [
    "Interests",
    "Learning style",
    "Goals",
    "Class times",
    "Course load",
    "Timeline",
    "Preferences",
  ];

  return (
    <div
      className={`min-h-screen flex items-center justify-center relative overflow-hidden py-8 px-4 sm:px-6 bg-gradient-to-br from-slate-50 via-white to-gray-100 ${fontVariables}`}
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
      <div className="orb-3 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gray-100/50 rounded-full blur-[150px] pointer-events-none" />
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

      <div className="relative z-10 w-full max-w-2xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 24 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative"
        >
          <div className="absolute -inset-1 bg-gradient-to-r from-gray-200/50 via-gray-300/50 to-gray-200/50 rounded-[28px] blur-xl opacity-70" />
          <div
            ref={cardRef}
            className="relative bg-white/90 backdrop-blur-2xl rounded-[26px] p-6 sm:p-8 md:p-10 border border-gray-200/60 shadow-xl shadow-gray-500/5"
          >
            {/* Header – registration-style */}
            <div className="text-center mb-8">
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
                className="float-icon inline-flex items-center justify-center rounded-2xl bg-gradient-to-br from-gray-800 via-gray-900 to-black shadow-lg shadow-gray-900/30 mb-5 p-3.5 relative"
              >
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-white/20 to-transparent" />
                <GraduationCap className="h-9 w-9 text-white relative z-10" />
              </motion.div>
              <h1
                className="text-2xl sm:text-3xl mb-2 bg-gradient-to-r from-gray-800 via-gray-900 to-black bg-clip-text text-transparent"
                style={{
                  fontFamily: "var(--font-vonique), system-ui, sans-serif",
                }}
              >
                COURSE PREFERENCES
              </h1>
              <p
                className="text-gray-500 text-base flex items-center justify-center gap-2"
                style={{
                  fontFamily:
                    "var(--font-space-grotesk), system-ui, sans-serif",
                }}
              >
                <Sparkles className="h-4 w-4 text-gray-600" />
                Helps our AI suggest the right courses for you
              </p>
              {/* Progress – 7 steps */}
              <div className="flex justify-center gap-1 sm:gap-1.5 mt-5 flex-wrap">
                {[...Array(TOTAL_STEPS).keys()].map((i) => (
                  <div
                    key={i}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      i <= step ? "bg-gray-800" : "bg-gray-200"
                    }`}
                    style={{
                      width: i === step ? 24 : i < step ? 20 : 12,
                    }}
                  />
                ))}
              </div>
              <p
                className="text-xs text-gray-400 mt-2"
                style={{
                  fontFamily: "var(--font-bogita-mono), system-ui, sans-serif",
                }}
              >
                Step {step + 1} of {TOTAL_STEPS}: {stepLabels[step]}
              </p>
            </div>

            <AnimatePresence mode="wait">
              {/* Step 0: Interests */}
              {step === 0 && (
                <motion.div
                  key="interests"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <div
                    className="flex items-center gap-2 text-gray-800"
                    style={{
                      fontFamily:
                        "var(--font-bogita-mono), system-ui, sans-serif",
                    }}
                  >
                    <Heart className="h-5 w-5 text-gray-600 shrink-0" />
                    <span className="font-medium text-sm">
                      What topics or areas are you interested in?
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    Select all that apply. We’ll use this to suggest electives
                    and relevant courses.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggle(setInterests, opt)}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          interests.includes(opt)
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-gray-50/80 border-gray-200 text-gray-700 hover:border-gray-400 focus:ring-2 focus:ring-gray-500/20"
                        }`}
                        style={{
                          fontFamily:
                            "var(--font-manrope), system-ui, sans-serif",
                        }}
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 1: Learning style */}
              {step === 1 && (
                <motion.div
                  key="learning"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <div
                    className="flex items-center gap-2 text-gray-800"
                    style={{
                      fontFamily:
                        "var(--font-bogita-mono), system-ui, sans-serif",
                    }}
                  >
                    <BookOpen className="h-5 w-5 text-gray-600 shrink-0" />
                    <span className="font-medium text-sm">
                      How do you learn best?
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    We’ll favor course formats that match your style.
                  </p>
                  <div className="grid gap-3">
                    {LEARNING_STYLES.map((ls) => (
                      <motion.button
                        key={ls.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setLearningStyle(ls.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                          learningStyle === ls.id
                            ? "bg-gray-800 text-white border-gray-800 ring-2 ring-gray-600/30"
                            : "bg-gray-50/80 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <Lightbulb
                          className={`h-5 w-5 shrink-0 ${
                            learningStyle === ls.id
                              ? "text-gray-200"
                              : "text-gray-600"
                          }`}
                        />
                        <div className="flex-1">
                          <div
                            className={`font-medium ${
                              learningStyle === ls.id
                                ? "text-gray-200"
                                : "text-gray-500"
                            }`}
                            style={{
                              fontFamily:
                                "var(--font-manrope), system-ui, sans-serif",
                            }}
                          >
                            {ls.label}
                          </div>
                          <div
                            className={`text-sm ${
                              learningStyle === ls.id
                                ? "text-gray-200"
                                : "text-gray-500"
                            }`}
                          >
                            {ls.desc}
                          </div>
                        </div>
                        {learningStyle === ls.id && (
                          <Check className="h-5 w-5 shrink-0" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 2: Goals */}
              {step === 2 && (
                <motion.div
                  key="goals"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <div
                    className="flex items-center gap-2 text-gray-800"
                    style={{
                      fontFamily:
                        "var(--font-bogita-mono), system-ui, sans-serif",
                    }}
                  >
                    <Target className="h-5 w-5 text-gray-600 shrink-0" />
                    <span className="font-medium text-sm">
                      What are your academic or career goals?
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    Select any that apply. This guides course and schedule
                    suggestions.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {GOAL_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt}
                        type="button"
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => toggle(setGoals, opt)}
                        className={`px-4 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                          goals.includes(opt)
                            ? "bg-gray-800 text-white border-gray-800"
                            : "bg-gray-50/80 border-gray-200 text-gray-700 hover:border-gray-400"
                        }`}
                        style={{
                          fontFamily:
                            "var(--font-manrope), system-ui, sans-serif",
                        }}
                      >
                        {opt}
                      </motion.button>
                    ))}
                  </div>
                  <div>
                    <label
                      htmlFor="extraGoals"
                      className="block text-sm font-medium text-gray-700 mb-2"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                      }}
                    >
                      Anything else?
                    </label>
                    <input
                      id="extraGoals"
                      type="text"
                      value={extraGoals}
                      onChange={(e) => setExtraGoals(e.target.value)}
                      placeholder="e.g. Participate in hackathons"
                      className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/80 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-500/20 outline-none transition-all"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    />
                  </div>
                </motion.div>
              )}

              {/* Step 3: Preferred class times */}
              {step === 3 && (
                <motion.div
                  key="times"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <div
                    className="flex items-center gap-2 text-gray-800"
                    style={{
                      fontFamily:
                        "var(--font-bogita-mono), system-ui, sans-serif",
                    }}
                  >
                    <Clock className="h-5 w-5 text-gray-600 shrink-0" />
                    <span className="font-medium text-sm">
                      When do you prefer classes?
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    We’ll optimize your schedule around these slots.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {PREFERRED_TIMES.map((t) => {
                      const Icon = t.icon;
                      const selected = preferredTimes.includes(t.id);
                      return (
                        <motion.button
                          key={t.id}
                          type="button"
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          onClick={() => toggle(setPreferredTimes, t.id)}
                          className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                            selected
                              ? "bg-gray-800 text-white border-gray-800 ring-2 ring-gray-600/30"
                              : "bg-gray-50/80 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 shrink-0 ${
                              selected ? "text-gray-200" : "text-gray-600"
                            }`}
                          />
                          <div className="flex-1">
                            <div
                              className={`font-medium ${
                                selected ? "text-gray-200" : "text-gray-500"
                              }`}
                              style={{
                                fontFamily:
                                  "var(--font-manrope), system-ui, sans-serif",
                              }}
                            >
                              {t.label}
                            </div>
                            <div
                              className={`text-sm ${
                                selected ? "text-gray-200" : "text-gray-500"
                              }`}
                            >
                              {t.desc}
                            </div>
                          </div>
                          {selected && <Check className="h-5 w-5 shrink-0" />}
                        </motion.button>
                      );
                    })}
                  </div>
                </motion.div>
              )}

              {/* Step 4: Course load */}
              {step === 4 && (
                <motion.div
                  key="load"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <div
                    className="flex items-center gap-2 text-gray-800"
                    style={{
                      fontFamily:
                        "var(--font-bogita-mono), system-ui, sans-serif",
                    }}
                  >
                    <Layers className="h-5 w-5 text-gray-600 shrink-0" />
                    <span className="font-medium text-sm">
                      How many courses do you want to take per term?
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    This helps us recommend a realistic load.
                  </p>
                  <div className="grid gap-3">
                    {COURSE_LOAD_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setCourseLoad(opt.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                          courseLoad === opt.id
                            ? "bg-gray-800 text-white border-gray-800 ring-2 ring-gray-600/30"
                            : "bg-gray-50/80 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <div className="flex-1">
                          <div
                            className={`font-medium ${
                              courseLoad === opt.id
                                ? "text-gray-200"
                                : "text-gray-500"
                            }`}
                            style={{
                              fontFamily:
                                "var(--font-manrope), system-ui, sans-serif",
                            }}
                          >
                            {opt.label}
                          </div>
                          <div
                            className={`text-sm ${
                              courseLoad === opt.id
                                ? "text-gray-200"
                                : "text-gray-500"
                            }`}
                          >
                            {opt.desc}
                          </div>
                        </div>
                        {courseLoad === opt.id && (
                          <Check className="h-5 w-5 shrink-0" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 5: Graduation timeline */}
              {step === 5 && (
                <motion.div
                  key="timeline"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <div
                    className="flex items-center gap-2 text-gray-800"
                    style={{
                      fontFamily:
                        "var(--font-bogita-mono), system-ui, sans-serif",
                    }}
                  >
                    <Calendar className="h-5 w-5 text-gray-600 shrink-0" />
                    <span className="font-medium text-sm">
                      What’s your graduation timeline?
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    We’ll prioritize prerequisites and sequencing accordingly.
                  </p>
                  <div className="grid gap-3">
                    {GRADUATION_TIMELINE_OPTIONS.map((opt) => (
                      <motion.button
                        key={opt.id}
                        type="button"
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        onClick={() => setGraduationTimeline(opt.id)}
                        className={`flex items-center gap-4 p-4 rounded-xl border text-left transition-all ${
                          graduationTimeline === opt.id
                            ? "bg-gray-800 text-white border-gray-800 ring-2 ring-gray-600/30"
                            : "bg-gray-50/80 border-gray-200 hover:border-gray-400"
                        }`}
                      >
                        <div className="flex-1">
                          <div
                            className={`font-medium ${
                              graduationTimeline === opt.id
                                ? "text-gray-200"
                                : "text-gray-500"
                            }`}
                            style={{
                              fontFamily:
                                "var(--font-manrope), system-ui, sans-serif",
                            }}
                          >
                            {opt.label}
                          </div>
                          <div
                            className={`text-sm ${
                              graduationTimeline === opt.id
                                ? "text-gray-200"
                                : "text-gray-500"
                            }`}
                          >
                            {opt.desc}
                          </div>
                        </div>
                        {graduationTimeline === opt.id && (
                          <Check className="h-5 w-5 shrink-0" />
                        )}
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {/* Step 6: Constraints & preferences */}
              {step === 6 && (
                <motion.div
                  key="constraints"
                  initial={{ opacity: 0, x: 24 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -24 }}
                  transition={{ duration: 0.28 }}
                  className="space-y-4"
                >
                  <div
                    className="flex items-center gap-2 text-gray-800"
                    style={{
                      fontFamily:
                        "var(--font-bogita-mono), system-ui, sans-serif",
                    }}
                  >
                    <Settings2 className="h-5 w-5 text-gray-600 shrink-0" />
                    <span className="font-medium text-sm">
                      Any constraints or preferences?
                    </span>
                  </div>
                  <p
                    className="text-sm text-gray-500"
                    style={{
                      fontFamily: "var(--font-manrope), system-ui, sans-serif",
                    }}
                  >
                    Optional. We’ll use these when building your schedule.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    {CONSTRAINT_OPTIONS.map((c) => {
                      const selected = constraints.includes(c.id);
                      return (
                        <motion.button
                          key={c.id}
                          type="button"
                          whileHover={{ scale: 1.01 }}
                          whileTap={{ scale: 0.99 }}
                          onClick={() => toggle(setConstraints, c.id)}
                          className={`flex items-start gap-3 p-4 rounded-xl border text-left transition-all ${
                            selected
                              ? "bg-gray-800 text-white border-gray-800 ring-2 ring-gray-600/30"
                              : "bg-gray-50/80 border-gray-200 hover:border-gray-400"
                          }`}
                        >
                          <Monitor
                            className={`h-5 w-5 shrink-0 mt-0.5 ${
                              selected ? "text-gray-200" : "text-gray-600"
                            }`}
                          />
                          <div className="flex-1 min-w-0">
                            <div
                              className={`font-medium text-sm ${
                                selected ? "text-gray-200" : "text-gray-500"
                              }`}
                              style={{
                                fontFamily:
                                  "var(--font-manrope), system-ui, sans-serif",
                              }}
                            >
                              {c.label}
                            </div>
                            <div
                              className={`text-xs mt-0.5 ${
                                selected ? "text-gray-200" : "text-gray-500"
                              }`}
                            >
                              {c.desc}
                            </div>
                          </div>
                          {selected && (
                            <Check className="h-5 w-5 shrink-0 mt-0.5" />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  <div>
                    <label
                      htmlFor="constraintsOther"
                      className="block text-sm font-medium text-gray-700 mb-2"
                      style={{
                        fontFamily:
                          "var(--font-bogita-mono), system-ui, sans-serif",
                      }}
                    >
                      Anything else we should know?
                    </label>
                    <input
                      id="constraintsOther"
                      type="text"
                      value={constraintsOther}
                      onChange={(e) => setConstraintsOther(e.target.value)}
                      placeholder="e.g. Can’t take classes before 10 AM due to work"
                      className="w-full pl-4 pr-4 py-3 rounded-xl border border-gray-200 bg-gray-50/80 text-gray-900 placeholder-gray-400 focus:border-gray-400 focus:bg-white focus:ring-2 focus:ring-gray-500/20 outline-none transition-all"
                      style={{
                        fontFamily:
                          "var(--font-manrope), system-ui, sans-serif",
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer – Back / Next – registration-style primary button */}
            <div className="mt-8 flex justify-between items-center gap-4">
              <motion.button
                type="button"
                onClick={() => setStep((s) => Math.max(0, s - 1))}
                className={`flex items-center gap-1.5 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors ${step === 0 ? "invisible" : ""}`}
                style={{
                  fontFamily: "var(--font-bogita-mono), system-ui, sans-serif",
                }}
              >
                <ChevronLeft className="h-4 w-4" />
                Back
              </motion.button>
              <motion.button
                type="button"
                disabled={!canProceed() || isSubmitting}
                whileHover={
                  canProceed() && !isSubmitting ? { scale: 1.02, y: -2 } : {}
                }
                whileTap={canProceed() && !isSubmitting ? { scale: 0.98 } : {}}
                onClick={handleNext}
                className="relative group flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed transition-all text-white font-semibold"
                style={{
                  fontFamily: "var(--font-poppins), system-ui, sans-serif",
                }}
              >
                <div className="absolute inset-0 bg-gradient-to-r from-gray-800 via-gray-900 to-black" />
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                <span className="relative z-10 flex items-center gap-2">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span
                        style={{
                          fontFamily:
                            "var(--font-raleway), system-ui, sans-serif",
                        }}
                      >
                        Taking you to dashboard...
                      </span>
                    </>
                  ) : step < TOTAL_STEPS - 1 ? (
                    <>
                      <span
                        style={{
                          fontFamily:
                            "var(--font-raleway), system-ui, sans-serif",
                        }}
                      >
                        Next
                      </span>
                      <ChevronRight className="h-5 w-5" />
                    </>
                  ) : (
                    <>
                      <Briefcase className="h-5 w-5" />
                      <span
                        style={{
                          fontFamily:
                            "var(--font-raleway), system-ui, sans-serif",
                        }}
                      >
                        Finish & go to dashboard
                      </span>
                    </>
                  )}
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
