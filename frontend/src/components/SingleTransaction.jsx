import React, { useState, useEffect } from "react";
import {
  Search,
  CheckCircle,
  AlertTriangle,
  Info,
  Shield,
  Sliders,
} from "lucide-react";
import { predictSingle, getTransactions, getTransaction } from "../api";

const FEATURE_NAMES = ["Time", ...Array.from({ length: 28 }, (_, index) => `V${index + 1}`), "Amount"];
const EMPTY_FEATURES = Object.fromEntries(FEATURE_NAMES.map((name) => [name, ""]));

export default function SingleTransaction({ onSaveResult }) {
  const [selectedId, setSelectedId] = useState(0);
  const [searchInput, setSearchInput] = useState("0");
  const [txDetails, setTxDetails] = useState(null);
  const [loadingTx, setLoadingTx] = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [datasetList, setDatasetList] = useState([]);
  const [datasetAvailable, setDatasetAvailable] = useState(false);
  const [manualFeatures, setManualFeatures] = useState(EMPTY_FEATURES);

  // Curated quick samples from actual dataset for demonstration
  const quickSamples = [
    { id: 0, label: "Tx #0 ($149.62 - Normal)", type: "normal" },
    { id: 1, label: "Tx #1 ($2.69 - Normal)", type: "normal" },
    { id: 4, label: "Tx #4 ($123.50 - Normal)", type: "normal" },
    { id: 164, label: "Tx #164 ($3,828.04 - Potential Anomaly)", type: "anomaly" },
    { id: 1388, label: "Tx #1388 ($2,452.03 - Potential Anomaly)", type: "anomaly" },
    { id: 1632, label: "Tx #1632 ($7,712.43 - Potential Anomaly)", type: "anomaly" },
    { id: 2178, label: "Tx #2178 ($3,669.00 - Potential Anomaly)", type: "anomaly" },
  ];

  // Fetch initial transaction details
  const fetchTx = async (id) => {
    try {
      setLoadingTx(true);
      setError(null);
      const data = await getTransaction(id);
      setTxDetails(data);
      setSelectedId(id);
      setSearchInput(String(id));
    } catch (err) {
      setError(err.message || "Failed to load transaction");
      setTxDetails(null);
    } finally {
      setLoadingTx(false);
    }
  };

  // Fetch a sample page of transactions for the dropdown
  useEffect(() => {
    let isMounted = true;
    getTransactions(1, 25)
      .then((res) => {
        if (isMounted) {
          setDatasetList(res.items || []);
          setDatasetAvailable(true);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setDatasetAvailable(false);
          setError(err.message || "Historical dataset is unavailable. Enter features manually.");
        }
      });

    const loadInitial = async () => {
      try {
        setLoadingTx(true);
        const data = await getTransaction(0);
        if (isMounted) {
          setTxDetails(data);
          setSelectedId(0);
          setSearchInput("0");
        }
      } catch (err) {
        if (isMounted) setError(err.message || "Failed to load transaction");
      } finally {
        if (isMounted) setLoadingTx(false);
      }
    };
    loadInitial();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleManualFeatureChange = (name, value) => {
    setManualFeatures((current) => ({ ...current, [name]: value }));
    setResult(null);
  };

  const getManualFeaturePayload = () => {
    const missing = FEATURE_NAMES.find((name) => manualFeatures[name].trim() === "");
    if (missing) {
      setError(`Enter a numeric value for ${missing}.`);
      return null;
    }

    const values = Object.fromEntries(
      FEATURE_NAMES.map((name) => [name, Number(manualFeatures[name])])
    );
    const invalid = FEATURE_NAMES.find((name) => !Number.isFinite(values[name]));
    if (invalid) {
      setError(`${invalid} must be a valid finite number.`);
      return null;
    }
    return values;
  };

  const handleSelectChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
      fetchTx(val);
      setResult(null);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const val = parseInt(searchInput.trim(), 10);
    if (isNaN(val) || val < 0 || val > 284806) {
      setError("Please enter a valid Transaction ID between 0 and 284,806.");
      return;
    }
    fetchTx(val);
    setResult(null);
  };

  const handlePredict = async () => {
    const features = datasetAvailable ? null : getManualFeaturePayload();
    if (!datasetAvailable && !features) return;
    try {
      setPredicting(true);
      setError(null);
      const res = await predictSingle(datasetAvailable ? selectedId : null, features);
      setResult(res);

      if (onSaveResult) {
        onSaveResult({
          id: res.transaction_id,
          time: res.details?.Time || 0,
          amount: res.details?.Amount || 0,
          anomaly_score: res.anomaly_score,
          threshold: res.threshold,
          prediction: res.prediction,
          is_anomaly: res.is_anomaly,
          actual_class: txDetails?.Class,
        });
      }
    } catch (err) {
      setError(err.message || "Prediction request failed");
    } finally {
      setPredicting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Notice Banner */}
      <div className="info-banner" style={{ marginBottom: "20px" }}>
        <div className="info-banner-icon">
          <Info size={18} />
        </div>
        <div className="info-banner-content">
          <span className="info-banner-title">FinShield Zero-Error Feature Ingestion</span>
          <p className="info-banner-text">
            Features V1 through V28 represent confidential PCA transformations. Select any transaction
            from the dataset to load the complete 30-feature vector (<code>Time</code>, <code>V1</code>–<code>V28</code>,{" "}
            <code>Amount</code>) and execute FinShield anomaly scoring against the 0.120 threshold.
          </p>
        </div>
      </div>

      {error && (
        <div className="alert-card alert-danger">
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Transaction Selection Card */}
      <div className="card">
        <h2 className="card-title">
          {datasetAvailable ? "Select Transaction from Dataset" : "Enter Transaction Features"}
        </h2>
        <p className="card-subtitle">
          {datasetAvailable
            ? "Pick a curated transaction sample or search by index (0 to 284,806)"
            : "The historical dataset is unavailable. Enter all 30 PCA-based features for model inference."}
        </p>

        {datasetAvailable ? (
          <>
        {/* Quick Sample Selector */}
        <div style={{ marginBottom: "20px" }}>
          <label className="form-label">Curated Representative Samples:</label>
          <div className="quick-picker">
            {quickSamples.map((sample) => (
              <button
                key={sample.id}
                className={`quick-pill ${selectedId === sample.id ? "active" : ""}`}
                onClick={() => {
                  fetchTx(sample.id);
                  setResult(null);
                }}
              >
                {sample.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search / Dropdown row */}
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: "16px", marginBottom: "20px" }}>
          <div>
            <label className="form-label">Dataset Selection Dropdown:</label>
            <select
              className="form-control"
              value={selectedId}
              onChange={handleSelectChange}
              disabled={loadingTx}
            >
              {datasetList.map((item) => (
                <option key={item.id} value={item.id}>
                  Tx #{item.id} — Amount: ${item.Amount.toFixed(2)} (Time: {Math.round(item.Time)}s)
                </option>
              ))}
              {!datasetList.some((item) => item.id === selectedId) && (
                <option value={selectedId}>
                  Tx #{selectedId} (Current Selection)
                </option>
              )}
            </select>
          </div>

          <div>
            <label className="form-label">Lookup by Transaction ID (0 - 284,806):</label>
            <form onSubmit={handleSearchSubmit} style={{ display: "flex", gap: "8px" }}>
              <input
                type="number"
                min="0"
                max="284806"
                className="form-control"
                placeholder="Enter ID (e.g. 164)"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
              />
              <button type="submit" className="btn btn-secondary" disabled={loadingTx}>
                <Search size={14} />
                <span>Search</span>
              </button>
            </form>
          </div>
        </div>
          </>
        ) : (
          <div>
            <div className="alert-card" style={{ marginBottom: "18px" }}>
              <Info size={18} />
              <span>
                V1–V28 are PCA-transformed numerical features from the original transaction data,
                not ordinary financial fields such as merchant or card number.
              </span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "12px", marginBottom: "20px" }}>
              {FEATURE_NAMES.map((name) => (
                <label key={name} className="form-label">
                  {name}
                  <input
                    type="number"
                    step="any"
                    className="form-control"
                    value={manualFeatures[name]}
                    onChange={(event) => handleManualFeatureChange(name, event.target.value)}
                    placeholder={`Enter ${name}`}
                  />
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Readable Transaction Details */}
        {txDetails && (
          <div
            style={{
              backgroundColor: "var(--bg-surface-alt)",
              border: "1px solid var(--border-color)",
              borderRadius: "10px",
              padding: "16px 20px",
              marginBottom: "20px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
              <Sliders size={16} color="var(--primary)" />
              <span style={{ fontSize: "0.86rem", fontWeight: 700, color: "var(--text-main)" }}>
                Selected Transaction Attributes:
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "14px" }}>
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Transaction ID
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                  #{txDetails.id}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Amount
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                  ${txDetails.Amount.toFixed(2)}
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Elapsed Time
                </span>
                <div style={{ fontSize: "1.1rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                  {txDetails.Time.toFixed(0)} s
                </div>
              </div>
              <div>
                <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Ground-Truth Label
                </span>
                <div style={{ fontSize: "0.92rem", fontWeight: 600, marginTop: "2px" }}>
                  {txDetails.Class === 1 ? (
                    <span style={{ color: "var(--anomaly-val)" }}>Class = 1 (Actual Fraud)</span>
                  ) : (
                    <span style={{ color: "var(--normal-val)" }}>Class = 0 (Normal)</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            className="btn btn-primary"
            style={{ padding: "11px 26px", fontSize: "0.92rem" }}
            onClick={handlePredict}
            disabled={predicting || loadingTx || (datasetAvailable && !txDetails)}
          >
            <Shield size={16} />
            <span>{predicting ? "FinShield Analyzing..." : "Analyze Transaction"}</span>
          </button>
        </div>
      </div>

      {/* Prediction Result Card */}
      {result && (
        <div className="card" style={{ borderColor: result.is_anomaly ? "var(--anomaly-border)" : "var(--normal-border)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", paddingBottom: "16px", borderBottom: "1px solid var(--border-color)" }}>
            <div>
              <div style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                FinShield Inference Outcome
              </div>
              <div style={{ fontSize: "1.35rem", fontWeight: 700, color: "var(--text-main)", marginTop: "2px" }}>
                {result.transaction_id === null ? "Manual Feature Prediction" : `Transaction #${result.transaction_id}`}
              </div>
            </div>

            <div>
              {result.is_anomaly ? (
                <div className="badge badge-anomaly" style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
                  <AlertTriangle size={18} />
                  <span>POTENTIAL ANOMALY</span>
                </div>
              ) : (
                <div className="badge badge-normal" style={{ padding: "8px 16px", fontSize: "0.9rem" }}>
                  <CheckCircle size={18} />
                  <span>NORMAL TRANSACTION</span>
                </div>
              )}
            </div>
          </div>

          {/* Anomaly Score vs Detection Threshold Meter */}
          <div style={{ padding: "18px 20px", background: "var(--bg-surface-alt)", border: "1px solid var(--border-color)", borderRadius: "10px", marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "12px" }}>
              <div>
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Model Anomaly Score
                </span>
                <div
                  style={{
                    fontSize: "1.6rem",
                    fontWeight: 700,
                    fontFamily: "var(--font-mono)",
                    color: result.is_anomaly ? "var(--anomaly-val)" : "var(--normal-val)",
                  }}
                >
                  {result.anomaly_score.toFixed(4)}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <span style={{ fontSize: "0.76rem", color: "var(--text-muted)", textTransform: "uppercase" }}>
                  Decision Threshold
                </span>
                <div style={{ fontSize: "1.4rem", fontWeight: 700, fontFamily: "var(--font-mono)", color: "var(--text-main)" }}>
                  {result.threshold.toFixed(4)}
                </div>
              </div>
            </div>

            {/* Score progress bar relative to threshold */}
            <div style={{ width: "100%", height: "8px", background: "var(--border-color)", borderRadius: "4px", overflow: "hidden", position: "relative" }}>
              <div
                style={{
                  height: "100%",
                  width: `${Math.min(100, Math.max(5, ((result.anomaly_score + 0.2) / 0.5) * 100))}%`,
                  backgroundColor: result.is_anomaly ? "var(--anomaly-val)" : "var(--normal-val)",
                  transition: "width 0.4s ease",
                }}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.74rem", color: "var(--text-muted)", marginTop: "6px" }}>
              <span>Low Score (-0.200)</span>
              <span>Calibrated Decision Threshold (0.120)</span>
              <span>High Score (+0.300)</span>
            </div>
          </div>

          {/* Model Explanation */}
          <div style={{ marginBottom: "18px" }}>
            <h4 style={{ fontSize: "0.88rem", fontWeight: 700, color: "var(--text-main)", marginBottom: "4px" }}>
              Model Explanation & Behavioral Assessment:
            </h4>
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", lineHeight: 1.55 }}>
              {result.explanation}
            </p>
          </div>

          {/* Transaction Metadata Summary */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: "12px",
              padding: "12px 16px",
              backgroundColor: "var(--bg-surface-alt)",
              border: "1px solid var(--border-color)",
              borderRadius: "8px",
              fontSize: "0.82rem",
            }}
          >
            <div>
              <span style={{ color: "var(--text-muted)" }}>Transaction ID: </span>
              <strong style={{ color: "var(--text-main)" }}>#{result.transaction_id}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Amount (USD): </span>
              <strong style={{ color: "var(--text-main)" }}>${result.details?.Amount?.toFixed(2)}</strong>
            </div>
            <div>
              <span style={{ color: "var(--text-muted)" }}>Elapsed Time: </span>
              <strong style={{ color: "var(--text-main)" }}>{result.details?.Time?.toFixed(0)} seconds</strong>
            </div>
          </div>

          {/* Disclaimer */}
          <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "14px" }}>
            * {result.disclaimer}
          </p>
        </div>
      )}
    </div>
  );
}
