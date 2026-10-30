import os
import json
import pickle
import warnings
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Dict, List, Optional

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, File, HTTPException, Query, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Suppress sklearn version warnings during unpickling
warnings.filterwarnings("ignore", category=UserWarning)

# Base Paths
BASE_DIR = Path(__file__).resolve().parent
PROJECT_ROOT = BASE_DIR.parent
DATASET_PATH = Path(
    os.getenv("FINSHIELD_DATASET_PATH", PROJECT_ROOT / "Dataset" / "creditcard.csv")
)
MODEL_PATH = Path(
    os.getenv("FINSHIELD_MODEL_PATH", BASE_DIR / "isolation_forest_model.pkl")
)
SCALER_PATH = Path(os.getenv("FINSHIELD_SCALER_PATH", BASE_DIR / "scaler.pkl"))
THRESHOLD_PATH = Path(
    os.getenv("FINSHIELD_THRESHOLD_PATH", BASE_DIR / "threshold.pkl")
)
CACHE_PATH = Path(
    os.getenv("FINSHIELD_CACHE_PATH", BASE_DIR / "dataset_cache.json")
)

DEFAULT_FRONTEND_ORIGINS = {
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
}
configured_origins = os.getenv("FRONTEND_ORIGINS", "")
ALLOWED_ORIGINS = (
    {
        origin.strip().rstrip("/")
        for origin in configured_origins.split(",")
        if origin.strip()
    }
    | DEFAULT_FRONTEND_ORIGINS
)

FEATURE_COLUMNS = ["Time"] + [f"V{i}" for i in range(1, 29)] + ["Amount"]

# Global singletons
state: Dict[str, Any] = {
    "model": None,
    "scaler": None,
    "threshold": 0.12,
    "dataset_df": None,
    "cache": None,
}


