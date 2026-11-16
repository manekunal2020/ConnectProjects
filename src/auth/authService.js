
const STORAGE_KEY = "connect-projects-user";
const TOKEN_KEY = "connect-projects-token";

// Login user
export async function login(username, password) {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "Unable to sign in.");
  }

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user));
  sessionStorage.setItem(TOKEN_KEY, data.token);

  return data.user;
}

// Request password reset email
export async function requestPasswordReset(email) {
  return apiRequest("/api/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
}

// Reset password
export async function resetPassword(token, password) {
  return apiRequest("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify({ token, password }),
  });
}

// Submit account enquiry
export async function submitAccountRequest({ name, username, email }) {
  return apiRequest("/api/account-requests", {
    method: "POST",
    body: JSON.stringify({
      name: name.trim(),
      username: username.trim().toLowerCase(),
      email: email.trim().toLowerCase(),
    }),
  });
}

// Get pending account enquiries
export async function getAccountRequests() {
  return apiRequest("/api/account-requests");
}

// Approve account enquiry
export async function approveAccountRequest(_token, requestId, password) {
  return apiRequest(
    `/api/account-requests/${encodeURIComponent(requestId)}/approve`,
    {
      method: "POST",
      body: JSON.stringify({ password }),
    }
  );
}

// Reject account enquiry
export async function rejectAccountRequest(_token, requestId) {
  return apiRequest(
    `/api/account-requests/${encodeURIComponent(requestId)}/reject`,
    { method: "POST" }
  );
}

// Get all users
export async function getUsers() {
  return apiRequest("/api/users");
}

export async function getAssignees() {
  return apiRequest("/api/users/assignees");
}

