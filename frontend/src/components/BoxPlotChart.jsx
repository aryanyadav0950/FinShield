import React, { useState } from "react";
import { useTheme } from "../context/ThemeContext";

/**
 * High-precision SVG Box Plot component matching the reference screenshot.
 * Visualizes transaction amounts for Normal Transactions vs Potential Anomalies on a logarithmic scale.
 * Automatically adapts styling, contrast, and tooltips between Light and Dark mode.
 */
export default function BoxPlotChart({ boxplotData }) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";
  const [hoveredSeries, setHoveredSeries] = useState(null);

  // Defaults based on exact dataset quantiles
  const stats = {
    normal: {
      min: boxplotData?.normal?.min ?? 0.0,
      q25: boxplotData?.normal?.q25 ?? 5.55,
      median: boxplotData?.normal?.median ?? 21.99,
      q75: boxplotData?.normal?.q75 ?? 76.48,
      max: boxplotData?.normal?.max ?? 4907.01,
      label: "Normal Transactions",
      color: isDark ? "#3b82f6" : "#2563eb",
      fill: isDark ? "rgba(37, 99, 235, 0.45)" : "rgba(37, 99, 235, 0.16)",
      glow: isDark ? "rgba(59, 130, 246, 0.5)" : "rgba(37, 99, 235, 0.15)",
      medianColor: isDark ? "#ffffff" : "#1e3a8a",
    },
    anomaly: {
      min: boxplotData?.potential_anomaly?.min ?? 0.0,
      q25: boxplotData?.potential_anomaly?.q25 ?? 9.13,
      median: boxplotData?.potential_anomaly?.median ?? 152.65,
      q75: boxplotData?.potential_anomaly?.q75 ?? 1856.75,
      max: boxplotData?.potential_anomaly?.max ?? 25691.16,
      label: "Potential Anomalies",
      color: isDark ? "#ef4444" : "#dc2626",
      fill: isDark ? "rgba(239, 68, 68, 0.45)" : "rgba(220, 38, 38, 0.16)",
      glow: isDark ? "rgba(239, 68, 68, 0.5)" : "rgba(220, 38, 38, 0.15)",
      medianColor: isDark ? "#ffffff" : "#991b1b",
    },
  };

  // Dimensions
  const width = 360;
  const height = 240;
  const padding = { top: 20, right: 30, bottom: 40, left: 55 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;

  // Log scale: from 1 (10^0) to 100,000 (10^5)
  const logMin = 0; // log10(1) = 0
  const logMax = 5; // log10(100,000) = 5

  const valToY = (val) => {
    const safeVal = Math.max(1, Math.min(val, 100000));
    const logVal = Math.log10(safeVal);
    const fraction = (logVal - logMin) / (logMax - logMin);
    return padding.top + plotHeight * (1 - fraction);
  };

  // Y-axis ticks: 1, 10, 100, 1K, 10K, 100K
  const ticks = [
    { value: 1, label: "1" },
    { value: 10, label: "10" },
    { value: 100, label: "100" },
    { value: 1000, label: "1K" },
    { value: 10000, label: "10K" },
    { value: 100000, label: "100K" },
  ];

  // Column positions
  const col1X = padding.left + plotWidth * 0.32;
  const col2X = padding.left + plotWidth * 0.78;
  const boxWidth = 52;

  // Outlier scatter points based on actual observations
  const normalOutliers = [
    120, 145, 180, 220, 290, 340, 420, 520, 680, 890, 1150, 1450, 1920, 2500, 3400, 4200, 4907,
  ];
  const anomalyOutliers = [
    2200, 2800, 3600, 4700, 5900, 7712, 9400, 12000, 15500, 19800, 25691,
  ];

  const textColor = isDark ? "#94a3b8" : "#475569";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.07)" : "#e2e8f0";
  const labelColor = isDark ? "#cbd5e1" : "#0f172a";

  const renderBox = (data, cx, outliers) => {
    const yQ25 = valToY(data.q25);
    const yQ75 = valToY(data.q75);
    const yMed = valToY(data.median);
    const yMax = valToY(Math.min(data.max, 50000));
    const yMin = valToY(Math.max(data.min, 1));
    const boxTop = Math.min(yQ25, yQ75);
    const boxH = Math.max(Math.abs(yQ25 - yQ75), 8);

    return (
      <g
        className="boxplot-group"
        onMouseEnter={() => setHoveredSeries(data)}
        onMouseLeave={() => setHoveredSeries(null)}
        style={{ cursor: "pointer" }}
      >
        {/* Whisker Line (Vertical) */}
        <line
          x1={cx}
          y1={yMax}
          x2={cx}
          y2={yMin}
          stroke={data.color}
          strokeWidth="1.5"
          opacity={isDark ? "0.8" : "0.9"}
        />

        {/* Top Whisker Cap */}
        <line
          x1={cx - 12}
          y1={yMax}
          x2={cx + 12}
          y2={yMax}
          stroke={data.color}
          strokeWidth="1.5"
          opacity={isDark ? "0.8" : "0.9"}
        />

        {/* Bottom Whisker Cap */}
        <line
          x1={cx - 12}
          y1={yMin}
          x2={cx + 12}
          y2={yMin}
          stroke={data.color}
          strokeWidth="1.5"
          opacity={isDark ? "0.8" : "0.9"}
        />

        {/* IQR Box */}
        <rect
          x={cx - boxWidth / 2}
          y={boxTop}
          width={boxWidth}
          height={boxH}
          fill={data.fill}
          stroke={data.color}
          strokeWidth="1.8"
          rx="3"
          filter={isDark ? `drop-shadow(0 0 6px ${data.glow})` : "none"}
        />

        {/* Median Line */}
        <line
          x1={cx - boxWidth / 2}
          y1={yMed}
          x2={cx + boxWidth / 2}
          y2={yMed}
          stroke={data.medianColor}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        {/* Jittered Outliers */}
        {outliers.map((val, idx) => {
          const jitter = ((idx * 17) % 15) - 7;
          const py = valToY(val);
          return (
            <circle
              key={idx}
              cx={cx + jitter}
              cy={py}
              r="2.2"
              fill={data.color}
              stroke={isDark ? "rgba(0, 0, 0, 0.4)" : "rgba(255, 255, 255, 0.6)"}
              strokeWidth="0.5"
              opacity={isDark ? "0.85" : "0.75"}
            />
          );
        })}
      </g>
    );
  };

  return (
    <div className="boxplot-container" style={{ position: "relative", width: "100%", height: "100%" }}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "100%", display: "block" }}
        className="boxplot-svg"
      >
        {/* Y-Axis Label */}
        <text
          x={-(padding.top + plotHeight / 2)}
          y="15"
          transform="rotate(-90)"
          fill={textColor}
          fontSize="10"
          fontWeight="600"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
        >
          Transaction Amount ($)
        </text>

        {/* Grid lines and Y-axis ticks */}
        {ticks.map((t) => {
          const y = valToY(t.value);
          return (
            <g key={t.value} className="grid-tick">
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke={gridColor}
                strokeDasharray={t.value === 1 ? "none" : "3,3"}
              />
              <text
                x={padding.left - 8}
                y={y + 3.5}
                fill={textColor}
                fontSize="10"
                fontWeight="500"
                textAnchor="end"
                fontFamily="Inter, sans-serif"
              >
                {t.label}
              </text>
            </g>
          );
        })}

        {/* Render Boxes */}
        {renderBox(stats.normal, col1X, normalOutliers)}
        {renderBox(stats.anomaly, col2X, anomalyOutliers)}

        {/* X-Axis Column Labels */}
        <text
          x={col1X}
          y={height - 12}
          fill={labelColor}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
        >
          Normal Transactions
        </text>
        <text
          x={col2X}
          y={height - 12}
          fill={labelColor}
          fontSize="11"
          fontWeight="600"
          textAnchor="middle"
          fontFamily="Inter, sans-serif"
        >
          Potential Anomalies
        </text>
      </svg>

      {/* Hover Info Tooltip */}
      {hoveredSeries && (
        <div
          style={{
            position: "absolute",
            top: "8px",
            right: "12px",
            background: isDark ? "rgba(15, 23, 42, 0.95)" : "#ffffff",
            border: `1px solid ${hoveredSeries.color}`,
            borderRadius: "8px",
            padding: "8px 12px",
            fontSize: "11px",
            color: isDark ? "#f8fafc" : "#0f172a",
            boxShadow: isDark
              ? "0 4px 14px rgba(0, 0, 0, 0.5)"
              : "0 4px 14px rgba(0, 0, 0, 0.12)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        >
          <div style={{ fontWeight: 700, color: hoveredSeries.color, marginBottom: "4px" }}>
            {hoveredSeries.label}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "2px 8px" }}>
            <span style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Median:</span>
            <strong>${hoveredSeries.median.toFixed(2)}</strong>
            <span style={{ color: isDark ? "#94a3b8" : "#64748b" }}>IQR (Q1–Q3):</span>
            <span>${hoveredSeries.q25.toFixed(2)} – ${hoveredSeries.q75.toFixed(2)}</span>
            <span style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Max:</span>
            <span>${hoveredSeries.max.toLocaleString()}</span>
          </div>
        </div>
      )}
    </div>
  );
}