def load_artifacts():
    """Load model, scaler, threshold, and dataset cache on application startup."""
    print("Loading ML artifacts...")
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}")
    if not os.path.exists(SCALER_PATH):
        raise FileNotFoundError(f"Scaler file not found at {SCALER_PATH}")
    if not os.path.exists(THRESHOLD_PATH):
        raise FileNotFoundError(f"Threshold file not found at {THRESHOLD_PATH}")

    state["model"] = joblib.load(MODEL_PATH)
    state["scaler"] = joblib.load(SCALER_PATH)

    with open(THRESHOLD_PATH, "rb") as f:
        threshold_val = pickle.load(f)
        state["threshold"] = float(threshold_val)

    # Load dataset cache if available
    if os.path.exists(CACHE_PATH):
        with open(CACHE_PATH, "r") as f:
            state["cache"] = json.load(f)
            print("Loaded precomputed dataset summary from cache.")

    # Load dataset for transaction browsing and lookup
    if os.path.exists(DATASET_PATH):
        print(f"Loading dataset from {DATASET_PATH} into memory...")
        state["dataset_df"] = pd.read_csv(DATASET_PATH)
        print(f"Dataset loaded: {len(state['dataset_df'])} rows.")
    else:
        print(f"Warning: Dataset file not found at {DATASET_PATH}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    load_artifacts()
    yield
    print("Shutting down application...")


app = FastAPI(
    title="FinShield API",
    description="FinShield AI-Powered Transaction Anomaly Detection Engine using Isolation Forest",
    version="1.0.0",
    lifespan=lifespan,
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=sorted(ALLOWED_ORIGINS),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Pydantic Schemas
class SinglePredictionRequest(BaseModel):
    transaction_id: Optional[int] = Field(
        None, description="Index of transaction in Dataset/creditcard.csv"
    )
    features: Optional[Dict[str, float]] = Field(
        None, description="Direct feature mapping containing Time, V1-V28, and Amount"
    )


class SinglePredictionResponse(BaseModel):
    transaction_id: Optional[int]
    anomaly_score: float
    threshold: float
    prediction: str
    is_anomaly: bool
    explanation: str
    details: Dict[str, Any]
    disclaimer: str


class BatchSummary(BaseModel):
    transactions_analyzed: int
    potential_anomalies: int
    normal_transactions: int
    anomaly_rate: float
    has_ground_truth: bool
    evaluation_metrics: Optional[Dict[str, Any]] = None


class BatchResultItem(BaseModel):
    id: int
    time: float
    amount: float
    anomaly_score: float
    threshold: float
    prediction: str
    is_anomaly: bool
    actual_class: Optional[int] = None


class BatchAnalysisResponse(BaseModel):
    summary: BatchSummary
    results: List[BatchResultItem]
    disclaimer: str


# API Routes
@app.get("/")
def read_root():
    return {
        "title": "FinShield API",
        "description": "FinShield Unsupervised Anomaly Detection Engine using Isolation Forest",
        "version": "1.0.0",
        "status": "online",
        "docs_url": "/docs",
        "endpoints": {
            "health": "/health",
            "dataset_summary": "/dataset/summary",
            "transactions": "/transactions",
            "single_transaction": "/transactions/{transaction_id}",
            "predict": "/predict",
            "predict_batch": "/predict/batch",
            "model_info": "/model-info",
        },
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "model_loaded": state["model"] is not None,
        "scaler_loaded": state["scaler"] is not None,
        "threshold": state["threshold"],
        "dataset_loaded": state["dataset_df"] is not None,
        "total_transactions": len(state["dataset_df"])
        if state["dataset_df"] is not None
        else 0,
    }


@app.get("/dataset/summary")
def get_dataset_summary(refresh: bool = Query(False, description="Force recomputation")):
    """Returns dataset overview statistics, amount distribution, and anomaly results."""
    if state["cache"] is not None and not refresh:
        return state["cache"]

    if state["dataset_df"] is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dataset is not currently loaded.",
        )

    df = state["dataset_df"]
    scaler = state["scaler"]
    model = state["model"]
    threshold = state["threshold"]

    X = df[FEATURE_COLUMNS]
    X_scaled = scaler.transform(X)
    scores = -model.decision_function(X_scaled)
    is_anomaly = scores >= threshold

    total = len(df)
    pot_anomalies = int(np.sum(is_anomaly))
    normal_tx = total - pot_anomalies
    rate = float(pot_anomalies / total)
    actual_fraud = int(np.sum(df["Class"] == 1))
    actual_normal = int(np.sum(df["Class"] == 0))

    amt = df["Amount"]
    amt_stats = {
        "min": float(amt.min()),
        "max": float(amt.max()),
        "mean": round(float(amt.mean()), 2),
        "median": round(float(amt.median()), 2),
        "std": round(float(amt.std()), 2),
        "q25": round(float(amt.quantile(0.25)), 2),
        "q75": round(float(amt.quantile(0.75)), 2),
    }

    bins = [0, 5, 20, 50, 100, 200, 500, 1000, 26000]
    bin_labels = [
        "0-5",
        "5-20",
        "20-50",
        "50-100",
        "100-200",
        "200-500",
        "500-1K",
        "1K+",
    ]
    df["amt_bin"] = pd.cut(df["Amount"], bins=bins, labels=bin_labels, include_lowest=True)

    normal_bin_counts = df[df["Class"] == 0]["amt_bin"].value_counts()[bin_labels].to_dict()
    fraud_bin_counts = df[df["Class"] == 1]["amt_bin"].value_counts()[bin_labels].to_dict()

    score_bins = [-0.3, -0.15, 0.0, 0.05, 0.10, 0.12, 0.15, 0.20, 0.4]
    score_labels = [
        "<-0.15",
        "-0.15 to 0",
        "0 to 0.05",
        "0.05 to 0.10",
        "0.10 to 0.12",
        "0.12 to 0.15",
        "0.15 to 0.20",
        ">0.20",
    ]
    scores_cut = pd.cut(scores, bins=score_bins, labels=score_labels, include_lowest=True)
    score_dist = scores_cut.value_counts()[score_labels].to_dict()

    cache_data = {
        "total_transactions": total,
        "potential_anomalies": pot_anomalies,
        "normal_transactions": normal_tx,
        "anomaly_rate": round(rate, 5),
        "actual_fraud_count": actual_fraud,
        "actual_normal_count": actual_normal,
        "amount_stats": amt_stats,
        "amount_distribution": {
            "labels": bin_labels,
            "normal_counts": {k: int(v) for k, v in normal_bin_counts.items()},
            "actual_fraud_counts": {k: int(v) for k, v in fraud_bin_counts.items()},
        },
        "results_distribution": {
            "normal": normal_tx,
            "potential_anomaly": pot_anomalies,
        },
        "score_distribution": {
            "labels": score_labels,
            "counts": {k: int(v) for k, v in score_dist.items()},
            "threshold": float(threshold),
        },
        "boxplot_stats": {
            "normal": {
                "min": round(float(df.loc[~is_anomaly, "Amount"].min()), 2),
                "q25": round(float(df.loc[~is_anomaly, "Amount"].quantile(0.25)), 2),
                "median": round(float(df.loc[~is_anomaly, "Amount"].median()), 2),
                "q75": round(float(df.loc[~is_anomaly, "Amount"].quantile(0.75)), 2),
                "max": round(float(df.loc[~is_anomaly, "Amount"].max()), 2),
                "mean": round(float(df.loc[~is_anomaly, "Amount"].mean()), 2),
                "std": round(float(df.loc[~is_anomaly, "Amount"].std()), 2),
            },
            "potential_anomaly": {
                "min": round(float(df.loc[is_anomaly, "Amount"].min()), 2),
                "q25": round(float(df.loc[is_anomaly, "Amount"].quantile(0.25)), 2),
                "median": round(float(df.loc[is_anomaly, "Amount"].median()), 2),
                "q75": round(float(df.loc[is_anomaly, "Amount"].quantile(0.75)), 2),
                "max": round(float(df.loc[is_anomaly, "Amount"].max()), 2),
                "mean": round(float(df.loc[is_anomaly, "Amount"].mean()), 2),
                "std": round(float(df.loc[is_anomaly, "Amount"].std()), 2),
            },
        },
    }

    state["cache"] = cache_data
    with open(CACHE_PATH, "w") as f:
        json.dump(cache_data, f, indent=2)

    return cache_data


@app.get("/transactions")
def list_transactions(
    page: int = Query(1, ge=1, description="Page number (1-indexed)"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    class_filter: Optional[str] = Query(
        None, description="Filter by actual Class ('0', '1', or 'all')"
    ),
    search: Optional[str] = Query(
        None, description="Search by transaction ID or exact amount"
    ),
):
    """Retrieve paginated transactions from Dataset/creditcard.csv with search and filtering."""
    if state["dataset_df"] is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dataset is not loaded.",
        )

    df = state["dataset_df"]

    # Filter by class
    filtered_df = df
    if class_filter in ("0", "1"):
        filtered_df = filtered_df[filtered_df["Class"] == int(class_filter)]

    # Search
    if search:
        search = search.strip()
        if search.isdigit():
            # If search is an integer, could be row index or Time
            idx_val = int(search)
            if idx_val in filtered_df.index:
                filtered_df = filtered_df.loc[[idx_val]]
            else:
                filtered_df = filtered_df[
                    (filtered_df["Time"] == idx_val)
                    | (filtered_df["Amount"] == float(idx_val))
                ]
        else:
            try:
                amt_val = float(search)
                filtered_df = filtered_df[filtered_df["Amount"] == amt_val]
            except ValueError:
                pass

    total_records = len(filtered_df)
    total_pages = max(1, (total_records + page_size - 1) // page_size)
    start_idx = (page - 1) * page_size
    end_idx = min(start_idx + page_size, total_records)

    page_slice = filtered_df.iloc[start_idx:end_idx]

    items = []
    for idx, row in page_slice.iterrows():
        items.append(
            {
                "id": int(idx),
                "Time": float(row["Time"]),
                "Amount": float(row["Amount"]),
                "Class": int(row["Class"]),
            }
        )

    return {
        "items": items,
        "total": total_records,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@app.get("/transactions/{transaction_id}")
def get_transaction(transaction_id: int):
    """Retrieve full details of a single transaction by its dataset index."""
    if state["dataset_df"] is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Dataset is not loaded.",
        )

    df = state["dataset_df"]
    if transaction_id < 0 or transaction_id >= len(df):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Transaction #{transaction_id} not found. Valid index range: 0 to {len(df)-1}.",
        )

    row = df.iloc[transaction_id]
    features_dict = {col: float(row[col]) for col in FEATURE_COLUMNS}

    return {
        "id": transaction_id,
        "Time": float(row["Time"]),
        "Amount": float(row["Amount"]),
        "Class": int(row["Class"]),
        "features": features_dict,
    }


@app.post("/predict", response_model=SinglePredictionResponse)
def predict_single(req: SinglePredictionRequest):
    """Run anomaly detection on a single transaction using the loaded Isolation Forest model."""
    if state["model"] is None or state["scaler"] is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model or Scaler not loaded.",
        )

    model = state["model"]
    scaler = state["scaler"]
    threshold = state["threshold"]

    tx_id = req.transaction_id
    features_dict = req.features

    # Resolve features either from transaction_id in dataset or from provided dictionary
    if tx_id is not None:
        if state["dataset_df"] is None:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Dataset is not loaded for ID lookup.",
            )
        df = state["dataset_df"]
        if tx_id < 0 or tx_id >= len(df):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Transaction #{tx_id} not found in dataset.",
            )
        row = df.iloc[tx_id]
        features_dict = {col: float(row[col]) for col in FEATURE_COLUMNS}
    elif features_dict is not None:
        # Validate that all required 30 features exist
        missing = [col for col in FEATURE_COLUMNS if col not in features_dict]
        if missing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required feature: {missing[0]}",
            )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Either 'transaction_id' or 'features' must be provided.",
        )

    # 1. Feature vector in EXACT order: Time, V1-V28, Amount
    feature_vector = np.array(
        [[features_dict[col] for col in FEATURE_COLUMNS]], dtype=float
    )

    # 2. Scaler transform
    feature_scaled = scaler.transform(feature_vector)

    # 3. Model decision function: anomaly_score = -decision_function
    raw_score = model.decision_function(feature_scaled)[0]
    anomaly_score = float(-raw_score)

    # 4. Compare with threshold
    is_anomaly = bool(anomaly_score >= threshold)
    prediction_label = "Potential Anomaly" if is_anomaly else "Normal"

    explanation = (
        "The transaction was identified as anomalous by the current anomaly detection model."
        if is_anomaly
        else "The transaction was not identified as anomalous by the current anomaly detection threshold."
    )

    return SinglePredictionResponse(
        transaction_id=tx_id,
        anomaly_score=round(anomaly_score, 4),
        threshold=round(threshold, 4),
        prediction=prediction_label,
        is_anomaly=is_anomaly,
        explanation=explanation,
        details={
            "Time": float(features_dict["Time"]),
            "Amount": float(features_dict["Amount"]),
        },
        disclaimer="This system provides anomaly-based predictions and should not be treated as definitive confirmation of fraud.",
    )


