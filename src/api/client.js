const API_ROOT = "/api";

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function apiRequest(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });

  if (response.status === 204) return undefined;

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new ApiError(body.error || `Request failed (${response.status}).`, response.status);
  }
  return body;
}

function jsonRequest(method, data) {
  return { method, body: JSON.stringify(data) };
}

export const api = {
  login: (email, password) => apiRequest("/auth/login", jsonRequest("POST", { email, password })),
  currentUser: () => apiRequest("/auth/me"),
  logout: () => apiRequest("/auth/logout", { method: "POST" }),
  requestPasswordReset: (email) => apiRequest("/auth/forgot-password", jsonRequest("POST", { email })),
  resetPassword: (token, password) => apiRequest("/auth/reset-password", jsonRequest("POST", { token, password })),
  changePassword: (currentPassword, newPassword) =>
    apiRequest("/auth/password", jsonRequest("POST", { currentPassword, newPassword })),
  collection: (name) => name === "users"
    ? api.users()
    : apiRequest(`/collections/${encodeURIComponent(name)}`),
  createRecord: (name, data) =>
    apiRequest(`/collections/${encodeURIComponent(name)}`, jsonRequest("POST", data)),
  updateRecord: (name, id, data) =>
    apiRequest(`/collections/${encodeURIComponent(name)}/${encodeURIComponent(id)}`, jsonRequest("PATCH", data)),
  deleteRecord: (name, id) =>
    apiRequest(`/collections/${encodeURIComponent(name)}/${encodeURIComponent(id)}`, { method: "DELETE" }),
  users: () => apiRequest("/users"),
  createUser: (data) => apiRequest("/users", jsonRequest("POST", data)),
  updateUser: (id, data) => apiRequest(`/users/${encodeURIComponent(id)}`, jsonRequest("PATCH", data)),
  deleteUser: (id) => apiRequest(`/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  approveAccount: (id) => apiRequest(`/approvals/${encodeURIComponent(id)}/approve`, { method: "POST" }),
  rejectAccount: (id) => apiRequest(`/approvals/${encodeURIComponent(id)}/reject`, { method: "POST" }),
  heartbeat: () => apiRequest("/presence/heartbeat", { method: "POST" }),
  presence: () => apiRequest("/presence"),
  registerDevice: (data) => apiRequest("/device/registrations", jsonRequest("POST", data)),
  deviceState: (key) => apiRequest(`/device/state/${encodeURIComponent(key)}`),
  readings: (parameter) => apiRequest(`/device/readings/${encodeURIComponent(parameter)}`),
  provisionDevice: (id) =>
    apiRequest(`/devices/${encodeURIComponent(id)}/credentials`, jsonRequest("POST", {})),
  revokeDevice: (id) =>
    apiRequest(`/devices/${encodeURIComponent(id)}/credentials`, { method: "DELETE" }),
  logAudit: (event) => apiRequest("/audit-logs", jsonRequest("POST", event)),
};
