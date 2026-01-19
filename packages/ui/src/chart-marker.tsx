"use client";

import React, { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";

// CSS variable references
const cssVars = {
  markerBackground: "var(--chart-marker-background)",
  markerBorder: "var(--chart-marker-border)",
  markerForeground: "var(--chart-marker-foreground)",
};

// Fan configuration
const FAN_RADIUS = 50;
const FAN_ANGLE = 160; // degrees to spread across

export interface ChartMarker {
  /** Date for this marker (will be matched to nearest data point) */
  date: Date;
  /** Icon to display in the marker circle */
  icon: React.ReactNode;
  /** Title shown in tooltip */
  title: string;
  /** Optional description */
  description?: string;
  /** Optional custom content for tooltip (overrides title/description) */
  content?: React.ReactNode;
  /** Optional color override for the marker circle */
  color?: string;
}

export interface MarkerGroupProps {
  /** X position in pixels */
  x: number;
  /** Y position (top of chart area) */
  y: number;
  /** Markers at this position */
  markers: ChartMarker[];
  /** Whether this marker group is currently hovered (via chart hover) */
  isActive?: boolean;
  /** Size of each marker circle */
  size?: number;
  /** Callback when marker group is hovered */
  onHover?: (markers: ChartMarker[] | null) => void;
  /** Reference to chart container for portal positioning */
  containerRef?: React.RefObject<HTMLDivElement | null>;
  /** Margin left offset from chart container */
  marginLeft?: number;
  /** Margin top offset from chart container */
  marginTop?: number;
}

export function MarkerGroup({
  x,
  y,
  markers,
  isActive = false,
  size = 28,
  onHover,
  containerRef,
  marginLeft = 0,
  marginTop = 0,
}: MarkerGroupProps) {
  const [isHovered, setIsHovered] = useState(false);
  const shouldFan = isHovered && markers.length > 1;
  const hasMultiple = markers.length > 1;

  // Calculate fan position for each marker
  const getCirclePosition = (index: number, total: number) => {
    const startAngle = -90 - FAN_ANGLE / 2; // Start from top-left
    const angleStep = total > 1 ? FAN_ANGLE / (total - 1) : 0;
    const angle = startAngle + index * angleStep;
    const radians = (angle * Math.PI) / 180;

    return {
      x: Math.cos(radians) * FAN_RADIUS,
      y: Math.sin(radians) * FAN_RADIUS,
    };
  };

  const handleMouseEnter = () => {
    setIsHovered(true);
    onHover?.(markers);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    onHover?.(null);
  };

  // Calculate absolute position for portal
  const portalX = x + marginLeft;
  const portalY = y + marginTop;

  return (
    <>
      {/* SVG anchor point - the main marker circle */}
      <g
        transform={`translate(${x}, ${y})`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ cursor: "pointer" }}
      >
        {/* Invisible hit area for easier hovering */}
        <rect
          x={-size}
          y={-size * 2.5}
          width={size * 2}
          height={size * 3}
          fill="transparent"
        />

        {/* Main stacked marker (always visible) */}
        <MarkerCircle
          icon={markers[0]?.icon}
          size={size}
          color={markers[0]?.color}
        />

        {/* Stack count badge when multiple */}
        <AnimatePresence>
          {hasMultiple && !shouldFan && (
            <motion.g
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
            >
              <circle
                cx={size / 2 + 2}
                cy={-size / 2 - 2}
                r={9}
                fill="var(--chart-line-primary)"
              />
              <text
                x={size / 2 + 2}
                y={-size / 2 - 2}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={11}
                fontWeight={600}
                fill="white"
              >
                {markers.length}
              </text>
            </motion.g>
          )}
        </AnimatePresence>
      </g>

      {/* Portal for fanned circles - escapes SVG clipping */}
      {containerRef?.current &&
        createPortal(
          <div
            className="absolute pointer-events-none"
            style={{
              left: portalX,
              top: portalY,
              zIndex: 100,
              // Use transform to center the portal origin exactly on the crosshair
              transform: "translate(0, 0)",
            }}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            {/* Fanned circles */}
            <AnimatePresence>
              {shouldFan &&
                markers.map((marker, index) => {
                  const position = getCirclePosition(index, markers.length);
                  return (
                    <motion.div
                      key={`fan-${marker.date.toISOString()}-${index}`}
                      className="absolute pointer-events-auto"
                      style={{
                        width: size,
                        height: size,
                        // Center the circle on the origin point
                        left: -size / 2,
                        top: -size / 2,
                      }}
                      initial={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      animate={{
                        x: position.x,
                        y: position.y,
                        scale: 1,
                        opacity: 1,
                      }}
                      exit={{ x: 0, y: 0, scale: 0, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 400,
                        damping: 22,
                        delay: index * 0.04,
                      }}
                    >
                      <MarkerCircleHTML
                        icon={marker.icon}
                        size={size}
                        color={marker.color}
                      />
                    </motion.div>
                  );
                })}
            </AnimatePresence>

            {/* Center target circle (visible when fanned) */}
            <AnimatePresence>
              {shouldFan && (
                <motion.div
                  className="absolute"
                  style={{
                    width: size * 0.5,
                    height: size * 0.5,
                    left: -size * 0.25,
                    top: -size * 0.25,
                  }}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 0.5 }}
                  exit={{ scale: 0, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <div
                    className="w-full h-full rounded-full"
                    style={{
                      backgroundColor: cssVars.markerBorder,
                    }}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>,
          containerRef.current
        )}
    </>
  );
}

interface MarkerCircleProps {
  icon: React.ReactNode;
  size: number;
  color?: string;
}

// SVG version for the main stacked marker
function MarkerCircle({ icon, size, color }: MarkerCircleProps) {
  return (
    <g>
      {/* Shadow */}
      <circle cx={0} cy={2} r={size / 2} fill="black" opacity={0.15} />
      {/* Background */}
      <circle
        cx={0}
        cy={0}
        r={size / 2}
        fill={color || cssVars.markerBackground}
        stroke={cssVars.markerBorder}
        strokeWidth={1.5}
      />
      {/* Icon container */}
      <foreignObject
        x={-size / 2 + 4}
        y={-size / 2 + 4}
        width={size - 8}
        height={size - 8}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: cssVars.markerForeground,
            fontSize: size * 0.5,
          }}
        >
          {icon}
        </div>
      </foreignObject>
    </g>
  );
}

// HTML version for the fanned markers (rendered via portal)
function MarkerCircleHTML({ icon, size, color }: MarkerCircleProps) {
  return (
    <div
      className="relative w-full h-full rounded-full flex items-center justify-center shadow-lg"
      style={{
        backgroundColor: color || cssVars.markerBackground,
        border: `1.5px solid ${cssVars.markerBorder}`,
        fontSize: size * 0.5,
        color: cssVars.markerForeground,
      }}
    >
      {icon}
    </div>
  );
}

// Tooltip content component for markers
export interface MarkerTooltipContentProps {
  markers: ChartMarker[];
}

export function MarkerTooltipContent({ markers }: MarkerTooltipContentProps) {
  if (markers.length === 0) return null;

  return (
    <div className="border-t border-zinc-700/50 pt-2 mt-2 space-y-2">
      {markers.map((marker, index) => (
        <div key={index} className="flex items-start gap-2">
          <div
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center"
            style={{
              backgroundColor: marker.color || cssVars.markerBackground,
              border: `1px solid ${cssVars.markerBorder}`,
            }}
          >
            <span
              className="text-xs"
              style={{ color: cssVars.markerForeground }}
            >
              {marker.icon}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            {marker.content ? (
              marker.content
            ) : (
              <>
                <div className="text-sm font-medium text-white truncate">
                  {marker.title}
                </div>
                {marker.description && (
                  <div className="text-xs text-zinc-400 truncate">
                    {marker.description}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export default MarkerGroup;
