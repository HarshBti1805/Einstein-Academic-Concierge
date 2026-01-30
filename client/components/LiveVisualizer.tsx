"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const BAR_COUNT = 12;
const BAR_WIDTH = 4;
const MIN_HEIGHT = 4;
const MAX_HEIGHT = 32;

interface LiveVisualizerProps {
  isSpeaking: boolean;
  isListening: boolean;
  className?: string;
}

export default function LiveVisualizer({
  isSpeaking,
  isListening,
  className,
}: LiveVisualizerProps) {
  const [heights, setHeights] = useState<number[]>(() =>
    Array(BAR_COUNT).fill(MIN_HEIGHT),
  );
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!isSpeaking && !isListening) {
      setHeights(Array(BAR_COUNT).fill(MIN_HEIGHT));
      return;
    }

    const animate = () => {
      setHeights(() => {
        const next: number[] = [];
        for (let i = 0; i < BAR_COUNT; i++) {
          const base = isSpeaking ? 0.6 : 0.4;
          const wave = Math.sin(Date.now() / 120 + i * 0.5) * 0.35;
          const rand = (Math.random() - 0.5) * 0.2;
          let h = MIN_HEIGHT + (base + wave + rand) * (MAX_HEIGHT - MIN_HEIGHT);
          h = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, h));
          next.push(h);
        }
        return next;
      });
      rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [isSpeaking, isListening]);

  const active = isSpeaking || isListening;

  return (
    <div
      className={cn("flex items-center justify-center gap-[6px]", className)}
      style={{ height: MAX_HEIGHT + 8 }}
    >
      {heights.map((h, i) => (
        <motion.div
          key={i}
          className={cn(
            "rounded-full transition-colors duration-200",
            active && isSpeaking && "bg-gray-700",
            active && isListening && !isSpeaking && "bg-emerald-500",
            !active && "bg-gray-300",
          )}
          style={{ width: BAR_WIDTH, height: h }}
          transition={{ duration: 0.08 }}
        />
      ))}
    </div>
  );
}
