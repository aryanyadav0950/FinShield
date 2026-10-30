# FinShield: AI-Powered Financial Anomaly Detection Engine

**FinShield** is an end-to-end, full-stack machine learning web application that detects fraudulent and anomalous financial transactions using unsupervised anomaly detection powered by a pre-trained **Isolation Forest** model, **StandardScaler**, and an empirically calibrated decision threshold of **0.120**.

---

## 1. Project Description

Credit card fraud is an extreme-class-imbalance problem where legitimate transactions comprise over 99.8% of daily financial traffic. Rather than attempting standard supervised classification—which easily overfits and fails to detect emerging, novel fraud patterns—this project utilizes **unsupervised anomaly detection**.

By learning the structural topology and isolation depth of transaction distributions in high-dimensional space, the **Isolation Forest** algorithm detects anomalous observations that differ significantly from standard transaction behaviors without requiring fraud labels during training.

---

## 2. Key Features

- **Professional Financial / Security UI (Option 1 Design)**:
  - Clean, minimal, data-focused interface suitable for research presentations, college project guides, and professional portfolios.
  - Strict absence of gaming graphics, emojis, or exaggerated marketing claims.
- **Three Theme Modes (Light / Dark / System)**:
  - **Light**: Crisp white/light-slate surfaces with deep navy accents.
  - **Dark**: High-contrast dark navy/charcoal surfaces with glowing indicators and restrained shadows.
  - **System**: Automatically syncs with operating system preference via `prefers-color-scheme`.
  - Persisted in browser `localStorage`.
- **Dynamic Dashboard**:
  - Live statistics calculated directly from `creditcard.csv` (284,807 transactions, 1,176 model anomalies, 283,631 normal transactions, 0.413% anomaly rate).
  - High-performance caching to prevent frontend freezing.
  - Interactive charts: **Transaction Amount Distribution** (Normal vs Actual Fraud) and **Transaction Classification Results**.
  - Distinct callout banner cleanly distinguishing **Ground-Truth Fraud (Class=1)** from **Model Detected Potential Anomalies**.
- **Single Transaction Analysis (Zero Manual V1–V28 Entry)**:
  - Direct selection from the dataset via dropdown, quick sample picker, or transaction ID search.
  - Automatically loads the complete 30-feature vector (`Time`, `V1`–`V28`, `Amount`).
  - Displays human-readable metadata: Transaction ID, Elapsed Time, and Amount in USD.
  - Instant prediction card with **NORMAL** or **POTENTIAL FRAUD** status, Anomaly Score, 0.120 Decision Threshold, and contextual explanation.
- **Batch CSV Analysis**:
  - Drag-and-drop or file browser upload for custom transaction CSVs.
  - Validates required columns (`Time`, `V1`–`V28`, `Amount`) and provides helpful error alerts.
  - Vectorized backend scoring for optimal throughput.
  - Ground-truth evaluation metrics (Precision, Recall, F1 Score, Confusion Matrix) automatically displayed if an optional `Class` column is present.
  - Interactive table with sorting, filtering by status, search, and pagination.
  - One-click export to download analysis results as CSV.
- **Dedicated Results Page**:
  - Full-view results console with score distribution histogram and normal vs. anomaly doughnut breakdown.
  - Clean empty state with quick actions when no session analysis has been performed.
- **Model Information**:
  - Algorithm architecture, hyperparameters read directly from `isolation_forest_model.pkl`.
  - Display of experimental baseline metrics and calibrated threshold (0.120) evaluation results.
  - Explanation of Isolation Forest mechanics and PCA anonymization constraints.

---

## 3. Technology Stack

- **Backend**:
  - Python 3.12+
  - **FastAPI**: Modern, asynchronous REST API framework
  - **Uvicorn**: High-performance ASGI web server
  - **Scikit-Learn**: Machine learning library hosting IsolationForest and StandardScaler
  - **Pandas & NumPy**: High-speed vectorized data manipulation and mathematical transformations
  - **Joblib & Pickle**: Model serialization and threshold persistence
- **Frontend**:
  - **React 19** with **Vite 8**: Ultra-fast single-page web application architecture
  - **Vanilla CSS Tokens**: Scalable CSS variables for instant Light, Dark, and System theme switching
  - **Lucide React**: Clean SVG icon system (no emojis)
  - **Chart.js & React-Chartjs-2**: High-performance canvas charts responsive to theme changes

---

## 4. Dataset Information

- **Dataset File**: `Dataset/creditcard.csv` (150 MB, 284,807 rows, 31 columns)
- **Features**:
  - `Time`: Seconds elapsed between each transaction and the first transaction in the dataset.
  - `V1` through `V28`: Principal components obtained via PCA to protect confidential customer information.
  - `Amount`: Transaction monetary amount in USD.
  - `Class`: Ground-truth label (1 for actual fraud, 0 for normal).
