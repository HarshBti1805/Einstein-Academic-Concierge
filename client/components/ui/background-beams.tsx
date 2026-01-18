"use client";

import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export function BackgroundBeams({ className }: { className?: string }) {
  const beams = [
    { x: "10%", delay: 0 },
    { x: "30%", delay: 0.5 },
    { x: "50%", delay: 1 },
    { x: "70%", delay: 1.5 },
    { x: "90%", delay: 2 },
  ];

  return (
    <div
      className={cn(
        "absolute inset-0 overflow-hidden pointer-events-none",
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/20" />
      {beams.map((beam, i) => (
        <motion.div
          key={i}
          className="absolute top-0 w-px h-full"
          style={{ left: beam.x }}
          initial={{ opacity: 0, scaleY: 0 }}
          animate={{
            opacity: [0, 0.5, 0],
            scaleY: [0, 1, 0],
          }}
          transition={{
            duration: 4,
            delay: beam.delay,
            repeat: Infinity,
            repeatDelay: 3,
            ease: "easeInOut",
          }}
        >
          <div className="h-full w-full bg-gradient-to-b from-transparent via-indigo-500 to-transparent" />
        </motion.div>
      ))}
    </div>
  );
}

export function GridBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden",
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.03) 1px, transparent 1px)
          `,
          backgroundSize: "50px 50px",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-transparent to-[#0a0a0f]" />
    </div>
  );
}

export function DotBackground({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden",
        className
      )}
    >
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `radial-gradient(circle, rgba(255, 255, 255, 0.05) 1px, transparent 1px)`,
          backgroundSize: "30px 30px",
        }}
      />
    </div>
  );
}
