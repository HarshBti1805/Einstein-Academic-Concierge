"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface AnimatedCardProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  hover?: boolean;
  glow?: "indigo" | "purple" | "green" | "none";
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  hover = true,
  glow = "none",
}: AnimatedCardProps) {
  const glowClasses = {
    indigo: "hover:shadow-indigo-500/20",
    purple: "hover:shadow-purple-500/20",
    green: "hover:shadow-green-500/20",
    none: "",
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      whileHover={hover ? { y: -4, transition: { duration: 0.2 } } : undefined}
      className={cn(
        "rounded-xl bg-[#111118] border border-white/10 p-6",
        "transition-shadow duration-300",
        hover && "hover:shadow-xl",
        glowClasses[glow],
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function GlassCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={cn(
        "rounded-xl glass p-6",
        className
      )}
    >
      {children}
    </motion.div>
  );
}

export function GradientCard({
  children,
  className,
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay,
        ease: [0.25, 0.4, 0.25, 1],
      }}
      className={cn(
        "relative rounded-xl bg-[#111118] p-6 overflow-hidden",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-indigo-500 to-transparent" />
      <div className="relative z-10">{children}</div>
    </motion.div>
  );
}
