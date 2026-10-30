import React, { useEffect, useRef } from "react";
import { Chart as ChartJS, registerables } from "chart.js";

// Ensure all controllers (Bar, Doughnut, etc.), scales, and elements are registered
ChartJS.register(...registerables);

/**
 * Universal safe canvas wrapper for Chart.js.
 * Guarantees proper destruction of existing chart instances before re-initializing,
 * eliminating the "Canvas is already in use" React 19 / StrictMode bug.
 */
export function SafeChart({ type, data, options, id }) {
  const canvasRef = useRef(null);
  const chartInstanceRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // 1. Destroy any existing instance attached to this canvas DOM node
    const existingChart = ChartJS.getChart(canvas);
    if (existingChart) {
      existingChart.destroy();
    }

    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
      chartInstanceRef.current = null;
    }

    // 2. Initialize fresh chart instance
    if (data && data.datasets) {
      try {
        chartInstanceRef.current = new ChartJS(canvas, {
          type,
          data,
          options: options || { responsive: true, maintainAspectRatio: false },
        });
      } catch (err) {
        console.warn("Chart initialization warning:", err);
      }
    }

    // 3. Cleanup on unmount or dependency change
    return () => {
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
        chartInstanceRef.current = null;
      }
      if (canvas) {
        const leftover = ChartJS.getChart(canvas);
        if (leftover) {
          leftover.destroy();
        }
      }
    };
  }, [type, data, options]);

  return <canvas ref={canvasRef} id={id} />;
}

export function SafeBarChart({ data, options, id }) {
  return <SafeChart type="bar" data={data} options={options} id={id} />;
}

export function SafeDoughnutChart({ data, options, id }) {
  return <SafeChart type="doughnut" data={data} options={options} id={id} />;
}
