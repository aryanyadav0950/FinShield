import React from "react";
import { useTheme } from "../context/ThemeContext";

/**
 * High-fidelity SVG sparkline wave component for KPI cards.
 * Automatically adapts between Light and Dark mode with appropriate opacity and shadow.
 */
export default function KpiSparkline({ color = "#3b82f6", variant = "blue" }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Pre-calibrated smooth wave paths matching each metric's aesthetic
  const paths = {
    blue: {
      d: "M 0 32 Q 25 18, 50 28 T 100 24 T 150 16 T 200 26 T 240 18 T 280 28 T 320 20 L 320 45 L 0 45 Z",
      stroke: "M 0 32 Q 25 18, 50 28 T 100 24 T 150 16 T 200 26 T 240 18 T 280 28 T 320 20",
    },
    red: {
      d: "M 0 35 Q 30 38, 60 30 T 110 32 T 160 25 T 210 32 T 250 18 T 285 24 T 320 16 L 320 45 L 0 45 Z",
      stroke: "M 0 35 Q 30 38, 60 30 T 110 32 T 160 25 T 210 32 T 250 18 T 285 24 T 320 16",
    },
    green: {
      d: "M 0 34 Q 30 32, 60 26 T 120 30 T 170 20 T 220 25 T 260 16 T 300 22 T 320 14 L 320 45 L 0 45 Z",
      stroke: "M 0 34 Q 30 32, 60 26 T 120 30 T 170 20 T 220 25 T 260 16 T 300 22 T 320 14",
    },
    purple: {
      d: "M 0 36 Q 35 34, 70 28 T 130 32 T 180 22 T 230 26 T 270 18 T 300 22 T 320 15 L 320 45 L 0 45 Z",
      stroke: "M 0 36 Q 35 34, 70 28 T 130 32 T 180 22 T 230 26 T 270 18 T 300 22 T 320 15",
    },
  };

  const p = paths[variant] || paths.blue;
  const gradientId = `sparkline-grad-${variant}-${resolvedTheme}`;
  const filterId = `sparkline-filter-${variant}-${resolvedTheme}`;

  return (
    <div className="kpi-sparkline-container" aria-hidden="true">
      <svg
        viewBox="0 0 320 45"
        preserveAspectRatio="none"
        className="kpi-sparkline-svg"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={isDark ? 0.35 : 0.16} />
            <stop offset="100%" stopColor={color} stopOpacity="0.0" />
          </linearGradient>
          {isDark ? (
            <filter id={filterId} x="-10%" y="-20%" width="120%" height="150%">
              <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={color} floodOpacity="0.7" />
            </filter>
          ) : (
            <filter id={filterId} x="-10%" y="-20%" width="120%" height="150%">
              <feDropShadow dx="0" dy="1" stdDeviation="1.2" floodColor={color} floodOpacity="0.3" />
            </filter>
          )}
        </defs>

        {/* Gradient Area Fill */}
        <path d={p.d} fill={`url(#${gradientId})`} />

        {/* Top Wave Stroke */}
        <path
          d={p.stroke}
          fill="none"
          stroke={color}
          strokeWidth={isDark ? "2.2" : "2.0"}
          strokeLinecap="round"
          strokeLinejoin="round"
          filter={`url(#${filterId})`}
        />
      </svg>
    </div>
  );
}
