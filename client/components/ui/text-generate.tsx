"use client";

import { motion, stagger, useAnimate, useInView } from "framer-motion";
import { useEffect } from "react";
import { cn } from "@/lib/utils";

interface TextGenerateProps {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}

export function TextGenerate({
  words,
  className,
  filter = true,
  duration = 0.5,
}: TextGenerateProps) {
  const [scope, animate] = useAnimate();
  const isInView = useInView(scope, { once: true });
  const wordsArray = words.split(" ");

  useEffect(() => {
    if (isInView) {
      animate(
        "span",
        {
          opacity: 1,
          filter: filter ? "blur(0px)" : "none",
        },
        {
          duration: duration,
          delay: stagger(0.1),
        }
      );
    }
  }, [isInView, animate, filter, duration]);

  return (
    <motion.div ref={scope} className={cn("font-bold", className)}>
      {wordsArray.map((word, idx) => (
        <motion.span
          key={word + idx}
          className="opacity-0"
          style={{
            filter: filter ? "blur(10px)" : "none",
          }}
        >
          {word}{" "}
        </motion.span>
      ))}
    </motion.div>
  );
}

export function TypewriterEffect({
  words,
  className,
  cursorClassName,
}: {
  words: { text: string; className?: string }[];
  className?: string;
  cursorClassName?: string;
}) {
  const wordsArray = words.map((word) => ({
    ...word,
    text: word.text.split(""),
  }));

  return (
    <div className={cn("flex items-center space-x-1", className)}>
      <motion.div className="flex items-center overflow-hidden">
        {wordsArray.map((word, idx) => (
          <div key={`word-${idx}`} className="flex items-center">
            {word.text.map((char, index) => (
              <motion.span
                key={`char-${index}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{
                  duration: 0.05,
                  delay: idx * 0.3 + index * 0.05,
                }}
                className={cn("text-white", word.className)}
              >
                {char}
              </motion.span>
            ))}
            {idx < wordsArray.length - 1 && <span>&nbsp;</span>}
          </div>
        ))}
      </motion.div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          repeatType: "reverse",
        }}
        className={cn(
          "inline-block w-[4px] h-6 bg-indigo-500 rounded-full",
          cursorClassName
        )}
      />
    </div>
  );
}
