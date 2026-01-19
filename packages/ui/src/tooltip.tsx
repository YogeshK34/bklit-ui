"use client";

import React from "react";
import { motion, useSpring, useTransform } from "motion/react";

// Spring config for smooth tooltip movement
const springConfig = { stiffness: 400, damping: 35 };

export interface TooltipRow {
  color: string;
  label: string;
  value: string | number;
}

export interface TooltipProps {
  /** X position in pixels relative to container */
  x: number;
  /** Whether the tooltip is visible */
  visible: boolean;
  /** Title/date shown in the tooltip header */
  title?: string;
  /** Data rows to display */
  rows: TooltipRow[];
  /** Container width for collision detection */
  containerWidth: number;
  /** Whether to show the date pill at bottom */
  showDatePill?: boolean;
  /** Current data index for the date ticker */
  currentIndex?: number;
  /** Array of formatted date labels for the ticker */
  dateLabels?: string[];
  /** Custom class name */
  className?: string;
}

// Tailwind h-6 = 24px - height of each item in the carousel
const TICKER_ITEM_HEIGHT = 24;

// Animated date ticker component - true carousel with all labels stacked
function DateTicker({
  currentIndex,
  labels,
  visible,
}: {
  currentIndex: number;
  labels: string[];
  visible: boolean;
}) {
  // Animated Y offset - scrolls the entire stack
  const y = useSpring(0, { stiffness: 400, damping: 35 });

  // Update scroll position when index changes
  React.useEffect(() => {
    y.set(-currentIndex * TICKER_ITEM_HEIGHT);
  }, [currentIndex, y]);

  if (!visible || labels.length === 0) return null;

  return (
    <motion.div
      className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full shadow-lg overflow-hidden px-4 py-1"
      // layout animates width changes smoothly
      layout
      transition={{
        layout: { type: "spring", stiffness: 400, damping: 35 },
      }}
    >
      {/* Fixed height viewport that shows one item - h-6 = 24px */}
      <div className="relative overflow-hidden h-6">
        {/* Scrolling stack of all labels */}
        <motion.div className="flex flex-col" style={{ y }}>
          {labels.map((label, index) => (
            <div
              key={index}
              className="flex items-center justify-center shrink-0 h-6"
            >
              <span className="text-sm font-medium whitespace-nowrap">
                {label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>
    </motion.div>
  );
}

export function ChartTooltip({
  x,
  visible,
  title,
  rows,
  containerWidth,
  showDatePill = true,
  currentIndex = 0,
  dateLabels = [],
  className = "",
}: TooltipProps) {
  // Animated X position
  const animatedX = useSpring(x, springConfig);

  // Update spring target when position changes
  React.useEffect(() => {
    animatedX.set(x);
  }, [x, animatedX]);

  // Tooltip box position - flip to left side when near right edge
  const tooltipWidth = 160;
  const tooltipLeft = useTransform(animatedX, (val) => {
    const shouldFlip = val + tooltipWidth + 20 > containerWidth;
    return shouldFlip ? val - tooltipWidth - 14 : val + 14;
  });

  if (!visible) return null;

  return (
    <>
      {/* Tooltip Box */}
      <motion.div
        className={`absolute pointer-events-none z-50 top-10 ${className}`}
        style={{ left: tooltipLeft }}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
      >
        <div className="bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg shadow-lg px-3 py-2.5 min-w-[140px]">
          {title && (
            <div className="text-xs font-medium text-zinc-400 dark:text-zinc-500 mb-2">
              {title}
            </div>
          )}
          <div className="space-y-1.5">
            {rows.map((row, index) => (
              <div
                key={index}
                className="flex items-center justify-between gap-4"
              >
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: row.color }}
                  />
                  <span className="text-sm text-zinc-100 dark:text-zinc-800">
                    {row.label}
                  </span>
                </div>
                <span className="text-sm font-medium text-white dark:text-zinc-900 tabular-nums">
                  {typeof row.value === "number"
                    ? row.value.toLocaleString()
                    : row.value}
                </span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Animated Date Ticker at bottom */}
      {showDatePill && dateLabels.length > 0 && (
        <motion.div
          className="absolute pointer-events-none z-50 bottom-3"
          style={{
            left: animatedX,
            x: "-50%", // Center on the crosshair
          }}
        >
          <DateTicker
            currentIndex={currentIndex}
            labels={dateLabels}
            visible={visible}
          />
        </motion.div>
      )}
    </>
  );
}

// SVG Vertical line indicator
export interface TooltipIndicatorProps {
  x: number;
  height: number;
  visible: boolean;
  color?: string;
}

export function TooltipIndicator({
  x,
  height,
  visible,
  color = "currentColor",
}: TooltipIndicatorProps) {
  const animatedX = useSpring(x, springConfig);

  React.useEffect(() => {
    animatedX.set(x);
  }, [x, animatedX]);

  if (!visible) return null;

  return (
    <motion.line
      x1={animatedX}
      y1={0}
      x2={animatedX}
      y2={height}
      stroke={color}
      strokeWidth={1}
    />
  );
}

// SVG Animated dot
export interface TooltipDotProps {
  x: number;
  y: number;
  visible: boolean;
  color: string;
  size?: number;
  strokeColor?: string;
  strokeWidth?: number;
}

export function TooltipDot({
  x,
  y,
  visible,
  color,
  size = 5,
  strokeColor = "white",
  strokeWidth = 2,
}: TooltipDotProps) {
  const animatedX = useSpring(x, springConfig);
  const animatedY = useSpring(y, springConfig);

  React.useEffect(() => {
    animatedX.set(x);
    animatedY.set(y);
  }, [x, y, animatedX, animatedY]);

  if (!visible) return null;

  return (
    <motion.circle
      cx={animatedX}
      cy={animatedY}
      r={size}
      fill={color}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
    />
  );
}

export default ChartTooltip;
