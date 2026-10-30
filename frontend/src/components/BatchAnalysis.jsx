import React, { useState, useRef } from "react";
import {
  UploadCloud,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle,
  Download,
  Search,
  ArrowUpDown,
  FileCheck,
  Percent,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
} from "lucide-react";
import KpiSparkline from "./KpiSparkline";
import { predictBatch } from "../api";

export default function BatchAnalysis({ onSaveBatchResults }) {
  const [file, setFile] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [batchResponse, setBatchResponse] = useState(null);

  // Table filters & pagination
  const [filterResult, setFilterResult] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("id");
  const [sortOrder, setSortOrder] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;

  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (selected) {
      if (!selected.name.toLowerCase().endsWith(".csv")) {
        setError("Invalid file type: Please upload a CSV file.");
        setFile(null);
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const dropped = e.dataTransfer.files[0];
      if (!dropped.name.toLowerCase().endsWith(".csv")) {
        setError("Invalid file type: Please upload a CSV file.");
        return;
      }
      setFile(dropped);
      setError(null);
    }
  };

  const loadSampleFile = async () => {
    try {
      setError(null);
      const res = await fetch("/sample_batch_test.csv");
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample_batch_test.csv", { type: "text/csv" });
      setFile(sampleFile);
    } catch {
      setError("Could not load sample file.");
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      setError("Please select a CSV file first.");
      return;
    }

    try {
      setAnalyzing(true);
      setError(null);
      const res = await predictBatch(file);
      setBatchResponse(res);
      setCurrentPage(1);

      if (onSaveBatchResults) {
        onSaveBatchResults(res);
      }
    } catch (err) {
      setError(err.message || "Batch analysis failed");
      setBatchResponse(null);
    } finally {
      setAnalyzing(false);
    }
  };

  // Filtered and Sorted items
  const filtered = (batchResponse?.results || []).filter((item) => {
    if (filterResult === "anomalies" && !item.is_anomaly) return false;
    if (filterResult === "normal" && item.is_anomaly) return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const idMatch = String(item.id).includes(q);
      const amtMatch = String(item.amount).includes(q);
      if (!idMatch && !amtMatch) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortBy];
    let bVal = b[sortBy];

    if (aVal === undefined || aVal === null) return 1;
    if (bVal === undefined || bVal === null) return -1;

    if (sortOrder === "asc") {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
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

  const handleDownloadCSV = () => {
    if (!batchResponse || !batchResponse.results.length) return;
    const hasClass = batchResponse.summary?.has_ground_truth;
    const headers = [
      "Transaction ID",
      "Time",
      "Amount",
      "Anomaly Score",
      "Detection Threshold",
      "Prediction",
    ];
    if (hasClass) headers.push("Actual Ground Truth Class");

    const rows = batchResponse.results.map((r) => {
      const row = [r.id, r.time, r.amount, r.anomaly_score, r.threshold, r.prediction];
      if (hasClass) row.push(r.actual_class !== null ? r.actual_class : "");
      return row.join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `finshield_batch_results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="page-container">
      {/* Informational Banner */}
      <div className="info-banner">
        <div className="info-banner-icon">
          <Info size={18} />
        </div>
        <div className="info-banner-content">
          <span className="info-banner-title">FinShield Vectorized Batch Processing</span>
          <p className="info-banner-text">
            Upload any CSV containing the 30 continuous features: <code>Time</code>, <code>V1</code> through{" "}
            <code>V28</code>, and <code>Amount</code>. Ground-truth column <code>Class</code> is strictly
            optional; if present, it is used exclusively to evaluate validation metrics (Precision, Recall, F1).
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-card alert-danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Upload Box */}
      <div className="card">
        <h2 className="card-title">Upload Transaction Batch (CSV)</h2>
        <p className="card-subtitle">
          Select or drag and drop your transaction file to execute high-performance vectorized inference
        </p>

        <div
          className="dropzone"
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <div className="dropzone-icon">
            <UploadCloud size={24} />
          </div>

          <div>
            <p style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--text-main)" }}>
              {file ? file.name : "Click to browse or drag and drop CSV file here"}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginTop: "4px" }}>
              {file
                ? `Size: ${(file.size / 1024).toFixed(1)} KB — Ready to analyze`
                : "Required columns: Time, V1-V28, Amount (Class optional for ground truth)"}
            </p>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv"
            style={{ display: "none" }}
          />
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "18px",
            flexWrap: "wrap",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button type="button" className="btn btn-secondary" onClick={loadSampleFile}>
              <FileCheck size={14} />
              <span>Load 10-Row Sample CSV</span>
            </button>
            <a
              href="/sample_batch_test.csv"
              download="sample_batch_test.csv"
              className="btn btn-secondary"
              style={{ fontSize: "0.8rem" }}
            >
              <Download size={13} />
              <span>Download Template</span>
            </a>
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: "10px 24px" }}
            onClick={handleAnalyze}
            disabled={!file || analyzing}
          >
            <Layers size={16} />
            <span>{analyzing ? "FinShield Vector Scoring..." : "Analyze Batch CSV"}</span>
          </button>
        </div>
      </div>

      {/* Analysis Results Display */}
      {batchResponse && (
        <>
          {/* Summary KPI Cards */}
          <div className="kpi-grid">
            <div className="kpi-card kpi-blue">
              <div className="kpi-card-inner">
                <div className="kpi-header-row">
                  <div className="kpi-icon-badge kpi-badge-blue">
                    <FileSpreadsheet size={18} />
                  </div>
                  <span className="kpi-label">Transactions Analyzed</span>
                </div>
                <div className="kpi-value">
                  {batchResponse.summary.transactions_analyzed.toLocaleString()}
                </div>
                <div className="kpi-subtext">Rows processed in batch</div>
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
                  {batchResponse.summary.potential_anomalies.toLocaleString()}
                </div>
                <div className="kpi-subtext">Model score ≥ 0.120</div>
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
                  {batchResponse.summary.normal_transactions.toLocaleString()}
                </div>
                <div className="kpi-subtext">Within expected topology</div>
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
                  {((batchResponse.summary.anomaly_rate || 0) * 100).toFixed(2)}%
                </div>
                <div className="kpi-subtext">Batch anomaly proportion</div>
              </div>
              <KpiSparkline color="#a855f7" variant="purple" />
            </div>
          </div>

          {/* Ground Truth Evaluation Card (if Class present) */}
          {batchResponse.summary.has_ground_truth && batchResponse.summary.evaluation_metrics && (
            <div className="card" style={{ borderLeft: "4px solid #f97316" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                <div>
                  <h3 style={{ fontSize: "0.98rem", fontWeight: 700, color: "var(--text-main)" }}>
                    Ground-Truth Benchmark Evaluation
                  </h3>
                  <p style={{ fontSize: "0.8rem", color: "var(--text-secondary)", marginTop: "2px" }}>
                    Comparison between actual dataset labels (Class=1) and model-detected anomalies (Score ≥ 0.120)
                  </p>
                </div>
                <div className="badge badge-normal" style={{ background: "rgba(249, 115, 22, 0.15)", borderColor: "rgba(249, 115, 22, 0.4)", color: "#ea580c" }}>
                  <span>Ground Truth Validated</span>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
                <div style={{ padding: "14px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Precision</span>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
                    {((batchResponse.summary.evaluation_metrics.precision || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ padding: "14px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Recall</span>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
                    {((batchResponse.summary.evaluation_metrics.recall || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ padding: "14px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>F1 Score</span>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--primary-text)", marginTop: "2px" }}>
                    {batchResponse.summary.evaluation_metrics.f1_score.toFixed(4)}
                  </div>
                </div>
                <div style={{ padding: "14px", background: "var(--bg-surface-alt)", borderRadius: "8px", border: "1px solid var(--border-color)" }}>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Actual Fraud Cases</span>
                  <div style={{ fontSize: "1.3rem", fontWeight: 700, color: "#ea580c", marginTop: "2px" }}>
                    {batchResponse.summary.evaluation_metrics.actual_fraud_count} cases
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results Table Section */}
          <div className="card">
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div>
                <h3 className="card-title">Transaction Classification Table</h3>
                <p className="card-subtitle" style={{ marginBottom: 0 }}>
                  Showing {sorted.length} records matching current criteria
                </p>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                {/* Search Filter */}
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

                {/* Status Filter */}
                <select
                  className="form-control"
                  value={filterResult}
                  onChange={(e) => {
                    setFilterResult(e.target.value);
                    setCurrentPage(1);
                  }}
                  style={{ width: "auto", fontSize: "0.82rem" }}
                >
                  <option value="all">All Results</option>
                  <option value="anomalies">Potential Anomalies Only</option>
                  <option value="normal">Normal Transactions Only</option>
                </select>

                {/* CSV Download */}
                <button className="btn btn-secondary" onClick={handleDownloadCSV} style={{ fontSize: "0.82rem" }}>
                  <Download size={14} />
                  <span>Download CSV</span>
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th onClick={() => toggleSort("id")} style={{ cursor: "pointer" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                        <span>Transaction</span>
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
                    <th>Model Prediction</th>
                    {batchResponse.summary.has_ground_truth && <th>Actual Class</th>}
                  </tr>
                </thead>
                <tbody>
                  {pagedItems.length === 0 ? (
                    <tr>
                      <td colSpan={batchResponse.summary.has_ground_truth ? 7 : 6} style={{ textAlign: "center", padding: "30px", color: "var(--text-muted)" }}>
                        No transactions found matching criteria.
                      </td>
                    </tr>
                  ) : (
                    pagedItems.map((item) => (
                      <tr key={item.id}>
                        <td><strong>#{item.id}</strong></td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>{item.time.toFixed(0)}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>${item.amount.toFixed(2)}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: item.is_anomaly ? "var(--anomaly-val)" : "var(--normal-val)" }}>
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
                        {batchResponse.summary.has_ground_truth && (
                          <td>
                            {item.actual_class === 1 ? (
                              <span style={{ color: "var(--anomaly-val)", fontWeight: 600 }}>1 (Actual Fraud)</span>
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

            {/* Pagination Controls */}
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
        </>
      )}
    </div>
  );
}
