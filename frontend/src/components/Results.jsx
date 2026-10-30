import React, { useState } from "react";
import {
  FileSpreadsheet,
  Search,
  Download,
  AlertTriangle,
  CheckCircle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  BarChart2,
  PieChart,
  Percent,
} from "lucide-react";
import { SafeBarChart, SafeDoughnutChart } from "./SafeChart";
import KpiSparkline from "./KpiSparkline";
import { useTheme } from "../context/ThemeContext";

export default function Results({ analysisResults, onNavigateToSingle, onNavigateToBatch }) {
  const { resolvedTheme } = useTheme();
  const [filterResult, setFilterResult] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("anomaly_score");
  const [sortOrder, setSortOrder] = useState("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const isDark = resolvedTheme === "dark";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.07)" : "#f1f5f9";

  const hasData = analysisResults && analysisResults.results && analysisResults.results.length > 0;

  if (!hasData) {
    return (
      <div className="page-container">
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">
              <FileSpreadsheet size={28} />
            </div>
            <h3 className="empty-state-title">No Analysis Results Available</h3>
            <p className="empty-state-desc">
              Run a single transaction prediction or upload a batch CSV dataset to inspect FinShield classification
              outcomes, anomaly scores, and distribution metrics.
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
              <button className="btn btn-secondary" onClick={onNavigateToSingle}>
                <span>Single Transaction</span>
              </button>
              <button className="btn btn-primary" onClick={onNavigateToBatch}>
                <span>Batch CSV Analysis</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { summary, results } = analysisResults;

  // Filter & Sort
  const filtered = results.filter((item) => {
    if (filterResult === "anomalies" && !item.is_anomaly) return false;
    if (filterResult === "normal" && item.is_anomaly) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      return String(item.id).includes(q) || String(item.amount).includes(q);
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];
    return sortOrder === "asc" ? (aVal > bVal ? 1 : -1) : aVal < bVal ? 1 : -1;
  });

  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const pagedItems = sorted.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(col);
      setSortOrder("desc");
    }
  };

  // Anomaly score distribution bins for the batch results
  const scoreBins = ["<-0.1", "-0.1 to 0", "0 to 0.08", "0.08 to 0.12", "0.12 to 0.18", ">0.18"];
  const binCounts = [0, 0, 0, 0, 0, 0];
  results.forEach((r) => {
    const s = r.anomaly_score;
    if (s < -0.1) binCounts[0]++;
    else if (s < 0) binCounts[1]++;
    else if (s < 0.08) binCounts[2]++;
    else if (s < 0.12) binCounts[3]++;
    else if (s < 0.18) binCounts[4]++;
    else binCounts[5]++;
  });

  const scoreDistChartData = {
    labels: scoreBins,
    datasets: [
      {
        label: "Transactions in Score Bin",
        data: binCounts,
        backgroundColor: binCounts.map((_, i) => (i >= 4 ? "#ef4444" : "#2563eb")),
        borderColor: binCounts.map((_, i) => (i >= 4 ? "#f87171" : "#3b82f6")),
        borderWidth: 1,
        borderRadius: 4,
      },
    ],
  };

  const doughnutBorder = isDark ? "#0e1629" : "#ffffff";
  const tooltipBg = isDark ? "#0f172a" : "#ffffff";
  const tooltipBorder = isDark ? "rgba(255, 255, 255, 0.15)" : "#cbd5e1";
  const tooltipTitle = isDark ? "#f8fafc" : "#0f172a";
  const tooltipBody = isDark ? "#cbd5e1" : "#334155";

  const resultsDoughnutData = {
    labels: ["Normal Transactions", "Potential Anomalies"],
    datasets: [
      {
        data: [summary.normal_transactions, summary.potential_anomalies],
        backgroundColor: ["#10b981", "#ef4444"],
        borderColor: [doughnutBorder, doughnutBorder],
        borderWidth: 2,
        cutout: "70%",
      },
    ],
  };

  const handleDownloadCSV = () => {
    const hasClass = summary?.has_ground_truth;
    const headers = [
      "Transaction ID",
      "Time",
      "Amount",
      "Anomaly Score",
      "Threshold",
      "Prediction",
    ];
    if (hasClass) headers.push("Actual Class");

    const rows = results.map((r) => {
      const row = [r.id, r.time, r.amount, r.anomaly_score, r.threshold, r.prediction];
      if (hasClass) row.push(r.actual_class !== null ? r.actual_class : "");
      return row.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finshield_analysis_export_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      {/* KPI Stat Cards */}
      <div className="kpi-grid">
        <div className="kpi-card kpi-blue">
          <div className="kpi-card-inner">
            <div className="kpi-header-row">
              <div className="kpi-icon-badge kpi-badge-blue">
                <FileSpreadsheet size={18} />
              </div>
              <span className="kpi-label">Analyzed Records</span>
            </div>
            <div className="kpi-value">{summary.transactions_analyzed.toLocaleString()}</div>
            <div className="kpi-subtext">Total processed records</div>
          </div>
          <KpiSparkline color="#3b82f6" variant="blue" />
        </div>

        <div className="kpi-card kpi-red">
          <div className="kpi-card-inner">
            <div className="kpi-header-row">
              <div className="kpi-icon-badge kpi-badge-red">
                <AlertTriangle size={18} />
              </div>
              <span className="kpi-label">Potential Anomalies</span>
            </div>
            <div className="kpi-value kpi-val-red">
              {summary.potential_anomalies.toLocaleString()}
            </div>
            <div className="kpi-subtext">Anomaly Score ≥ 0.120</div>
          </div>
          <KpiSparkline color="#ef4444" variant="red" />
        </div>

        <div className="kpi-card kpi-green">
          <div className="kpi-card-inner">
            <div className="kpi-header-row">
              <div className="kpi-icon-badge kpi-badge-green">
                <CheckCircle size={18} />
              </div>
              <span className="kpi-label">Normal Transactions</span>
            </div>
            <div className="kpi-value kpi-val-green">
              {summary.normal_transactions.toLocaleString()}
            </div>
            <div className="kpi-subtext">Standard distribution</div>
          </div>
          <KpiSparkline color="#10b981" variant="green" />
        </div>

        <div className="kpi-card kpi-purple">
          <div className="kpi-card-inner">
            <div className="kpi-header-row">
              <div className="kpi-icon-badge kpi-badge-purple">
                <Percent size={18} />
              </div>
              <span className="kpi-label">Anomaly Rate</span>
            </div>
            <div className="kpi-value kpi-val-purple">
              {((summary.anomaly_rate || 0) * 100).toFixed(2)}%
            </div>
            <div className="kpi-subtext">Anomaly proportion</div>
          </div>
          <KpiSparkline color="#a855f7" variant="purple" />
        </div>
      </div>

      {/* Visual Analytics Grid */}
      <div className="dashboard-grid-middle" style={{ marginBottom: "22px" }}>
        {/* Score Distribution Histogram */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title-group">
              <div className="dash-card-icon-badge">
                <BarChart2 size={18} />
              </div>
              <div>
                <h3 className="dash-card-title">Batch Anomaly Score Distribution</h3>
                <p className="dash-card-subtitle">
                  Histogram of isolation scores (Threshold 0.120 separator)
                </p>
              </div>
            </div>
          </div>
          <div style={{ height: "220px", position: "relative" }}>
            <SafeBarChart
              id="batch-score-dist-chart"
              data={scoreDistChartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    titleColor: tooltipTitle,
                    bodyColor: tooltipBody,
                    padding: 10,
                    boxPadding: 4,
                    cornerRadius: 8,
                  },
                },
                scales: {
                  x: { ticks: { color: textColor, font: { family: "Inter", size: 10 } }, grid: { display: false } },
                  y: { ticks: { color: textColor, font: { family: "Inter", size: 10 } }, grid: { color: gridColor } },
                },
              }}
            />
          </div>
        </div>

        {/* Ratio Doughnut */}
        <div className="dash-card">
          <div className="dash-card-header">
            <div className="dash-card-title-group">
              <div className="dash-card-icon-badge">
                <PieChart size={18} />
              </div>
              <div>
                <h3 className="dash-card-title">Session Classification Ratio</h3>
                <p className="dash-card-subtitle">Normal vs Potential Anomalies breakdown</p>
              </div>
            </div>
          </div>
          <div style={{ height: "220px", position: "relative" }}>
            <SafeDoughnutChart
              id="batch-ratio-doughnut"
              data={resultsDoughnutData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    position: "bottom",
                    labels: { color: textColor, font: { family: "Inter", size: 11 }, boxWidth: 12 },
                  },
                  tooltip: {
                    backgroundColor: tooltipBg,
                    borderColor: tooltipBorder,
                    borderWidth: 1,
                    titleColor: tooltipTitle,
                    bodyColor: tooltipBody,
                    padding: 10,
                    boxPadding: 4,
                    cornerRadius: 8,
                  },
                },
              }}
            />
          </div>
        </div>
      </div>

      {/* Results Table Card */}
      <div className="card">
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "12px",
            marginBottom: "18px",
          }}
        >
          <div>
            <h3 className="card-title">Inference Results Console</h3>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Showing {sorted.length} transactions based on current filter selection
            </p>
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
            <div style={{ position: "relative", width: "190px" }}>
              <input
                type="text"
                className="form-control"
                placeholder="Search ID / Amount"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                style={{ paddingLeft: "32px", fontSize: "0.82rem" }}
              />
              <Search size={14} style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            </div>

            <select
              className="form-control"
              value={filterResult}
              onChange={(e) => {
                setFilterResult(e.target.value);
                setCurrentPage(1);
              }}
              style={{ width: "auto", fontSize: "0.82rem" }}
            >
              <option value="all">All Outcomes</option>
              <option value="anomalies">Potential Anomalies Only</option>
              <option value="normal">Normal Transactions Only</option>
            </select>

            <button className="btn btn-secondary" onClick={handleDownloadCSV} style={{ fontSize: "0.82rem" }}>
              <Download size={14} />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th onClick={() => toggleSort("id")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Tx ID</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Time (s)</th>
                <th onClick={() => toggleSort("amount")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Amount ($)</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th onClick={() => toggleSort("anomaly_score")} style={{ cursor: "pointer" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                    <span>Anomaly Score</span>
                    <ArrowUpDown size={12} />
                  </div>
                </th>
                <th>Threshold</th>
                <th>Outcome Status</th>
                {summary.has_ground_truth && <th>Actual Class</th>}
              </tr>
            </thead>
            <tbody>
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={summary.has_ground_truth ? 7 : 6} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                    No matching transactions.
                  </td>
                </tr>
              ) : (
                pagedItems.map((item) => (
                  <tr key={item.id}>
                    <td><strong>#{item.id}</strong></td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{item.time.toFixed(0)}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>${item.amount.toFixed(2)}</td>
                    <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: item.is_anomaly ? "#ef4444" : (isDark ? "#10b981" : "#059669") }}>
                      {item.anomaly_score.toFixed(4)}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{item.threshold.toFixed(4)}</td>
                    <td>
                      {item.is_anomaly ? (
                        <span className="badge badge-anomaly" style={{ padding: "3px 8px", fontSize: "0.74rem" }}>
                          Potential Anomaly
                        </span>
                      ) : (
                        <span className="badge badge-normal" style={{ padding: "3px 8px", fontSize: "0.74rem" }}>
                          Normal
                        </span>
                      )}
                    </td>
                    {summary.has_ground_truth && (
                      <td>
                        {item.actual_class === 1 ? (
                          <span style={{ color: "#ef4444", fontWeight: 600 }}>1 (Actual Fraud)</span>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>0 (Normal)</span>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {sorted.length > pageSize && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--border-color)", fontSize: "0.82rem", color: "var(--text-secondary)" }}>
            <span>
              Page {currentPage} of {totalPages} ({sorted.length} total items)
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>
              <button
                className="btn btn-secondary btn-sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
