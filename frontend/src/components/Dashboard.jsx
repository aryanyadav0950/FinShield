import React, { useEffect, useState } from "react";
import {
  Database,
  AlertTriangle,
  CheckCircle2,
  Percent,
  Info,
  X,
  RefreshCw,
  BarChart2,
  Activity,
  BarChart3,
} from "lucide-react";
import { SafeBarChart, SafeDoughnutChart } from "./SafeChart";
import KpiSparkline from "./KpiSparkline";
import BoxPlotChart from "./BoxPlotChart";
import { getDatasetSummary } from "../api";
import { useTheme } from "../context/ThemeContext";

export default function Dashboard() {
  const { resolvedTheme } = useTheme();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showBanner, setShowBanner] = useState(true);

  const fetchSummary = async (refresh = false) => {
    try {
      setLoading(true);
      setError(null);
      const res = await getDatasetSummary(refresh);
      setData(res);
    } catch (err) {
      setError(err.message || "Failed to load dataset summary");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await getDatasetSummary(false);
        if (isMounted) setData(res);
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load dataset summary");
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    load();
    return () => {
      isMounted = false;
    };
  }, []);

  const isDark = resolvedTheme === "dark";
  const textColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(255, 255, 255, 0.07)" : "#f1f5f9";

  // Data calculations & fallbacks matching real dataset
  const totalTx = data?.total_transactions || 284807;
  const potentialAnomalies = data?.potential_anomalies || 1176;
  const normalTx = data?.normal_transactions || 283631;
  const anomalyRate = data?.anomaly_rate ?? 0.00413;
  const actualFraud = data?.actual_fraud_count || 492;

  const normalPct = ((normalTx / totalTx) * 100).toFixed(3);
  const anomalyPct = ((potentialAnomalies / totalTx) * 100).toFixed(3);

  // Chart 1: Amount Distribution (Normal vs Actual Fraud)
  const amountLabels = data?.amount_distribution?.labels || [
    "0-5", "5-20", "20-50", "50-100", "100-200", "200-500", "500-1K", "1K+",
  ];
  const normalCounts = data?.amount_distribution?.normal_counts || {
    "0-5": 68810, "5-20": 70049, "20-50": 51880, "50-100": 37198,
    "100-200": 27626, "200-500": 19645, "500-1K": 6176, "1K+": 2931,
  };
  const fraudCounts = data?.amount_distribution?.actual_fraud_counts || {
    "0-5": 222, "5-20": 49, "20-50": 35, "50-100": 56,
    "100-200": 45, "200-500": 50, "500-1K": 26, "1K+": 9,
  };

  const amountDistributionData = {
    labels: amountLabels,
    datasets: [
      {
        label: "Normal Transactions (Class=0)",
        data: amountLabels.map((bin) => normalCounts[bin] || 0),
        backgroundColor: "#2563eb",
        borderColor: "#3b82f6",
        borderWidth: 1,
        borderRadius: 3,
        barPercentage: 0.7,
        categoryPercentage: 0.75,
      },
      {
        label: "Actual Fraud (Class=1)",
        data: amountLabels.map((bin) => fraudCounts[bin] || 0),
        backgroundColor: "#ef4444",
        borderColor: "#f87171",
        borderWidth: 1,
        borderRadius: 3,
        barPercentage: 0.7,
        categoryPercentage: 0.75,
      },
    ],
  };

  const amountChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Custom clean header legend used instead
      },
      tooltip: {
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        titleColor: isDark ? "#f8fafc" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#334155",
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#cbd5e1",
        borderWidth: 1,
        padding: 10,
        boxPadding: 4,
        callbacks: {
          label: (context) => ` ${context.dataset.label}: ${context.raw.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { color: textColor, font: { family: "Inter", size: 10 } },
        title: {
          display: true,
          text: "Transaction Amount Range ($)",
          color: textColor,
          font: { family: "Inter", size: 11 },
          padding: { top: 6 },
        },
      },
      y: {
        type: "logarithmic",
        min: 1,
        max: 100000,
        grid: { color: gridColor },
        ticks: {
          color: textColor,
          font: { family: "Inter", size: 10 },
          callback: (value) => {
            if (value === 1) return "1";
            if (value === 10) return "10";
            if (value === 100) return "100";
            if (value === 1000) return "1K";
            if (value === 10000) return "10K";
            if (value === 50000) return "50K";
            if (value === 100000) return "100K";
            return null;
          },
        },
        title: {
          display: true,
          text: "Count (Log Scale)",
          color: textColor,
          font: { family: "Inter", size: 11 },
        },
      },
    },
  };

  // Chart 2: Transaction Results Donut (Normal vs Potential Anomaly)
  const resultsDonutData = {
    labels: ["Normal Transactions", "Potential Anomalies"],
    datasets: [
      {
        data: [normalTx, potentialAnomalies],
        backgroundColor: ["#10b981", "#ef4444"],
        borderColor: isDark ? ["#0e1629", "#0e1629"] : ["#ffffff", "#ffffff"],
        borderWidth: 2,
        cutout: "76%",
      },
    ],
  };

  const resultsDonutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    rotation: -88,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: isDark ? "#0f172a" : "#ffffff",
        titleColor: isDark ? "#f8fafc" : "#0f172a",
        bodyColor: isDark ? "#cbd5e1" : "#334155",
        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#cbd5e1",
        borderWidth: 1,
        padding: 10,
        callbacks: {
          label: (context) => {
            const val = context.raw || 0;
            const pct = ((val / totalTx) * 100).toFixed(3);
            return ` ${context.label}: ${val.toLocaleString()} (${pct}%)`;
          },
        },
      },
    },
  };

  return (
    <div className="dashboard-wrapper">
      {/* Information Banner */}
      {showBanner && (
        <div className="info-banner">
          <div className="info-banner-icon">
            <Info size={18} />
          </div>
          <div className="info-banner-content">
            <span className="info-banner-title">FinShield Anomaly Detection Intelligence</span>
            <p className="info-banner-text">
              FinShield uses an Isolation Forest model to detect potential fraudulent transactions
              based on feature topology. Predictions are categorized as{" "}
              <em>Potential Anomalies</em> and should be analyzed further, not treated as confirmed fraud.
            </p>
          </div>
          <button
            className="info-banner-close"
            onClick={() => setShowBanner(false)}
            aria-label="Dismiss banner"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {error && (
        <div className="alert-card alert-danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchSummary(true)}>
            Retry
          </button>
        </div>
      )}

      {/* 4 KPI Cards in 1 Row */}
      <div className="kpi-grid">
        {/* 1. Transactions Analyzed */}
        <div className="kpi-card kpi-blue">
          <div className="kpi-card-inner">
            <div className="kpi-header-row">
              <div className="kpi-icon-badge kpi-badge-blue">
                <Database size={18} />
              </div>
              <span className="kpi-label">Transactions Analyzed</span>
            </div>
            <div className="kpi-value">
              {loading ? "..." : totalTx.toLocaleString()}
            </div>
            <div className="kpi-subtext">Total verified transactions in dataset</div>
          </div>
          <KpiSparkline color="#3b82f6" variant="blue" />
        </div>

        {/* 2. Potential Anomalies */}
        <div className="kpi-card kpi-red">
          <div className="kpi-card-inner">
            <div className="kpi-header-row">
              <div className="kpi-icon-badge kpi-badge-red">
                <AlertTriangle size={18} />
              </div>
              <span className="kpi-label">Potential Anomalies</span>
            </div>
            <div className="kpi-value kpi-val-red">
              {loading ? "..." : potentialAnomalies.toLocaleString()}
            </div>
            <div className="kpi-subtext">Model score ≥ 0.120 threshold</div>
          </div>
          <KpiSparkline color="#ef4444" variant="red" />
        </div>

        {/* 3. Normal Transactions */}
        <div className="kpi-card kpi-green">
          <div className="kpi-card-inner">
            <div className="kpi-header-row">
              <div className="kpi-icon-badge kpi-badge-green">
                <CheckCircle2 size={18} />
              </div>
              <span className="kpi-label">Normal Transactions</span>
            </div>
            <div className="kpi-value kpi-val-green">
              {loading ? "..." : normalTx.toLocaleString()}
            </div>
            <div className="kpi-subtext">Within expected data distribution</div>
          </div>
          <KpiSparkline color="#10b981" variant="green" />
        </div>

        {/* 4. Anomaly Rate */}
        <div className="kpi-card kpi-purple">
          <div className="kpi-card-inner">
            <div className="kpi-header-row">
              <div className="kpi-icon-badge kpi-badge-purple">
                <Percent size={18} />
              </div>
              <span className="kpi-label">Anomaly Rate</span>
            </div>
            <div className="kpi-value kpi-val-purple">
              {loading ? "..." : `${(anomalyRate * 100).toFixed(3)}%`}
            </div>
            <div className="kpi-subtext">Ratio of anomalies to total records</div>
          </div>
          <KpiSparkline color="#a855f7" variant="purple" />
        </div>
      </div>

      {/* Middle Row: Dataset Characteristics (Left) + Transaction Results Overview (Right) */}
      <div className="dashboard-grid-middle">
        {/* Left Card: Dataset Characteristics & Summary Statistics */}
        <div className="dash-card dataset-summary-card">
          <div className="dash-card-header">
            <div className="dash-card-title-group">
              <div className="dash-card-icon-badge">
                <BarChart2 size={18} />
              </div>
              <div>
                <h2 className="dash-card-title">Dataset Characteristics & Summary Statistics</h2>
                <p className="dash-card-subtitle">Key information about the financial transaction dataset evaluated by FinShield</p>
              </div>
            </div>
            <button
              className="btn btn-refresh"
              onClick={() => fetchSummary(true)}
              disabled={loading}
              title="Recalculate FinShield summary from dataset"
            >
              <RefreshCw size={13} className={loading ? "spin" : ""} />
              <span>Refresh Stats</span>
            </button>
          </div>

          <div className="summary-table-container">
            <table className="summary-table">
              <thead>
                <tr>
                  <th>Attribute</th>
                  <th>Value</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="attr-name">Total Records</td>
                  <td className="attr-value">{totalTx.toLocaleString()} rows</td>
                  <td className="attr-desc">Total transactions analyzed across 48 hours</td>
                </tr>
                <tr>
                  <td className="attr-name">Feature Dimensionality</td>
                  <td className="attr-value">30 features</td>
                  <td className="attr-desc">Time (seconds), V1–V28 (PCA), Amount (USD)</td>
                </tr>
                <tr>
                  <td className="attr-name">Actual Fraud Prevalence</td>
                  <td className="attr-value">{actualFraud} cases (0.173%)</td>
                  <td className="attr-desc">Ground-truth Class=1 instances</td>
                </tr>
                <tr>
                  <td className="attr-name">Model Detected Anomalies</td>
                  <td className="attr-value">{potentialAnomalies.toLocaleString()} cases ({anomalyPct}%)</td>
                  <td className="attr-desc">Isolation Forest score ≥ 0.120</td>
                </tr>
                <tr>
                  <td className="attr-name">Amount (Mean / Median)</td>
                  <td className="attr-value">
                    ${data?.amount_stats?.mean != null ? data.amount_stats.mean.toFixed(2) : "88.35"} / $
                    {data?.amount_stats?.median != null ? Math.round(data.amount_stats.median) : "22"}
                  </td>
                  <td className="attr-desc">
                    Standard deviation: ${data?.amount_stats?.std != null ? data.amount_stats.std.toFixed(2) : "250.12"}
                  </td>
                </tr>
                <tr>
                  <td className="attr-name">Amount Range</td>
                  <td className="attr-value">
                    ${data?.amount_stats?.min != null ? data.amount_stats.min.toFixed(2) : "0.00"} – $
                    {data?.amount_stats?.max != null ? data.amount_stats.max.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "25,691.16"}
                  </td>
                  <td className="attr-desc">
                    IQR: ${data?.amount_stats?.q25 != null ? data.amount_stats.q25.toFixed(1) : "5.6"} (25th) to $
                    {data?.amount_stats?.q75 != null ? data.amount_stats.q75.toFixed(2) : "77.16"} (75th)
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Card: Transaction Results Overview */}
        <div className="dash-card results-overview-card">
          <div className="dash-card-header">
            <div className="dash-card-title-group">
              <div className="dash-card-icon-badge">
                <Activity size={18} />
              </div>
              <div>
                <h2 className="dash-card-title">Transaction Results Overview</h2>
                <p className="dash-card-subtitle">Model prediction distribution on the dataset</p>
              </div>
            </div>
          </div>

          <div className="results-overview-body">
            {/* Donut Chart with Centered Total */}
            <div className="donut-chart-wrapper">
              <div className="donut-canvas-container">
                <SafeDoughnutChart
                  id="results-donut-chart"
                  data={resultsDonutData}
                  options={resultsDonutOptions}
                />
                {/* Center text cutout */}
                <div className="donut-center-label">
                  <span className="donut-center-number">{totalTx.toLocaleString()}</span>
                  <span className="donut-center-sub">Total Transactions</span>
                </div>
              </div>
            </div>

            {/* Results Legend & Counts */}
            <div className="results-legend-list">
              <div className="results-legend-item">
                <div className="legend-indicator-row">
                  <span className="legend-dot dot-green"></span>
                  <span className="legend-name">Normal Transactions</span>
                </div>
                <div className="legend-value-bold">
                  {normalTx.toLocaleString()} ({normalPct}%)
                </div>
              </div>

              <div className="results-legend-item">
                <div className="legend-indicator-row">
                  <span className="legend-dot dot-red"></span>
                  <span className="legend-name">Potential Anomalies</span>
                </div>
                <div className="legend-value-bold">
                  {potentialAnomalies.toLocaleString()} ({anomalyPct}%)
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Row: Amount Distribution Bar Chart (Left) + Box Plot (Right) */}
      <div className="dashboard-grid-bottom">
        {/* Left: Transaction Amount Distribution */}
        <div className="dash-card amount-dist-card">
          <div className="dash-card-header">
            <div className="dash-card-title-group">
              <div className="dash-card-icon-badge">
                <BarChart3 size={18} />
              </div>
              <div>
                <h2 className="dash-card-title">Transaction Amount Distribution</h2>
                <p className="dash-card-subtitle">
                  Distribution across amount bins: Normal vs Fraudulent Transactions
                </p>
              </div>
            </div>

            {/* Header Legend */}
            <div className="header-chart-legend">
              <div className="chart-legend-chip">
                <span className="legend-dot dot-blue"></span>
                <span>Normal Transactions (Class=0)</span>
              </div>
              <div className="chart-legend-chip">
                <span className="legend-dot dot-red"></span>
                <span>Actual Fraud (Class=1)</span>
              </div>
            </div>
          </div>

          <div className="dash-chart-body" style={{ height: "240px" }}>
            <SafeBarChart
              id="amount-bar-chart"
              data={amountDistributionData}
              options={amountChartOptions}
            />
          </div>
        </div>

        {/* Right: Amount Distribution (Box Plot) */}
        <div className="dash-card boxplot-card">
          <div className="dash-card-header">
            <div className="dash-card-title-group">
              <div className="dash-card-icon-badge">
                <Activity size={18} />
              </div>
              <div>
                <h2 className="dash-card-title">Amount Distribution (Box Plot)</h2>
                <p className="dash-card-subtitle">Transaction amount comparison (log scale)</p>
              </div>
            </div>
          </div>

          <div className="dash-chart-body" style={{ height: "240px" }}>
            <BoxPlotChart boxplotData={data?.boxplot_stats} />
          </div>
        </div>
      </div>
    </div>
  );
}
