const configuredApiBase = import.meta.env.VITE_API_BASE_URL?.trim();
const API_BASE_URL = (configuredApiBase || "http://localhost:8000").replace(/\/+$/, "");

async function apiFetch(path, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, options);
    return res;
  } catch {
    throw new Error("The FinShield backend is unavailable. Check your connection and try again.");
  }
}

async function getApiError(res, fallbackMessage) {
  const err = await res.json().catch(() => ({}));
  return new Error(err.detail || `${fallbackMessage} (${res.status})`);
}

export async function getHealth() {
  const res = await apiFetch("/health");
  if (!res.ok) throw await getApiError(res, "Health check failed");
  return res.json();
}

export async function getDatasetSummary(refresh = false) {
  const res = await apiFetch(`/dataset/summary?refresh=${refresh}`);
  if (!res.ok) throw await getApiError(res, "Failed to fetch dataset summary");
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
  if (!res.ok) throw await getApiError(res, "Failed to fetch transactions");
  return res.json();
}

export async function getTransaction(id) {
  const res = await apiFetch(`/transactions/${id}`);
  if (!res.ok) throw await getApiError(res, `Failed to fetch transaction #${id}`);
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

  if (!res.ok) throw await getApiError(res, "Prediction failed");
  return res.json();
}

export async function predictBatch(file) {
  const formData = new FormData();
  formData.append("file", file);

  const res = await apiFetch("/predict/batch", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) throw await getApiError(res, "Batch analysis failed");
  return res.json();
}

export async function getModelInfo() {
  const res = await apiFetch("/model-info");
  if (!res.ok) throw await getApiError(res, "Failed to fetch model info");
  return res.json();
}
