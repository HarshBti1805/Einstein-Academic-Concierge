"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface ProgressRingProps {
  percentage: number;
  size?: number;
  strokeWidth?: number;
  color?: "indigo" | "green" | "purple" | "orange" | "blue";
  label: string;
  value: string | number;
  className?: string;
}

export function ProgressRing({
  percentage,
  size = 120,
  strokeWidth = 8,
  color = "indigo",
  label,
  value,
  className,
}: ProgressRingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  const colorClasses = {
    indigo: { stroke: "#6366f1", glow: "rgba(99, 102, 241, 0.3)" },
    green: { stroke: "#22c55e", glow: "rgba(34, 197, 94, 0.3)" },
    purple: { stroke: "#a855f7", glow: "rgba(168, 85, 247, 0.3)" },
    orange: { stroke: "#f97316", glow: "rgba(249, 115, 22, 0.3)" },
    blue: { stroke: "#3b82f6", glow: "rgba(59, 130, 246, 0.3)" },
  };

  return (
    <div ref={ref} className={cn("flex flex-col items-center", className)}>
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          width={size}
          height={size}
          className="transform -rotate-90"
          style={{
            filter: isInView
              ? `drop-shadow(0 0 10px ${colorClasses[color].glow})`
              : "none",
          }}
        >
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="rgba(255, 255, 255, 0.1)"
            strokeWidth={strokeWidth}
            fill="none"
          />
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={colorClasses[color].stroke}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: isInView ? offset : circumference,
            }}
            transition={{
              duration: 1.5,
              ease: [0.25, 0.4, 0.25, 1],
              delay: 0.2,
            }}
            style={{
              strokeDasharray: circumference,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.5 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-2xl font-bold text-white"
          >
            {value}
          </motion.div>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: isInView ? 1 : 0 }}
            transition={{ duration: 0.5, delay: 0.7 }}
            className="text-xs text-zinc-400 mt-1"
          >
            {label}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
