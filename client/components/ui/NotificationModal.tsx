"use client";

import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Info, 
  X,
  Sparkles,
  Clock,
  Users
} from "lucide-react";
import { useEffect } from "react";

export type NotificationType = "success" | "error" | "warning" | "info" | "waitlist";

interface NotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: NotificationType;
  title: string;
  message: string;
  details?: {
    seatNumber?: string;
    waitlistPosition?: number;
    score?: number;
    courseName?: string;
  };
  autoClose?: boolean;
  autoCloseDelay?: number;
}

const iconMap = {
  success: CheckCircle2,
  error: XCircle,
  warning: AlertCircle,
  info: Info,
  waitlist: Clock,
};

const colorMap = {
  success: {
    bg: "from-emerald-500 to-green-600",
    icon: "text-white",
    glow: "shadow-emerald-500/30",
    border: "border-emerald-400/20",
  },
  error: {
    bg: "from-red-500 to-rose-600",
    icon: "text-white",
    glow: "shadow-red-500/30",
    border: "border-red-400/20",
  },
  warning: {
    bg: "from-amber-500 to-orange-600",
    icon: "text-white",
    glow: "shadow-amber-500/30",
    border: "border-amber-400/20",
  },
  info: {
    bg: "from-blue-500 to-indigo-600",
    icon: "text-white",
    glow: "shadow-blue-500/30",
    border: "border-blue-400/20",
  },
  waitlist: {
    bg: "from-purple-500 to-violet-600",
    icon: "text-white",
    glow: "shadow-purple-500/30",
    border: "border-purple-400/20",
  },
};

export default function NotificationModal({
  isOpen,
  onClose,
  type,
  title,
  message,
  details,
  autoClose = false,
  autoCloseDelay = 5000,
}: NotificationModalProps) {
  const Icon = iconMap[type];
  const colors = colorMap[type];

  useEffect(() => {
    if (isOpen && autoClose) {
      const timer = setTimeout(onClose, autoCloseDelay);
      return () => clearTimeout(timer);
    }
  }, [isOpen, autoClose, autoCloseDelay, onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div 
              className={`
                relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl 
                max-w-md w-full overflow-hidden pointer-events-auto
                border ${colors.border}
              `}
            >
              {/* Gradient Header */}
              <div className={`bg-gradient-to-r ${colors.bg} p-6 relative overflow-hidden`}>
                {/* Decorative elements */}
                <div className="absolute inset-0 overflow-hidden">
                  <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
                  <div className="absolute -bottom-10 -left-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
                  {type === "success" && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2 }}
                      className="absolute top-4 right-4"
                    >
                      <Sparkles className="w-6 h-6 text-white/50" />
                    </motion.div>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-1 rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                >
                  <X className="w-4 h-4 text-white" />
                </button>

                {/* Icon */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", delay: 0.1 }}
                  className="relative z-10"
                >
                  <div className={`w-16 h-16 rounded-full bg-white/20 flex items-center justify-center ${colors.glow} shadow-lg`}>
                    <Icon className={`w-8 h-8 ${colors.icon}`} />
                  </div>
                </motion.div>

                {/* Title */}
                <motion.h3
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                  className="mt-4 text-xl font-bold text-white relative z-10"
                >
                  {title}
                </motion.h3>
              </div>

              {/* Content */}
              <div className="p-6">
                <motion.p
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="text-gray-600 dark:text-gray-300 text-sm leading-relaxed"
                >
                  {message}
                </motion.p>

                {/* Details */}
                {details && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-4 space-y-2"
                  >
                    {details.courseName && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Course:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {details.courseName}
                        </span>
                      </div>
                    )}
                    {details.seatNumber && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Seat:</span>
                        <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 px-2 py-0.5 rounded">
                          {details.seatNumber}
                        </span>
                      </div>
                    )}
                    {details.waitlistPosition !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <Users className="w-4 h-4 text-purple-500" />
                        <span className="text-gray-500">Waitlist Position:</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          #{details.waitlistPosition}
                        </span>
                      </div>
                    )}
                    {details.score !== undefined && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-gray-500">Priority Score:</span>
                        <span className="font-medium text-gray-800 dark:text-gray-200">
                          {details.score.toFixed(2)}
                        </span>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Action Button */}
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.5 }}
                  onClick={onClose}
                  className={`
                    mt-6 w-full py-3 px-4 rounded-xl font-medium text-white
                    bg-gradient-to-r ${colors.bg} 
                    hover:opacity-90 transition-opacity
                    shadow-lg ${colors.glow}
                  `}
                >
                  {type === "success" ? "Great!" : type === "waitlist" ? "Got it" : "Close"}
                </motion.button>
              </div>

              {/* Progress bar for auto-close */}
              {autoClose && (
                <motion.div
                  initial={{ scaleX: 1 }}
                  animate={{ scaleX: 0 }}
                  transition={{ duration: autoCloseDelay / 1000, ease: "linear" }}
                  className={`h-1 bg-gradient-to-r ${colors.bg} origin-left`}
                />
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