// Create user
export async function createUser({ username, name, email, password, role }) {
  return apiRequest("/api/users", {
    method: "POST",
    body: JSON.stringify({
      username: username.trim().toLowerCase(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password,
      role,
    }),
  });
}

// Delete user
export async function deleteUser(userId) {
  return apiRequest(`/api/users/${encodeURIComponent(userId)}`, {
    method: "DELETE",
  });
}

export async function getReportTickets() {
  const data = await apiRequest("/api/reports/tickets");
  return Array.isArray(data) ? data : data.tickets || [];
}

export async function getDashboard() {
  return apiRequest("/api/dashboard");
}

export async function getProjects() {
  return apiRequest("/api/projects");
}

export async function getProjectManagementClients() {
  return apiRequest("/api/project-management/clients");
}

export async function createProjectManagementClient(client) {
  return apiRequest("/api/project-management/clients", {
    method: "POST",
    body: JSON.stringify(client),
  });
}

export async function getProjectManagementLeads() {
  return apiRequest("/api/project-management/leads");
}

export async function getProjectConfiguration(projectId) {
  const projectPath = `/api/projects/${encodeURIComponent(projectId)}`;
  const [shifts, priorities, categories, slas] = await Promise.all(
    ["shifts", "priorities", "categories", "slas"].map((item) =>
      apiRequest(`${projectPath}/${item}`)
    )
  );
  return { shifts, priorities, categories, slas };
}

export async function createProjectConfiguration(projectId, item, data) {
  return apiRequest(`/api/projects/${encodeURIComponent(projectId)}/${item}`, {
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function deleteProjectConfiguration(projectId, item, itemId, categoryId) {
  const base = `/api/projects/${encodeURIComponent(projectId)}/${item}`;
  const path = categoryId
    ? `${base}/${encodeURIComponent(categoryId)}/subcategories/${encodeURIComponent(itemId)}`
    : `${base}/${encodeURIComponent(itemId)}`;
  return apiRequest(path, { method: "DELETE" });
}

export async function addProjectSubcategory(projectId, categoryId, name) {
  return apiRequest(
    `/api/projects/${encodeURIComponent(projectId)}/categories/${encodeURIComponent(categoryId)}/subcategories`,
    { method: "POST", body: JSON.stringify({ name }) }
  );
}

export async function saveProjectSla(projectId, sla) {
  return createProjectConfiguration(projectId, "slas", sla);
}

export async function createProject(project) {
  return apiRequest("/api/projects", { method: "POST", body: JSON.stringify(project) });
}

export async function updateProject(projectId, project) {
  return apiRequest(`/api/projects/${encodeURIComponent(projectId)}`, { method: "PUT", body: JSON.stringify(project) });
}

export async function deleteProject(projectId) {
  return apiRequest(`/api/projects/${encodeURIComponent(projectId)}`, { method: "DELETE" });
}

export async function getTasks() {
  return apiRequest("/api/tasks");
}

export async function getTaskAssignees() {
  return apiRequest("/api/tasks/assignees");
}

export async function createTask(task) {
  return apiRequest("/api/tasks", { method: "POST", body: JSON.stringify(task) });
}

export async function updateTask(taskId, task) {
  return apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "PUT", body: JSON.stringify(task) });
}

export async function deleteTask(taskId) {
  return apiRequest(`/api/tasks/${encodeURIComponent(taskId)}`, { method: "DELETE" });
}

export async function getTickets() {
  return apiRequest("/api/tickets");
}

export async function createTicket(ticket) {
  return apiRequest("/api/tickets", { method: "POST", body: JSON.stringify(ticket) });
}

export async function updateTicket(ticketId, ticket) {
  return apiRequest(`/api/tickets/${encodeURIComponent(ticketId)}`, { method: "PATCH", body: JSON.stringify(ticket) });
}

export async function assignTicket(ticketId, assigneeId) {
  return apiRequest(`/api/tickets/${encodeURIComponent(ticketId)}/assign`, {
    method: "PATCH",
    body: JSON.stringify({ assigneeId }),
  });
}

export async function resolveTicket(ticketId) {
  return apiRequest(`/api/tickets/${encodeURIComponent(ticketId)}/resolve`, { method: "PATCH" });
}

export async function closeTicket(ticketId) {
  return apiRequest(`/api/tickets/${encodeURIComponent(ticketId)}/close`, { method: "PATCH" });
}

export async function deleteTicket(ticketId) {
  return apiRequest(`/api/tickets/${encodeURIComponent(ticketId)}`, { method: "DELETE" });
}

export async function getReportSchedules() {
  const data = await apiRequest("/api/reports/schedules");
  return Array.isArray(data) ? data : data.schedules || [];
}

export async function getReportEmailDeliveries() {
  const data = await apiRequest("/api/reports/deliveries");
  return Array.isArray(data) ? data : data.deliveries || [];
}

export async function createReportSchedule(schedule) {
  return apiRequest("/api/reports/schedules", {
    method: "POST",
    body: JSON.stringify(schedule),
  });
}

export async function deleteReportSchedule(scheduleId) {
  return apiRequest(`/api/reports/schedules/${encodeURIComponent(scheduleId)}`, {
    method: "DELETE",
  });
}

// Update user permissions
export async function updateUserPermissions(userId, permissions) {
  return apiRequest(
    `/api/users/${encodeURIComponent(userId)}/permissions`,
    {
      method: "PUT",
      body: JSON.stringify({ permissions }),
    }
  );
}

// Get logged-in user
export function getStoredUser() {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    const stored = sessionStorage.getItem(STORAGE_KEY);

    if (!token || !stored) return null;

    return JSON.parse(stored);
  } catch {
    logout();
    return null;
  }
}

// Get authentication token
export function getAuthToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

// Refresh logged-in user details
export async function refreshCurrentUser() {
  const user = await apiRequest("/api/auth/me");
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  return user;
}

export async function updateCurrentProfile(profile) {
  const updated = await apiRequest("/api/auth/me", {
    method: "PATCH",
    body: JSON.stringify(profile),
  });
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated;
}

export async function changeCurrentPassword({ currentPassword, newPassword }) {
  return apiRequest("/api/auth/me/password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

// Common API request function
export async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || "API request failed.");
  }

  return data;
}

// Logout
export function logout() {
  sessionStorage.removeItem(STORAGE_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
}
