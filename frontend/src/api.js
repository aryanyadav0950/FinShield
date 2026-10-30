// Candidate backend endpoints (prioritizing port 8001 per user configuration)
const CANDIDATE_BASES = [
  "http://127.0.0.1:8001",
  "http://localhost:8001",
  "http://127.0.0.1:8000",
  "http://localhost:8000",
];

let activeApiBase = CANDIDATE_BASES[0];

/**
 * Robust fetch wrapper that attempts candidate endpoints with automatic fallback.
 */
async function apiFetch(path, options = {}) {
  // First try the currently active base
  try {
    const res = await fetch(`${activeApiBase}${path}`, options);
    return res;
  } catch (initialErr) {
    // If connection failed, test remaining candidates
    for (const base of CANDIDATE_BASES) {
      if (base === activeApiBase) continue;
      try {
        const res = await fetch(`${base}${path}`, options);
        activeApiBase = base; // Switch to the active responding base
        return res;
      } catch {
        // Continue checking candidates
      }
    }
    throw initialErr;
  }
}

export async function getHealth() {
  const res = await apiFetch("/health");
  if (!res.ok) throw new Error(`Health check failed (${res.status})`);
  return res.json();
}

export async function getDatasetSummary(refresh = false) {
  const res = await apiFetch(`/dataset/summary?refresh=${refresh}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch dataset summary (${res.status})`);
  }
  return res.json();
}

export async function getTransactions(page = 1, pageSize = 20, classFilter = "", search = "") {
  const params = new URLSearchParams();
  params.append("page", page);
  params.append("page_size", pageSize);
  if (classFilter && classFilter !== "all") {
    params.append("class_filter", classFilter);
  }
  if (search) {
    params.append("search", search);
  }

  const res = await apiFetch(`/transactions?${params.toString()}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch transactions (${res.status})`);
  }
  return res.json();
}

export async function getTransaction(id) {
  const res = await apiFetch(`/transactions/${id}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch transaction #${id}`);
  }
  return res.json();
}

export async function predictSingle(transactionId = null, features = null) {
  const body = {};
  if (transactionId !== null) {
    body.transaction_id = transactionId;
  } else if (features) {
    body.features = features;
  }

  const res = await apiFetch("/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Prediction failed (${res.status})`);
  }
  return res.json();
}

export async function predictBatch(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch("/predict/batch", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Batch analysis failed (${res.status})`);
  }
  return res.json();
}

export async function getModelInfo() {
  const res = await apiFetch("/model-info");
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Failed to fetch model info (${res.status})`);
  }
  return res.json();
}