- **Class Imbalance**:
  - Normal Transactions: **284,315** (99.827%)
  - Confirmed Fraud Cases: **492** (0.173%)

---

## 5. Machine Learning Approach & Prediction Workflow

### Unsupervised Anomaly Detection Flow:
```
Transaction Data (Time, V1..V28, Amount)
          │
          ▼
StandardScaler (scaler.pkl)
          │
          ▼
Standardized 30-Dimension Feature Vector (X_scaled)
          │
          ▼
Isolation Forest Model (isolation_forest_model.pkl)
          │
          ▼
Raw Decision Function: raw_score = model.decision_function(X_scaled)
          │
          ▼
Anomaly Score: anomaly_score = -raw_score
          │
          ▼
Decision Rule: anomaly_score >= threshold (0.120)
       ├── True  ──> POTENTIAL ANOMALY (POTENTIAL FRAUD)
       └── False ──> NORMAL
```

> **Crucial Distinction**:
> The model identifies *statistical outliers* in the PCA latent space. Model predictions are strictly labeled as **Potential Anomalies** or **Potential Fraud**, never "confirmed fraud". The ground-truth `Class` label is **never** fed into the model during inference.

---

## 6. How to Run the Application

### Prerequisites
- Python 3.12 (or 3.11+)
- Node.js (v18+) and npm

### Step 1: Install Dependencies

#### Backend Dependencies:
```bash
py -3.12 -m pip install fastapi uvicorn scikit-learn pandas numpy joblib python-multipart httpx
```

#### Frontend Dependencies:
```bash
cd frontend
npm install
cd ..
```

---

### Step 2: Start the Backend Server

From the project root (`CreditCard/`):
```bash
py -3.12 -m uvicorn backend.main:app --host 127.0.0.1 --port 8000
```
- API will be accessible at: `http://127.0.0.1:8000`
- Interactive Swagger Documentation: `http://127.0.0.1:8000/docs`

---

### Step 3: Start the Frontend Application

Open a second terminal in the project root:
```bash
cd frontend
npm run dev -- --host 127.0.0.1 --port 5173
```
- Open your browser to: **`http://127.0.0.1:5173/`**

---

## 7. API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root API status and endpoint directory |
| `GET` | `/health` | Health check verifying model, scaler, and dataset state |
| `GET` | `/dataset/summary` | Precomputed dataset overview, amount distribution, and anomaly counts |
| `GET` | `/transactions` | Paginated transaction explorer with search and ground-truth filters |
| `GET` | `/transactions/{id}` | Detailed 30-feature vector lookup for a specific transaction |
| `POST` | `/predict` | Single transaction anomaly detection by ID or feature dictionary |
| `POST` | `/predict/batch` | High-throughput vectorized CSV batch prediction and validation |
| `GET` | `/model-info` | Model configuration, hyperparameters, and experimental baseline metrics |

---

## 8. Experimental Evaluation Metrics

From the experimental Kaggle baseline analysis conducted during model development:

### General Performance:
- **ROC-AUC**: `0.92998`
- **Recall (Fraud Coverage)**: `78.95%`
- **Average Precision (PR-AUC)**: `0.1060`
- **Baseline Precision**: `3.28%`
- **Baseline F1 Score**: `0.0630`

### Calibrated Threshold (0.120) Evaluation:
- **Operating Threshold**: `0.1200`
- **Calibrated Precision**: `15.28%` (4.6x improvement over uncalibrated baseline)
- **Recall at Cutoff**: `36.84%`
- **Optimized F1 Score**: `0.2160` (3.4x improvement over uncalibrated baseline)
- **Anomalies Detected**: `229` cases

*Note: These metrics reflect evaluation on the experimental test setup and illustrate the trade-off between false alarm reduction and fraud recall.*

---

## 9. Important Limitations

1. **PCA Transformed Features (`V1`–`V28`)**: Due to customer confidentiality, the original financial parameters (such as merchant category, geolocation, cardholder history, device fingerprint) were transformed via PCA into anonymized numerical components. Consequently, end-users cannot interpret individual `V` features directly. The application addresses this by letting users select verified transactions by ID and inspect real non-anonymized properties (`Time` and `Amount`).
2. **Anomaly vs. Intent**: Unsupervised algorithms flag observations that deviate from normal patterns. An anomaly may represent extreme purchasing amounts or unusual timing without necessarily being fraudulent.

---

## 10. Future Improvements

- **Ensemble Hybrid Architecture**: Combining unsupervised Isolation Forest scoring with supervised gradient boosting (LightGBM/XGBoost) for enhanced precision on labeled cohorts.
- **SHAP / TreeExplainer Integration**: Calculating feature contribution values to explain which principal components triggered the anomaly flag for a specific transaction.
- **Real-Time Streaming Ingestion**: Integrating Apache Kafka or WebSockets to simulate high-throughput real-time payment gateway event evaluation.
