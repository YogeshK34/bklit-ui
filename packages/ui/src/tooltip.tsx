"use client";

import { AnimatePresence, motion, useSpring } from "motion/react";
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import useMeasure from "react-use-measure";

// Spring config for smooth tooltip movement - matches dash array for consistency
const springConfig = { stiffness: 100, damping: 20 };

// Faster spring for crosshair/indicator - more responsive to mouse movement
const crosshairSpringConfig = { stiffness: 300, damping: 30 };

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
  /** Optional marker content to append below rows */
  markerContent?: React.ReactNode;
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
              className="flex items-center justify-center shrink-0 h-6"
              key={index}
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

// Inner content component with height animation for dynamic marker content
function TooltipContent({
  title,
  rows,
  markerContent,
}: {
  title?: string;
  rows: TooltipRow[];
  markerContent?: React.ReactNode;
}) {
  const [measureRef, bounds] = useMeasure();

  // Generate a key based on whether marker content exists
  // This ensures AnimatePresence triggers when content changes
  const markerKey = markerContent ? "has-marker" : "no-marker";

  return (
    <motion.div
      animate={{ height: bounds.height || "auto" }}
      className="overflow-hidden"
      transition={{
        type: "spring",
        stiffness: 500,
        damping: 35,
        mass: 0.8,
      }}
    >
      <div className="px-3 py-2.5" ref={measureRef}>
        {title && (
          <div className="text-xs font-medium text-zinc-400 mb-2">{title}</div>
        )}
        <div className="space-y-1.5">
          {rows.map((row, index) => (
            <div
              className="flex items-center justify-between gap-4"
              key={index}
            >
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: row.color }}
                />
                <span className="text-sm text-zinc-100">{row.label}</span>
              </div>
              <span className="text-sm font-medium text-white tabular-nums">
                {typeof row.value === "number"
                  ? row.value.toLocaleString()
                  : row.value}
              </span>
            </div>
          ))}
        </div>

        {/* Animated marker content - fades in with blur */}
        <AnimatePresence mode="wait">
          {markerContent && (
            <motion.div
              animate={{ opacity: 1, filter: "blur(0px)" }}
              className="mt-2"
              exit={{ opacity: 0, filter: "blur(4px)" }}
              initial={{ opacity: 0, filter: "blur(4px)" }}
              key={markerKey}
              transition={{
                duration: 0.2,
                ease: "easeOut",
              }}
            >
              {markerContent}
            </motion.div>
          )}
        </AnimatePresence>
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
  markerContent,
}: TooltipProps) {
  // Ref to measure actual tooltip width
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipWidth, setTooltipWidth] = useState(180); // Default estimate

  // Measure tooltip width after render - runs on every render to catch content changes
  useLayoutEffect(() => {
    if (tooltipRef.current) {
      const width = tooltipRef.current.offsetWidth;
      if (width > 0 && width !== tooltipWidth) {
        setTooltipWidth(width);
      }
    }
  }, [visible, rows, markerContent, tooltipWidth]);

  // Tooltip positioning constants
  const tooltipOffset = 16;

  // Calculate target position - this is the actual left position in pixels
  // When flipped, we need to position the tooltip so its RIGHT edge is offset from crosshair
  const shouldFlip = x + tooltipWidth + tooltipOffset > containerWidth;
  const targetX = shouldFlip
    ? x - tooltipOffset - tooltipWidth // Position left of crosshair
    : x + tooltipOffset; // Position right of crosshair

  // Track flip state changes for animation
  const prevFlipRef = useRef(shouldFlip);
  const [flipKey, setFlipKey] = useState(0);

  useEffect(() => {
    if (prevFlipRef.current !== shouldFlip) {
      setFlipKey((k) => k + 1); // Trigger re-animation on flip
      prevFlipRef.current = shouldFlip;
    }
  }, [shouldFlip]);

  // Animated position - smoothly moves when flip happens
  const animatedLeft = useSpring(targetX, springConfig);

  // Update spring target when position changes
  React.useEffect(() => {
    animatedLeft.set(targetX);
  }, [targetX, animatedLeft]);

  // Also animate the crosshair position for the date ticker - uses faster spring to stay in sync
  const animatedX = useSpring(x, crosshairSpringConfig);
  React.useEffect(() => {
    animatedX.set(x);
  }, [x, animatedX]);

  if (!visible) return null;

  // Transform origin based on flip - animate from the edge closest to crosshair
  const transformOrigin = shouldFlip ? "right top" : "left top";

  return (
    <>
      {/* Tooltip Box */}
      <motion.div
        animate={{ opacity: 1 }}
        className={`absolute pointer-events-none z-50 top-10 ${className}`}
        exit={{ opacity: 0 }}
        initial={{ opacity: 0 }}
        ref={tooltipRef}
        style={{
          left: animatedLeft,
        }}
        transition={{ duration: 0.1 }}
      >
        {/* Inner content with flip animation and height animation */}
        <motion.div
          animate={{ scale: 1, opacity: 1, x: 0 }}
          className="bg-zinc-900/30 backdrop-blur-md text-white rounded-lg shadow-lg min-w-[140px] overflow-hidden"
          initial={{ scale: 0.85, opacity: 0, x: shouldFlip ? 20 : -20 }}
          key={flipKey}
          style={{ transformOrigin }}
          transition={{
            type: "spring",
            stiffness: 300,
            damping: 25,
          }}
        >
          <TooltipContent
            markerContent={markerContent}
            rows={rows}
            title={title}
          />
        </motion.div>
      </motion.div>

      {/* Animated Date Ticker at bottom - aligned with X-axis labels */}
      {showDatePill && dateLabels.length > 0 && (
        <motion.div
          className="absolute pointer-events-none z-50"
          style={{
            left: animatedX,
            x: "-50%", // Center on the crosshair
            bottom: 4, // Align with X-axis tick labels
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

// SVG Vertical indicator with gradient - supports variable width
export type IndicatorWidth =
  | number // Pixel width
  | "line" // 1px line (default)
  | "thin" // 2px
  | "medium" // 4px
  | "thick"; // 8px

export interface TooltipIndicatorProps {
  /** X position in pixels (center of the indicator) */
  x: number;
  /** Height of the indicator */
  height: number;
  /** Whether the indicator is visible */
  visible: boolean;
  /**
   * Width of the indicator - number (pixels) or preset.
   * Ignored if `span` is provided.
   */
  width?: IndicatorWidth;
  /**
   * Number of columns/days to span, with current point centered.
   * e.g., span={2} spans 2 full day widths centered on x.
   * Requires `columnWidth` to be set.
   *
   * Visual: span={2}
   *       |     +     |
   * ---X-----Y-----Z---
   *     [==========]  <- spans from halfway to X to halfway to Z
   */
  span?: number;
  /**
   * Width of a single column/day in pixels.
   * Required when using `span`. Calculate from xScale.
   */
  columnWidth?: number;
  /** Primary color at edges (10% and 90%) */
  colorEdge?: string;
  /** Secondary color at center (50%) */
  colorMid?: string;
  /** Whether to fade to transparent at 0% and 100%, otherwise uses colorEdge */
  fadeEdges?: boolean;
  /** Unique ID for the gradient (needed if multiple indicators on same SVG) */
  gradientId?: string;
}

// Convert width prop to pixel value
function resolveWidth(width: IndicatorWidth): number {
  if (typeof width === "number") return width;
  switch (width) {
    case "line":
      return 1;
    case "thin":
      return 2;
    case "medium":
      return 4;
    case "thick":
      return 8;
    default:
      return 1;
  }
}

export function TooltipIndicator({
  x,
  height,
  visible,
  width = "line",
  span,
  columnWidth,
  colorEdge = "var(--chart-crosshair)",
  colorMid = "var(--chart-crosshair)",
  fadeEdges = true,
  gradientId = "tooltip-indicator-gradient",
}: TooltipIndicatorProps) {
  // Calculate pixel width - span takes precedence over width
  const pixelWidth =
    span !== undefined && columnWidth !== undefined
      ? span * columnWidth
      : resolveWidth(width);

  // Animate X position (left edge of rect, centered on x) - uses faster spring
  const animatedX = useSpring(x - pixelWidth / 2, crosshairSpringConfig);

  React.useEffect(() => {
    animatedX.set(x - pixelWidth / 2);
  }, [x, animatedX, pixelWidth]);

  if (!visible) return null;

  // Opacity at edges - 0 if fadeEdges, 1 otherwise
  const edgeOpacity = fadeEdges ? 0 : 1;

  return (
    <g>
      {/* Vertical gradient - fades at top/bottom. Uses style prop for CSS variable support */}
      <defs>
        <linearGradient id={gradientId} x1="0%" x2="0%" y1="0%" y2="100%">
          <stop
            offset="0%"
            style={{ stopColor: colorEdge, stopOpacity: edgeOpacity }}
          />
          <stop offset="10%" style={{ stopColor: colorEdge, stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: colorMid, stopOpacity: 1 }} />
          <stop offset="90%" style={{ stopColor: colorEdge, stopOpacity: 1 }} />
          <stop
            offset="100%"
            style={{ stopColor: colorEdge, stopOpacity: edgeOpacity }}
          />
        </linearGradient>
      </defs>
      <motion.rect
        fill={`url(#${gradientId})`}
        height={height}
        width={pixelWidth}
        x={animatedX}
        y={0}
      />
    </g>
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
  // Use faster crosshair spring to stay in sync with indicator
  const animatedX = useSpring(x, crosshairSpringConfig);
  const animatedY = useSpring(y, crosshairSpringConfig);

  React.useEffect(() => {
    animatedX.set(x);
    animatedY.set(y);
  }, [x, y, animatedX, animatedY]);

  if (!visible) return null;

  return (
    <motion.circle
      cx={animatedX}
      cy={animatedY}
      fill={color}
      r={size}
      stroke={strokeColor}
      strokeWidth={strokeWidth}
    />
  );
}

export default ChartTooltip;
