import React, { useEffect, useState } from "react";
import { Cpu, Info, GitBranch, Layers, ShieldCheck, AlertCircle } from "lucide-react";
import { getModelInfo } from "../api";

export default function ModelInfo() {
  const [info, setInfo] = useState(null);

  useEffect(() => {
    getModelInfo()
      .then((data) => setInfo(data))
      .catch((err) => console.error("Error fetching model info:", err));
  }, []);

  return (
    <div className="page-container">
      {/* Notice Banner */}
      <div className="info-banner" style={{ marginBottom: "22px" }}>
        <div className="info-banner-icon">
          <Info size={18} />
        </div>
        <div className="info-banner-content">
          <span className="info-banner-title">FinShield Anomaly Detection Architecture</span>
          <p className="info-banner-text">
            The FinShield Isolation Forest engine detects statistical and topological outliers by constructing
            binary decision trees on randomly partitioned feature subsets. The ground truth <code>Class</code> label
            is strictly withheld during training and is used exclusively for benchmark evaluation.
          </p>
        </div>
      </div>

      {/* Model Overview & Core Specifications */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "18px" }}>
          <div className="dash-card-icon-badge">
            <Cpu size={18} />
          </div>
          <div>
            <h2 className="card-title" style={{ marginBottom: "2px" }}>
              FinShield Engine & Model Architecture
            </h2>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Primary Isolation Forest parameters and scoring pipeline powering FinShield
            </p>
          </div>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Property</th>
                <th>Configuration Value</th>
                <th>Technical Context</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Algorithm</strong></td>
                <td><span className="badge badge-normal">FinShield Isolation Forest</span></td>
                <td>Ensemble of random partition trees (iTrees)</td>
              </tr>
              <tr>
                <td><strong>Learning Paradigm</strong></td>
                <td>Unsupervised Anomaly Detection</td>
                <td>Trained without access to true fraud or normal labels</td>
              </tr>
              <tr>
                <td><strong>Input Features</strong></td>
                <td>30 continuous dimensions</td>
                <td><code>Time</code>, <code>V1</code> through <code>V28</code> (PCA), <code>Amount</code> (USD)</td>
              </tr>
              <tr>
                <td><strong>Target Evaluation Label</strong></td>
                <td><code>Class</code> (0 = Normal, 1 = Actual Fraud)</td>
                <td>Class label is strictly withheld during inference</td>
              </tr>
              <tr>
                <td><strong>Calibrated Decision Threshold</strong></td>
                <td><code style={{ color: "var(--accent-blue)", fontWeight: 700 }}>{info?.detection_threshold?.toFixed(4) || "0.1200"}</code></td>
                <td>Loaded from <code>threshold.pkl</code>; score ≥ threshold flags potential anomaly</td>
              </tr>
              <tr>
                <td><strong>Score Formulation</strong></td>
                <td><code>anomaly_score = -decision_function(X_scaled)</code></td>
                <td>Higher scores correspond to instances residing at shorter average path lengths</td>
              </tr>
              <tr>
                <td><strong>Feature Scaling</strong></td>
                <td>StandardScaler (Z-score normalization)</td>
                <td>Loaded from <code>scaler.pkl</code>; ensures balanced tree splits across dimensions</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Hyperparameters Safely Read from Trained Model */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <div className="dash-card-icon-badge">
            <GitBranch size={18} />
          </div>
          <div>
            <h3 className="card-title" style={{ marginBottom: "2px" }}>Trained Model Hyperparameters</h3>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Exact attributes extracted directly from <code>isolation_forest_model.pkl</code>
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
          <div style={{ padding: "16px", background: "var(--bg-surface-alt)", border: "1px solid var(--border-color)", borderRadius: "10px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Estimators (Trees)</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "2px" }}>
              {info?.hyperparameters?.n_estimators ?? 100}
            </div>
            <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
              Total isolation trees built in ensemble
            </span>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-surface-alt)", border: "1px solid var(--border-color)", borderRadius: "10px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Max Samples</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "2px" }}>
              {String(info?.hyperparameters?.max_samples ?? "auto")}
            </div>
            <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
              Subsample partition size per tree
            </span>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-surface-alt)", border: "1px solid var(--border-color)", borderRadius: "10px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Contamination</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-purple)", marginTop: "2px" }}>
              {String(info?.hyperparameters?.contamination ?? "auto")}
            </div>
            <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
              Calibrated dataset anomaly rate (0.413%)
            </span>
          </div>

          <div style={{ padding: "16px", background: "var(--bg-surface-alt)", border: "1px solid var(--border-color)", borderRadius: "10px" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Random Seed</span>
            <div style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "2px" }}>
              {String(info?.hyperparameters?.random_state ?? 42)}
            </div>
            <span style={{ fontSize: "0.74rem", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
              Deterministic partition reproducibility
            </span>
          </div>
        </div>
      </div>

      {/* Experimental Baseline Evaluation Metrics */}
      <div className="card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div className="dash-card-icon-badge">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 className="card-title" style={{ marginBottom: "2px" }}>Experimental Baseline Evaluation (Benchmark Metrics)</h3>
              <p className="card-subtitle" style={{ marginBottom: 0 }}>
                Performance metrics obtained during model development against test partition
              </p>
            </div>
          </div>
          <div className="badge badge-normal" style={{ background: "rgba(37, 99, 235, 0.12)", borderColor: "rgba(59, 130, 246, 0.35)", color: "var(--accent-blue)" }}>
            <span>Test Setup Results</span>
          </div>
        </div>

        {/* Calibrated Operational Threshold (0.120) Analysis */}
        <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "12px" }}>
          Calibrated Operational Threshold (0.120) Performance:
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px", marginBottom: "20px" }}>
          <div style={{ padding: "14px", background: "var(--bg-surface-alt)", borderRadius: "8px", borderLeft: "3px solid var(--accent-blue)", borderTop: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Operating Threshold</span>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)", marginTop: "2px" }}>
              0.1200
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Calibrated cutoff</span>
          </div>

          <div style={{ padding: "14px", background: "var(--bg-surface-alt)", borderRadius: "8px", borderLeft: "3px solid var(--accent-blue)", borderTop: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Calibrated Precision</span>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-blue)", marginTop: "2px" }}>
              15.28%
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>4.6x higher precision</span>
          </div>

          <div style={{ padding: "14px", background: "var(--bg-surface-alt)", borderRadius: "8px", borderLeft: "3px solid var(--accent-blue)", borderTop: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Recall at Cutoff</span>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-green)", marginTop: "2px" }}>
              36.84%
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>Fraud cases detected</span>
          </div>

          <div style={{ padding: "14px", background: "var(--bg-surface-alt)", borderRadius: "8px", borderLeft: "3px solid var(--accent-blue)", borderTop: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Optimized F1 Score</span>
            <div style={{ fontSize: "1.35rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-purple)", marginTop: "2px" }}>
              0.2160
            </div>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>3.4x higher F1 score</span>
          </div>
        </div>

        {/* Baseline Metrics Grid */}
        <h4 style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--text-main)", marginBottom: "12px" }}>
          Uncalibrated Baseline Metrics:
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "12px", marginBottom: "14px" }}>
          <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>ROC-AUC</span>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-blue)" }}>
              0.9300
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Area under ROC</span>
          </div>

          <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Recall</span>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--accent-green)" }}>
              78.95%
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Broad coverage</span>
          </div>

          <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Average Precision</span>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              0.1060
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>PR Area</span>
          </div>

          <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Baseline Precision</span>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              3.28%
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Unfiltered precision</span>
          </div>

          <div style={{ padding: "12px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Baseline F1</span>
            <div style={{ fontSize: "1.15rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
              0.0630
            </div>
            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Harmonic mean</span>
          </div>
        </div>

        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic" }}>
          * Experimental evaluation results from the test partition, reflecting trade-offs between precision and recall in unsupervised fraud discovery.
        </p>
      </div>

      {/* Conceptual Explanation & Anonymization Note */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "14px" }}>
          <div className="dash-card-icon-badge">
            <Layers size={18} />
          </div>
          <div>
            <h3 className="card-title" style={{ marginBottom: "2px" }}>
              How Isolation Forest Operates on Financial Topology
            </h3>
            <p className="card-subtitle" style={{ marginBottom: 0 }}>
              Principles of tree partitioning and anomalous path length isolation
            </p>
          </div>
        </div>

        <div style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.6, display: "flex", flexDirection: "column", gap: "12px" }}>
          <p>
            Unlike traditional distance-based outlier detectors (such as LOF or k-Nearest Neighbors) that suffer from the
            <em> curse of dimensionality</em> in 30-dimensional feature spaces, <strong>Isolation Forest</strong> takes advantage of two quantitative properties:
            anomalous instances are few in number (under 0.2%) and have attribute values fundamentally different from normal transactions.
          </p>
          <p>
            During recursive binary space partitioning, an anomaly requires significantly fewer random cuts to be separated from the rest of the dataset.
            Consequently, instances with short average path lengths across the 100 isolation trees yield higher anomaly scores.
          </p>
          <div style={{ padding: "14px 18px", background: "var(--bg-surface-alt)", borderRadius: "8px", borderLeft: "3px solid #f59e0b", borderTop: "1px solid var(--border-color)", borderRight: "1px solid var(--border-color)", borderBottom: "1px solid var(--border-color)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
              <AlertCircle size={16} color="#f59e0b" />
              <strong style={{ color: "var(--text-main)", fontSize: "0.85rem" }}>
                Ground-Truth Fraud vs. Model-Detected Anomaly:
              </strong>
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--text-secondary)", lineHeight: 1.45 }}>
              In an unsupervised production setting, a model flags <strong>Potential Anomalies</strong> based on mathematical isolation depth.
              Some legitimate transactions (e.g. unusually large international transfers or rapid transaction bursts) may present anomalous features without being malicious.
              Human review and multi-factor verification remain essential for final transaction resolution.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
