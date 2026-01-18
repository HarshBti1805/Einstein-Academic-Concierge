"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

interface Sparkle {
  id: string;
  x: string;
  y: string;
  size: number;
  delay: number;
}

function generateSparkle(): Sparkle {
  return {
    id: Math.random().toString(36).substring(2, 9),
    x: `${Math.random() * 100}%`,
    y: `${Math.random() * 100}%`,
    size: Math.random() * 10 + 5,
    delay: Math.random() * 2,
  };
}

interface SparklesProps {
  children: React.ReactNode;
  className?: string;
  sparkleCount?: number;
}

export function Sparkles({ children, className, sparkleCount = 10 }: SparklesProps) {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);

  useEffect(() => {
    const initialSparkles = Array.from({ length: sparkleCount }, () =>
      generateSparkle()
    );
    setSparkles(initialSparkles);

    const interval = setInterval(() => {
      setSparkles((current) => {
        const randomIndex = Math.floor(Math.random() * current.length);
        const newSparkles = [...current];
        newSparkles[randomIndex] = generateSparkle();
        return newSparkles;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [sparkleCount]);

  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      <AnimatePresence>
        {sparkles.map((sparkle) => (
          <motion.span
            key={sparkle.id}
            className="absolute pointer-events-none"
            style={{
              left: sparkle.x,
              top: sparkle.y,
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{
              duration: 0.5,
              delay: sparkle.delay,
              ease: "easeOut",
            }}
          >
            <svg
              width={sparkle.size}
              height={sparkle.size}
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z"
                fill="#fbbf24"
              />
            </svg>
          </motion.span>
        ))}
      </AnimatePresence>
    </span>
  );
}