@app.post("/predict/batch", response_model=BatchAnalysisResponse)
async def predict_batch(file: UploadFile = File(...)):
    """Analyze a batch CSV file with the trained Isolation Forest model."""
    if state["model"] is None or state["scaler"] is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model or Scaler not loaded.",
        )

    filename = file.filename or ""
    if not filename.lower().endswith(".csv"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type: Please upload a CSV file.",
        )

    try:
        df = pd.read_csv(file.file)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Could not parse CSV file: {str(e)}",
        )

    if df.empty:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded CSV file is empty.",
        )

    # Validate required columns
    for col in FEATURE_COLUMNS:
        if col not in df.columns:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Missing required column: {col}",
            )

    # Check for Ground Truth 'Class' column (optional, used strictly for evaluation comparison)
    has_class = "Class" in df.columns
    actual_classes = df["Class"].astype(int).tolist() if has_class else None

    # Construct feature matrix in exact order (NEVER include Class)
    X = df[FEATURE_COLUMNS]

    # Validate numeric types
    try:
        X = X.astype(float)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid numeric values detected in feature columns.",
        )

    scaler = state["scaler"]
    model = state["model"]
    threshold = state["threshold"]

    # Vectorized scaling and inference
    X_scaled = scaler.transform(X)
    scores = -model.decision_function(X_scaled)
    is_anomaly_mask = scores >= threshold

    total_count = len(df)
    pot_anomalies_count = int(np.sum(is_anomaly_mask))
    normal_count = total_count - pot_anomalies_count
    anomaly_rate = float(pot_anomalies_count / total_count)

    evaluation_metrics = None
    if has_class:
        y_true = np.array(actual_classes)
        y_pred = is_anomaly_mask.astype(int)

        tp = int(np.sum((y_true == 1) & (y_pred == 1)))
        fp = int(np.sum((y_true == 0) & (y_pred == 1)))
        fn = int(np.sum((y_true == 1) & (y_pred == 0)))
        tn = int(np.sum((y_true == 0) & (y_pred == 0)))

        precision = float(tp / (tp + fp)) if (tp + fp) > 0 else 0.0
        recall = float(tp / (tp + fn)) if (tp + fn) > 0 else 0.0
        f1 = (
            float(2 * precision * recall / (precision + recall))
            if (precision + recall) > 0
            else 0.0
        )

        evaluation_metrics = {
            "true_positives": tp,
            "false_positives": fp,
            "false_negatives": fn,
            "true_negatives": tn,
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1_score": round(f1, 4),
            "actual_fraud_count": int(np.sum(y_true == 1)),
            "actual_normal_count": int(np.sum(y_true == 0)),
        }

    # Construct individual result items
    results = []
    for i in range(total_count):
        score_val = float(scores[i])
        anom = bool(is_anomaly_mask[i])
        results.append(
            BatchResultItem(
                id=int(df.index[i]) if hasattr(df.index[i], "__int__") else i,
                time=float(df["Time"].iloc[i]),
                amount=float(df["Amount"].iloc[i]),
                anomaly_score=round(score_val, 4),
                threshold=round(threshold, 4),
                prediction="Potential Anomaly" if anom else "Normal",
                is_anomaly=anom,
                actual_class=actual_classes[i] if has_class else None,
            )
        )

    summary = BatchSummary(
        transactions_analyzed=total_count,
        potential_anomalies=pot_anomalies_count,
        normal_transactions=normal_count,
        anomaly_rate=round(anomaly_rate, 5),
        has_ground_truth=has_class,
        evaluation_metrics=evaluation_metrics,
    )

    return BatchAnalysisResponse(
        summary=summary,
        results=results,
        disclaimer="This system provides anomaly-based predictions and should not be treated as definitive confirmation of fraud.",
    )


