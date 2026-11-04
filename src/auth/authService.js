const SESSION_KEY = "cp_user";
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function apiRequest(path, { token, ...options } = {}) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new Error("Could not reach the account server. Check that the backend is running.");
  }

  let body = null;
  try {
    body = await response.json();
  } catch {
    if (response.ok) {
      throw new Error("The account server returned an invalid response.");
    }
  }
  if (!response.ok) {
    const message = body?.message || (response.status >= 500
      ? `The account server failed (HTTP ${response.status}). Ensure the Spring Boot API and PostgreSQL are running.`
      : `The account server returned an error (${response.status}).`);
    throw new Error(message);
  }
  return body;
}

export async function login(username, password) {
  const result = await apiRequest("/api/auth/login", {
    method: "POST",
    body: JSON.stringify({ username: username.trim(), password }),
  });
  const user = { ...result.user, token: result.token };
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
  return user;
}

export function submitAccountRequest({ name, username, email }) {
  return apiRequest("/api/account-requests", {
    method: "POST",
    body: JSON.stringify({ name: name.trim(), username: username.trim(), email: email.trim() }),
  });
}

export function getAccountRequests(token) {
  return apiRequest("/api/account-requests", { token });
}

export function approveAccountRequest(token, requestId, password) {
  return apiRequest(`/api/account-requests/${requestId}/approve`, {
    token,
    method: "POST",
    body: JSON.stringify({ password }),
  });
}

export function rejectAccountRequest(token, requestId) {
  return apiRequest(`/api/account-requests/${requestId}/reject`, {
    token,
    method: "POST",
  });
}

export function getStoredUser() {
  try {
    const user = JSON.parse(sessionStorage.getItem(SESSION_KEY));
    return typeof user?.token === "string" ? user : null;
  } catch {
    return null;
  }
}

export function logout() {
  sessionStorage.removeItem(SESSION_KEY);
}
