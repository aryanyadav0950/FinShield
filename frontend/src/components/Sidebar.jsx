import React from "react";
import {
  LayoutGrid,
  Search,
  UploadCloud,
  FileText,
  Info,
  Shield,
} from "lucide-react";

export default function Sidebar({ activeTab, setActiveTab, isOpen, setIsOpen }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutGrid },
    { id: "single", label: "Single Transaction", icon: Search },
    { id: "batch", label: "Batch Analysis", icon: UploadCloud },
    { id: "results", label: "Results", icon: FileText },
    { id: "model", label: "Model Information", icon: Info },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`sidebar ${isOpen ? "open" : ""}`}>
        {/* Brand Header */}
        <div className="sidebar-header">
          <div className="sidebar-brand-icon">
            <Shield size={20} strokeWidth={2.4} />
          </div>
          <div className="sidebar-brand-text">
            <span className="sidebar-brand-title">FinShield</span>
            <span className="sidebar-brand-subtitle">Anomaly Detection</span>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="sidebar-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                className={`sidebar-nav-item ${isActive ? "active" : ""}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (setIsOpen) setIsOpen(false);
                }}
              >
                <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Bottom Model Status Card */}
        <div className="sidebar-footer">
          <div className="sidebar-model-card">
            <span className="sidebar-model-label">Engine</span>
            <div className="sidebar-model-name">
              <span className="sidebar-status-dot"></span>
              <span>FinShield Isolation Forest</span>
            </div>
            <span className="sidebar-model-threshold">Threshold: 0.120</span>
          </div>
        </div>
      </aside>
    </>
  );
}