@app.get("/model-info")
def get_model_info():
    """Retrieve full model configuration, architecture details, and baseline research metrics."""
    model = state["model"]
    threshold = state["threshold"]

    hyperparams = {}
    if model is not None:
        hyperparams = {
            "n_estimators": getattr(model, "n_estimators", 100),
            "max_samples": getattr(model, "max_samples", "auto"),
            "contamination": getattr(model, "contamination", "auto"),
            "max_features": getattr(model, "max_features", 1.0),
            "bootstrap": getattr(model, "bootstrap", False),
            "random_state": getattr(model, "random_state", 42),
            "offset_": float(getattr(model, "offset_", -0.5)),
            "n_features_in_": getattr(model, "n_features_in_", 30),
        }

    return {
        "algorithm": "Isolation Forest",
        "task": "FinShield Transaction Anomaly Detection",
        "type": "Unsupervised Anomaly Detection",
        "input_features_count": 30,
        "features": FEATURE_COLUMNS,
        "target_label": "Class",
        "target_label_note": "Class is NOT used as an input during Isolation Forest training.",
        "detection_threshold": threshold,
        "hyperparameters": hyperparams,
        "explanation": "Isolation Forest is an unsupervised anomaly detection algorithm that identifies observations that are easier to isolate from the majority of observations. It builds an ensemble of isolation trees (iTrees); anomalies require fewer splits to be isolated in terminal leaves compared to normal points.",
        "baseline_evaluation_metrics": {
            "precision": 0.03280839895013123,
            "recall": 0.7894736842105263,
            "f1_score": 0.06299874002519949,
            "roc_auc": 0.9299849772708059,
            "average_precision": 0.10599623948412165,
            "threshold_analysis": {
                "threshold": 0.12,
                "precision": 0.152838,
                "recall": 0.368421,
                "f1_score": 0.216049,
                "anomalies_detected": 229,
            },
        },
        "performance_note": "These values are presented as evaluation results from the current test setup, not as universal model performance.",
        "disclaimer": "This system provides anomaly-based predictions and should not be treated as definitive confirmation of fraud.",
    }
