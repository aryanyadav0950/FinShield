import React from "react";
import { Sun, Moon, Monitor, Menu } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Header({ activeTab, setIsSidebarOpen }) {
  const { theme, setTheme } = useTheme();

  const titles = {
    dashboard: {
      title: "FinShield Dashboard",
      subtitle: "Overview of transaction analysis and FinShield anomaly detection results",
    },
    single: {
      title: "Single Transaction Analysis",
      subtitle: "Evaluate individual transactions with FinShield anomaly scoring",
    },
    batch: {
      title: "Batch CSV Analysis",
      subtitle: "Upload and analyze transaction datasets using FinShield vectorized scoring",
    },
    results: {
      title: "Analysis Results",
      subtitle: "Review FinShield detected anomalies, distribution statistics, and ground-truth comparisons",
    },
    model: {
      title: "Model Information",
      subtitle: "FinShield engine architecture, hyperparameters, and experimental evaluation metrics",
    },
  };

  const current = titles[activeTab] || titles.dashboard;

  return (
    <header className="app-header">
      <div className="header-left">
        <button
          className="mobile-menu-btn"
          onClick={() => setIsSidebarOpen((prev) => !prev)}
          aria-label="Toggle Navigation"
        >
          <Menu size={20} />
        </button>
        <div className="header-title-block">
          <h1>{current.title}</h1>
          <p>{current.subtitle}</p>
        </div>
      </div>

      <div className="header-right">
        {/* Model Status Indicator Badge */}
        <div className="model-status-indicator" title="FinShield Isolation Forest model active">
          <span className="status-dot"></span>
          <span>FinShield: Isolation Forest (Threshold 0.120)</span>
        </div>

        {/* Theme Selector: Light, Dark, System */}
        <div className="theme-selector" role="group" aria-label="Theme selector">
          <button
            className={`theme-btn ${theme === "light" ? "active" : ""}`}
            onClick={() => setTheme("light")}
            title="Light Theme"
          >
            <Sun size={13} />
            <span>Light</span>
          </button>
          <button
            className={`theme-btn ${theme === "dark" ? "active" : ""}`}
            onClick={() => setTheme("dark")}
            title="Dark Theme"
          >
            <Moon size={13} />
            <span>Dark</span>
          </button>
          <button
            className={`theme-btn ${theme === "system" ? "active" : ""}`}
            onClick={() => setTheme("system")}
            title="Follow System Preference"
          >
            <Monitor size={13} />
            <span>System</span>
          </button>
        </div>
      </div>
    </header>
  );
}
