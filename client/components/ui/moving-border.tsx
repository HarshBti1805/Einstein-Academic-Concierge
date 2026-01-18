"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { ReactNode, ElementType } from "react";

interface MovingBorderProps {
  children: ReactNode;
  duration?: number;
  className?: string;
  containerClassName?: string;
  borderClassName?: string;
  as?: ElementType;
}

export function MovingBorder({
  children,
  duration = 2000,
  className,
  containerClassName,
  borderClassName,
  as: Component = "div",
}: MovingBorderProps) {
  return (
    <Component
      className={cn(
        "relative p-[1px] overflow-hidden rounded-xl",
        containerClassName
      )}
    >
      <motion.div
        className={cn(
          "absolute inset-0",
          borderClassName
        )}
        style={{
          background: "linear-gradient(90deg, #6366f1, #a855f7, #6366f1)",
          backgroundSize: "200% 100%",
        }}
        animate={{
          backgroundPosition: ["0% 50%", "200% 50%"],
        }}
        transition={{
          duration: duration / 1000,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      <div
        className={cn(
          "relative bg-[#0a0a0f] rounded-xl",
          className
        )}
      >
        {children}
      </div>
    </Component>
  );
}

export function GlowingButton({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "relative group px-6 py-3 rounded-xl font-semibold text-white",
        "bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500",
        "bg-[length:200%_100%] animate-gradient",
        "shadow-lg shadow-indigo-500/25",
        "hover:shadow-xl hover:shadow-indigo-500/40",
        "transition-shadow duration-300",
        className
      )}
    >
      <span className="relative z-10">{children}</span>
      <motion.div
        className="absolute inset-0 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity"
        style={{
          background:
            "radial-gradient(circle at center, rgba(255,255,255,0.2), transparent 70%)",
        }}
      />
    </motion.button>
  );
}
