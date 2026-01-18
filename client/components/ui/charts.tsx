"use client";

import { motion, useInView } from "framer-motion";
import { useRef } from "react";
import { cn } from "@/lib/utils";

interface BarChartProps {
  data: { label: string; value: number; color?: string }[];
  maxValue?: number;
  className?: string;
  showLabels?: boolean;
  height?: number;
}

export function AnimatedBarChart({
  data,
  maxValue,
  className,
  showLabels = true,
  height = 200,
}: BarChartProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const max = maxValue || Math.max(...data.map((d) => d.value));

  return (
    <div ref={ref} className={cn("w-full", className)}>
      <div
        className="flex items-end justify-between gap-2"
        style={{ height }}
      >
        {data.map((item, index) => {
          const heightPercent = (item.value / max) * 100;
          return (
            <div
              key={index}
              className="flex-1 flex flex-col items-center gap-2"
            >
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: isInView ? `${heightPercent}%` : 0 }}
                transition={{
                  duration: 0.8,
                  delay: index * 0.1,
                  ease: [0.25, 0.4, 0.25, 1],
                }}
                className={cn(
                  "w-full rounded-t-lg relative overflow-hidden",
                  !item.color && "bg-gradient-to-t from-indigo-600 to-indigo-400"
                )}
                style={item.color ? { backgroundColor: item.color } : undefined}
              >
                <div className="absolute inset-0 bg-white/10 shimmer" />
              </motion.div>
              {showLabels && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: isInView ? 1 : 0 }}
                  transition={{ delay: 0.5 + index * 0.1 }}
                  className="text-xs text-zinc-400 font-medium"
                >
                  {item.label}
                </motion.span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface LineChartProps {
  data: { x: string; y: number }[];
  className?: string;
  color?: string;
  showDots?: boolean;
  showArea?: boolean;
}

export function AnimatedLineChart({
  data,
  className,
  color = "#6366f1",
  showDots = true,
  showArea = true,
}: LineChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const width = 400;
  const height = 200;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const maxY = Math.max(...data.map((d) => d.y));
  const minY = Math.min(...data.map((d) => d.y));
  const yRange = maxY - minY || 1;

  const points = data.map((d, i) => ({
    ...d,
    xPos: padding + (i / (data.length - 1)) * chartWidth,
    yPos: padding + chartHeight - ((d.y - minY) / yRange) * chartHeight,
  }));

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.xPos} ${p.yPos}`)
    .join(" ");

  const areaPath = `${linePath} L ${points[points.length - 1].xPos} ${
    padding + chartHeight
  } L ${padding} ${padding + chartHeight} Z`;

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${width} ${height}`}
      className={cn("w-full h-auto", className)}
    >
      <defs>
        <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
        <line
          key={i}
          x1={padding}
          y1={padding + chartHeight * ratio}
          x2={width - padding}
          y2={padding + chartHeight * ratio}
          stroke="rgba(255,255,255,0.05)"
          strokeDasharray="4,4"
        />
      ))}

      {/* Area */}
      {showArea && (
        <motion.path
          d={areaPath}
          fill="url(#lineGradient)"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ duration: 1, delay: 0.5 }}
        />
      )}

      {/* Line */}
      <motion.path
        d={linePath}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: isInView ? 1 : 0 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
      />

      {/* Dots */}
      {showDots &&
        points.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.xPos}
            cy={point.yPos}
            r="5"
            fill={color}
            stroke="#0a0a0f"
            strokeWidth="2"
            initial={{ scale: 0 }}
            animate={{ scale: isInView ? 1 : 0 }}
            transition={{ delay: 0.5 + i * 0.1, duration: 0.3 }}
          />
        ))}

      {/* X-axis labels */}
      {points.map((point, i) => (
        <motion.text
          key={i}
          x={point.xPos}
          y={height - 10}
          textAnchor="middle"
          fill="rgba(255,255,255,0.5)"
          fontSize="10"
          initial={{ opacity: 0 }}
          animate={{ opacity: isInView ? 1 : 0 }}
          transition={{ delay: 0.8 + i * 0.1 }}
        >
          {point.x}
        </motion.text>
      ))}
    </svg>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function AnimatedDonutChart({
  data,
  size = 200,
  strokeWidth = 30,
  className,
}: DonutChartProps) {
  const ref = useRef<SVGSVGElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  let accumulatedOffset = 0;

  return (
    <div className={cn("relative", className)}>
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.1)"
          strokeWidth={strokeWidth}
        />

        {/* Data segments */}
        {data.map((segment, i) => {
          const segmentLength = (segment.value / total) * circumference;
          const offset = accumulatedOffset;
          accumulatedOffset += segmentLength;

          return (
            <motion.circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={segment.color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={`${segmentLength} ${circumference}`}
              strokeDashoffset={-offset}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{
                strokeDasharray: isInView
                  ? `${segmentLength} ${circumference}`
                  : `0 ${circumference}`,
              }}
              transition={{
                duration: 1,
                delay: i * 0.2,
                ease: [0.25, 0.4, 0.25, 1],
              }}
              style={{
                filter: `drop-shadow(0 0 8px ${segment.color}40)`,
              }}
            />
          );
        })}
      </svg>

      {/* Center text */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.5 }}
        transition={{ delay: 0.5, duration: 0.5 }}
        className="absolute inset-0 flex flex-col items-center justify-center"
      >
        <span className="text-2xl font-bold text-white">{total}</span>
        <span className="text-xs text-zinc-400">Total</span>
      </motion.div>
    </div>
  );
}

interface ProgressBarProps {
  value: number;
  max?: number;
  label?: string;
  showValue?: boolean;
  color?: "indigo" | "green" | "red" | "yellow" | "purple";
  className?: string;
}

export function AnimatedProgressBar({
  value,
  max = 100,
  label,
  showValue = true,
  color = "indigo",
  className,
}: ProgressBarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const percentage = Math.min((value / max) * 100, 100);

  const colorClasses = {
    indigo: "from-indigo-600 to-indigo-400",
    green: "from-green-600 to-green-400",
    red: "from-red-600 to-red-400",
    yellow: "from-yellow-600 to-yellow-400",
    purple: "from-purple-600 to-purple-400",
  };

  return (
    <div ref={ref} className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-2">
          {label && (
            <span className="text-sm font-medium text-zinc-300">{label}</span>
          )}
          {showValue && (
            <span className="text-sm font-semibold text-white">
              {value.toFixed(0)}%
            </span>
          )}
        </div>
      )}
      <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: isInView ? `${percentage}%` : 0 }}
          transition={{ duration: 1, ease: [0.25, 0.4, 0.25, 1] }}
          className={cn(
            "h-full rounded-full bg-gradient-to-r",
            colorClasses[color]
          )}
        />
      </div>
    </div>
  );
}
