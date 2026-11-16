import { useState, useEffect } from "react";
import {
  approveAccountRequest,
  getAccountRequests,
  rejectAccountRequest,
  getUsers,
  createUser,
  deleteUser,
  updateUserPermissions,
  getDashboard,
} from "../auth/authService.js";
import ReportsPage from "./ReportsPage.jsx";
import ProjectManagementPage from "./ProjectManagementPage.jsx";
import WorkspacePage from "./WorkspacePage.jsx";
import "./Dashboard.css";

const PERMISSION_GROUPS = [
  {
    title: "Dashboard",
    permissions: [{ key: "dashboard.view", label: "View Dashboard" }],
  },
  {
    title: "Projects",
    permissions: [
      { key: "projects.view", label: "View Projects" },
      { key: "projects.create", label: "Create Projects" },
      { key: "projects.edit", label: "Edit Projects" },
      { key: "projects.delete", label: "Delete Projects" },
    ],
  },
  {
    title: "Tasks",
    permissions: [
      { key: "tasks.view", label: "View Tasks" },
      { key: "tasks.create", label: "Create Tasks" },
      { key: "tasks.edit", label: "Edit Tasks" },
      { key: "tasks.delete", label: "Delete Tasks" },
    ],
  },
  {
    title: "Ticket Management",
    permissions: [
      { key: "tickets.view", label: "View Tickets" },
      { key: "tickets.create", label: "Create Tickets" },
      { key: "tickets.assign", label: "Assign Tickets" },
      { key: "tickets.update", label: "Update Tickets" },
      { key: "tickets.resolve", label: "Resolve Tickets" },
      { key: "tickets.close", label: "Close Tickets" },
      { key: "tickets.delete", label: "Delete Tickets" },
    ],
  },
  {
    title: "Reports & Analytics",
    permissions: [
      { key: "reports.view", label: "View Reports & Analytics" },
      { key: "reports.generate", label: "Generate Reports" },
      { key: "reports.export", label: "Export Excel, PDF and CSV" },
      { key: "reports.schedule", label: "Schedule Email Reports" },
    ],
  },
  {
    title: "User Management",
    permissions: [
      { key: "users.view", label: "View Users" },
      { key: "users.create", label: "Create Users" },
      { key: "users.edit", label: "Edit Users" },
      { key: "users.delete", label: "Delete Users" },
    ],
  },
  {
    title: "Settings",
    permissions: [
      { key: "settings.view", label: "View Settings" },
      { key: "settings.edit", label: "Edit Settings" },
    ],
  },
];

const NAV = [
  { key: "dashboard", label: "Dashboard", permission: "dashboard.view" },
  { key: "projects", label: "Projects", permission: "projects.view" },
  { key: "project-management", label: "Project setup", permission: "projects.view" },
  { key: "tasks", label: "My tasks", permission: "tasks.view" },
  { key: "tickets", label: "Ticket Management", permission: "tickets.view" },
  { key: "reports", label: "Reports & analytics", permission: "reports.view" },
  { key: "users", label: "Account requests", superUserOnly: true },
  { key: "user-management", label: "User Management", superUserOnly: true },
  { key: "permissions", label: "User permissions", superUserOnly: true },
  { key: "settings", label: "Settings", alwaysVisible: true },
];

const fmtDate = (iso) => {
  if (!iso) return "—";
  const date = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
};

const daysLeft = (iso) => {
  if (!iso) return Infinity;
  const target = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(target.getTime())) return Infinity;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target - today) / 86400000);
};

const statusClass = (s) => "tag tag--" + s.toLowerCase().replace(/\s+/g, "-");
const canUser = (user, permission) => user.role === "Super User" || (user.permissions || []).includes(permission);

/* ---------- Account requests ---------- */
function AccountRequests({ user }) {
  const [requests, setRequests] = useState([]);
  const [passwords, setPasswords] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function refreshRequests() {
    setError("");
    try {
      const data = await getAccountRequests();
      setRequests(Array.isArray(data) ? data : data.requests || []);
    } catch (err) {
      setError(err.message || "Could not load account enquiries.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refreshRequests();
  }, []);

  async function reviewRequest(request, approve) {
    setError("");
    setNotice("");

    try {
      if (approve) {
        const password = passwords[request.id] ?? "";

        if (password.length < 12 || password.length > 72) {
          throw new Error("Set a temporary password between 12 and 72 characters.");
        }

        await approveAccountRequest(user.token, request.id, password);
        setPasswords((current) => ({ ...current, [request.id]: "" }));
        setNotice(`Account created for ${request.name}. Share the temporary password securely.`);
      } else {
        await rejectAccountRequest(user.token, request.id);
        setNotice(`Enquiry from ${request.name} was declined.`);
      }

      await refreshRequests();
    } catch (err) {
      setError(err.message || "Could not review this enquiry.");
    }
  }

  return (
    <section className="panel panel--wide">
      <div className="panel__head">
        <h2>Pending account enquiries</h2>
        <button className="btn" onClick={refreshRequests} disabled={loading}>Refresh</button>
      </div>

      {error && <p className="account-request__message account-request__message--error" role="alert">{error}</p>}
      {notice && <p className="account-request__message account-request__message--success" role="status">{notice}</p>}

      {loading ? (
        <p className="empty">Loading enquiries...</p>
      ) : requests.length === 0 ? (
        <p className="empty">There are no pending account enquiries.</p>
      ) : (
        <ul className="account-requests">
          {requests.map((request) => (
            <li className="account-request" key={request.id}>
              <div className="account-request__details">
                <h3>{request.name}</h3>
                <p><strong>Username:</strong> {request.username}</p>
                <p><strong>Email:</strong> {request.email}</p>
                <p className="muted">Received {new Date(request.submittedAt).toLocaleString()}</p>
              </div>

              <div className="account-request__actions">
                <label className="field">
                  <span>Temporary password (12-72 characters)</span>
                  <input
                    type="password"
                    autoComplete="new-password"
                    maxLength={72}
                    value={passwords[request.id] ?? ""}
                    onChange={(event) =>
                      setPasswords((current) => ({ ...current, [request.id]: event.target.value }))
                    }
                  />
                </label>

                <div className="account-request__buttons">
                  <button className="btn btn--primary" onClick={() => reviewRequest(request, true)}>
                    Approve and create account
                  </button>
                  <button className="btn" onClick={() => reviewRequest(request, false)}>
                    Decline
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <p className="account-request__note">
        New accounts are created as Project Leads. The applicant is not emailed automatically; share the temporary password securely.
      </p>
    </section>
  );
}


/* ---------- User management ---------- */
function UserManagement() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
    role: "Team Member",
  });

  async function loadUsers() {
    setError("");
    try {
      const data = await getUsers();
      setUsers(Array.isArray(data) ? data : data.users || []);
    } catch (err) {
      setError(err.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const filteredUsers = users.filter((item) => {
    const term = search.toLowerCase();
    return (
      (item.name || "").toLowerCase().includes(term) ||
      (item.username || "").toLowerCase().includes(term) ||
      (item.role || "").toLowerCase().includes(term)
    );
  });

  function updateField(event) {
    setForm((current) => ({
      ...current,
      [event.target.name]: event.target.value,
    }));
  }

  async function handleCreate(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");

    try {
      await createUser(form);
      setForm({
        name: "",
        username: "",
        email: "",
        password: "",
        role: "Team Member",
      });
      setShowForm(false);
      setNotice("User created successfully.");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Could not create user.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item) {
    if (item.role === "Super User") return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${item.name || item.username}?`
    );

    if (!confirmed) return;

    setError("");
    setNotice("");

    try {
      await deleteUser(item.id);
      setNotice("User deleted successfully.");
      await loadUsers();
    } catch (err) {
      setError(err.message || "Could not delete user.");
    }
  }

  return (
    <section className="panel panel--wide user-permissions-panel">
      <div className="panel__head">
        <div>
          <h2>User Management</h2>
          <p className="muted">Create, search and manage user accounts.</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => setShowForm((current) => !current)}
        >
          {showForm ? "Cancel" : "+ Create User"}
        </button>
      </div>

      {error && (
        <p className="account-request__message account-request__message--error" role="alert">
          {error}
        </p>
      )}

      {notice && (
        <p className="account-request__message account-request__message--success" role="status">
          {notice}
        </p>
      )}

      {showForm && (
        <form className="permission-group" onSubmit={handleCreate}>
          <h3>Create New User</h3>

          <label className="field">
            <span>Full name</span>
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              required
            />
          </label>

          <label className="field">
            <span>Username</span>
            <input
              name="username"
              value={form.username}
              onChange={updateField}
              required
            />
          </label>

          <label className="field">
            <span>Email address</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={updateField}
              required
            />
          </label>

          <label className="field">
            <span>Temporary password (12-72 characters)</span>
            <input
              name="password"
              type="password"
              minLength={12}
              maxLength={72}
              autoComplete="new-password"
              value={form.password}
              onChange={updateField}
              required
            />
          </label>

          <label className="field">
            <span>Role</span>
            <select name="role" value={form.role} onChange={updateField}>
              <option value="Super User">Super User</option>
              <option value="Admin">Admin</option>
              <option value="Project Lead">Project Lead</option>
              <option value="Team Member">Team Member</option>
            </select>
          </label>
          {form.role === "Super User" && <p className="muted">Super Users have full access to all areas and user administration.</p>}

          <button className="btn btn--primary" type="submit" disabled={saving}>
            {saving ? "Creating..." : "Create User"}
          </button>
        </form>
      )}

      <label className="field">
        <span>Search users</span>
        <input
          type="search"
          placeholder="Search by name, username or role"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </label>

      {loading ? (
        <p className="empty">Loading users...</p>
      ) : filteredUsers.length === 0 ? (
        <p className="empty">No users found.</p>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Username</th>
                <th>Role</th>
                <th>Permissions</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((item) => (
                <tr key={item.id}>
                  <td><strong>{item.name || "—"}</strong></td>
                  <td>{item.username}</td>
                  <td>{item.role}</td>
                  <td>{item.role === "Super User" ? "Full access" : (item.permissions || []).length}</td>
                  <td>
                    {item.role === "Super User" ? (
                      <span className="muted">Protected</span>
                    ) : (
                      <button
                        className="btn"
                        onClick={() => handleDelete(item)}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}


/* ---------- User permissions ---------- */
function UserPermissions() {
  const [users, setUsers] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadUsers() {
    setError("");

    try {
      const data = await getUsers();
      const list = Array.isArray(data) ? data : data.users || [];

      setUsers(list);

      if (selectedId) {
        const selected = list.find((item) => String(item.id) === String(selectedId));
        if (selected) {
          setSelectedPermissions(selected.permissions || []);
        }
      } else {
        const firstUser = list.find((item) => item.role !== "Super User");
        if (firstUser) {
          setSelectedId(String(firstUser.id));
          setSelectedPermissions(firstUser.permissions || []);
        }
      }
    } catch (err) {
      setError(err.message || "Could not load users.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  const selectedUser = users.find((item) => String(item.id) === String(selectedId));
  const isSuperUser = selectedUser?.role === "Super User";

  function togglePermission(key) {
    setSelectedPermissions((current) =>
      current.includes(key)
        ? current.filter((permission) => permission !== key)
        : [...current, key]
    );
  }

  function selectAllPermissions() {
    setSelectedPermissions(
      PERMISSION_GROUPS.flatMap((group) =>
        group.permissions.map((permission) => permission.key)
      )
    );
  }

  function clearPermissions() {
    setSelectedPermissions([]);
  }

  async function savePermissions() {
    if (!selectedUser || isSuperUser) return;

    setSaving(true);
    setError("");
    setNotice("");

    try {
      const result = await updateUserPermissions(selectedUser.id, selectedPermissions);
      const updatedUser = result.user || result;

      setUsers((current) =>
        current.map((item) =>
          item.id === selectedUser.id
            ? { ...item, ...updatedUser, permissions: updatedUser.permissions || selectedPermissions }
            : item
        )
      );

      setNotice(`Permissions updated successfully for ${selectedUser.name || selectedUser.username}.`);
    } catch (err) {
      setError(err.message || "Could not save permissions.");
    } finally {
      setSaving(false);
    }
  }

  function handleUserChange(id) {
    setSelectedId(id);
    const selected = users.find((item) => String(item.id) === String(id));
    setSelectedPermissions(selected?.permissions || []);
    setError("");
    setNotice("");
  }

  return (
    <section className="panel panel--wide">
      <div className="panel__head">
        <div>
          <h2>User permission management</h2>
          <p className="muted">Grant or revoke access to individual modules and actions.</p>
        </div>
        <button className="btn" onClick={loadUsers} disabled={loading || saving}>Refresh users</button>
      </div>

      {error && <p className="account-request__message account-request__message--error" role="alert">{error}</p>}
      {notice && <p className="account-request__message account-request__message--success" role="status">{notice}</p>}

      {loading ? (
        <p className="empty">Loading users...</p>
      ) : users.filter((item) => item.role !== "Super User").length === 0 ? (
        <p className="empty">No other user accounts are available yet.</p>
      ) : (
        <>
          <label className="field">
            <span>Select user</span>
            <select value={selectedId} onChange={(event) => handleUserChange(event.target.value)}>
              {users.filter((item) => item.role !== "Super User").map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name || item.username} — {item.role}
                </option>
              ))}
            </select>
          </label>

          {selectedUser && (
            <>
              <div className="permission-user-info">
                <p><strong>Name:</strong> {selectedUser.name}</p>
                <p><strong>Username:</strong> {selectedUser.username}</p>
                <p><strong>Role:</strong> {selectedUser.role}</p>
                <p><strong>Granted permissions:</strong> {selectedPermissions.length}</p>
              </div>

              <div className="permission-actions">
                <button className="btn" onClick={selectAllPermissions}>Grant all</button>
                <button className="btn" onClick={clearPermissions}>Revoke all</button>
              </div>

              {PERMISSION_GROUPS.map((group) => (
                <div className="permission-group" key={group.title}>
                  <h3>{group.title}</h3>

                  <div className="permission-list">
                    {group.permissions.map((permission) => (
                      <label className="permission-item" key={permission.key}>
                        <input
                          type="checkbox"
                          checked={selectedPermissions.includes(permission.key)}
                          onChange={() => togglePermission(permission.key)}
                        />
                        <span>{permission.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ))}

              <div className="permission-save">
                <button
                  className="btn btn--primary"
                  onClick={savePermissions}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save permissions"}
                </button>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}

/* ---------- Small components ---------- */
function Stat({ label, value, note, tone }) {
  return (
    <div className={`stat ${tone ? "stat--" + tone : ""}`}>
      <p className="stat__value">{value}</p>
      <p className="stat__label">{label}</p>
      {note && <p className="stat__note">{note}</p>}
    </div>
  );
}

function ProgressBar({ value, status }) {
  return (
    <div
      className="bar"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        className={`bar__fill bar__fill--${status.toLowerCase().replace(/\s+/g, "-")}`}
        style={{ width: `${value}%` }}
      />
    </div>
  );
}

function DashboardHome({ user, query, filter, onNavigate, onFilter }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getDashboard()
      .then((result) => {
        if (active) setData(result);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load the dashboard.");
      });
    return () => { active = false; };
  }, []);

  if (error) {
    return <section className="panel"><h2>Dashboard unavailable</h2><p className="empty" role="alert">{error}</p></section>;
  }
  if (!data) return <section className="panel"><p className="empty">Loading dashboard...</p></section>;

  const projects = (data.projects || []).filter((project) => {
    if (filter !== "All" && project.status !== filter) return false;
    return !query.trim() || project.name.toLowerCase().includes(query.trim().toLowerCase());
  });
  const tasks = data.tasks || [];
  const workload = data.workload || [];
  const activity = data.activity || [];
  const totals = data.totals || {};
  const maxLoad = Math.max(1, ...workload.map((item) => item.open));
  const atRisk = (data.projects || []).filter((project) => ["At risk", "Delayed"].includes(project.status));
  const dueThisWeek = tasks.filter((task) => daysLeft(task.due) >= 0 && daysLeft(task.due) <= 7).length;
  return (
    <>
      {atRisk.length > 0 && (
        <section className="attention" aria-label="Projects needing attention">
          <h2 className="attention__title">{atRisk.length} projects need attention</h2>
          <ul className="attention__list">
            {atRisk.map((project) => (
              <li key={project.id}>
                <span className={statusClass(project.status)}>{project.status}</span>
                <strong>{project.name}</strong>
                <span className="muted">{daysLeft(project.due) < 0 ? `${Math.abs(daysLeft(project.due))} days past due` : `due in ${daysLeft(project.due)} days`}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <section className="stats" aria-label="Summary">
        <Stat label="Projects" value={totals.projects || 0} note={`${totals.active || 0} active`} />
        <Stat label="Open tasks" value={totals.tasksOpen || 0} note="across accessible projects" />
        <Stat label="Due this week" value={dueThisWeek} note="assigned tasks" />
        <Stat label="Overdue projects" value={totals.overdue || 0} tone={totals.overdue ? "alert" : undefined} />
      </section>
      <div className="grid">
        <section className="panel panel--wide">
          <div className="panel__head">
            <h2>Projects</h2>
            <div className="chips" role="group" aria-label="Filter by status">
              {["All", "On track", "At risk", "Delayed", "Completed"].map((status) => (
                <button key={status} className={`chip ${filter === status ? "is-on" : ""}`} aria-pressed={filter === status} onClick={() => onFilter(status)}>{status}</button>
              ))}
            </div>
          </div>
          {projects.length === 0 ? <p className="empty">No projects match this filter.</p> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Project</th><th>Lead</th><th>Status</th><th>Progress</th><th>Due</th></tr></thead>
                <tbody>{projects.map((project) => (
                  <tr key={project.id}>
                    <td><strong>{project.name}</strong><span className="muted block">{project.done} of {project.tasks} tasks done</span></td>
                    <td>{project.lead || "Unassigned"}</td>
                    <td><span className={statusClass(project.status)}>{project.status}</span></td>
                    <td className="progress-cell"><ProgressBar value={project.progress} status={project.status} /><span className="pct">{project.progress}%</span></td>
                    <td>{fmtDate(project.due)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
        <section className="panel">
          <div className="panel__head"><h2>My tasks</h2><button className="link" onClick={() => onNavigate("tasks")}>View all tasks</button></div>
          {tasks.length === 0 ? <p className="empty">No tasks are assigned to you.</p> : (
            <ul className="tasks">{tasks.slice(0, 5).map((task) => {
              const remaining = daysLeft(task.due);
              return <li key={task.id} className="task"><span aria-hidden="true">•</span><div><span className="task__title">{task.title}</span><span className="muted block">{task.project}</span></div><span className={`due ${remaining <= 0 ? "due--hot" : ""}`}>{remaining < 0 ? "Overdue" : remaining === 0 ? "Today" : fmtDate(task.due)}</span></li>;
            })}</ul>
          )}
        </section>
        {user.role !== "Project Lead" && (
          <section className="panel">
            <div className="panel__head"><h2>Team workload</h2><span className="muted">Open tasks per person</span></div>
            {workload.length === 0 ? <p className="empty">No open task workload.</p> : (
              <ul className="load">{workload.map((item) => <li key={item.name}><span className="load__name">{item.name}</span><span className="load__track"><span className={`load__fill ${item.open >= 12 ? "is-heavy" : ""}`} style={{ width: `${(item.open / maxLoad) * 100}%` }} /></span><span className="load__n">{item.open}</span></li>)}</ul>
            )}
          </section>
        )}
        <section className="panel">
          <div className="panel__head"><h2>Recent ticket activity</h2></div>
          {activity.length === 0 ? <p className="empty">No ticket activity yet.</p> : (
            <ul className="feed">{activity.map((item) => <li key={item.id}><p><strong>{item.who}</strong> {item.what} <em>{item.target}</em></p><span className="muted">{new Date(item.timestamp).toLocaleString()}</span></li>)}</ul>
          )}
        </section>
      </div>
    </>
  );
}

function Sidebar({ user, active, onNavigate, onLogout }) {
  const permissions = user.permissions || [];
  const isSuperUser = user.role === "Super User";
  const initials = (user.name || user.username || "U")
    .split(" ")
    .map((word) => word[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const visibleNav = NAV.filter((item) => {
    if (item.superUserOnly) return isSuperUser;
    if (isSuperUser) return true;
    return permissions.includes(item.permission);
  });

  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand__mark" aria-hidden="true">C</span>
        <span className="brand__name">Connect Projects</span>
      </div>

      <nav aria-label="Main">
        <ul className="nav">
          {visibleNav.map((item) => (
            <li key={item.key}>
              <button
                className={`nav__item ${active === item.key ? "is-active" : ""}`}
                aria-current={active === item.key ? "page" : undefined}
                onClick={() => onNavigate(item.key)}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="sidebar__foot">
        <div className="avatar" aria-hidden="true">{initials}</div>
        <div className="sidebar__who">
          <p className="sidebar__user">{user.name}</p>
          <p className="sidebar__role">{user.role}</p>
        </div>
        <button className="sidebar__logout" onClick={onLogout}>Log out</button>
      </div>
    </aside>
  );
}

/* ---------- Main page ---------- */
export default function Dashboard({ user, onLogout, onUserUpdate }) {
  const role = user.role;
  const permissions = user.permissions || [];
  const isSuperUser = role === "Super User";

  const visibleNav = NAV.filter((item) => {
    if (item.superUserOnly) return isSuperUser;
    if (item.alwaysVisible) return true;
    return isSuperUser || permissions.includes(item.permission);
  });

  const firstPage = visibleNav[0]?.key || "no-access";

  const [active, setActive] = useState(firstPage);
  const [filter, setFilter] = useState("All");
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!visibleNav.some((item) => item.key === active)) {
      setActive(firstPage);
    }
  }, [active, firstPage]);

  const pageTitles = {
    dashboard: "Dashboard",
    projects: "Projects",
    "project-management": "Project setup",
    tasks: "My tasks",
    tickets: "Ticket Management",
    reports: "Reports & analytics",
    users: "Account requests",
    permissions: "User permissions",
    settings: "Settings",
    "no-access": "Access not assigned",
    "user-management": "User Management",
  };

  return (
    <div className="shell">
      <Sidebar user={user} active={active} onNavigate={setActive} onLogout={onLogout} />

      <div className="main">
        <header className="topbar">
          <div>
            <h1 className="topbar__title">{pageTitles[active] || "Dashboard"}</h1>
            <p className="topbar__sub">{new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric" })}</p>
          </div>

          {active === "dashboard" && (
            <div className="topbar__tools">
              <label className="search">
                <span className="sr-only">Search projects</span>
                <input
                  type="search"
                  placeholder="Search projects"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
              {canUser(user, "projects.create") && <button className="btn btn--primary" onClick={() => setActive("projects")}>New project</button>}
            </div>
          )}
        </header>

        <main className="content">
          {active === "users" && isSuperUser ? (
  <AccountRequests user={user} />
) : active === "user-management" && isSuperUser ? (
  <UserManagement />
) : active === "permissions" && isSuperUser ? (
            <UserPermissions />
          ) : active === "reports" ? (
            <ReportsPage user={user} />
          ) : active === "project-management" ? (
            <ProjectManagementPage user={user} />
          ) : active === "dashboard" ? (
            <DashboardHome user={user} query={query} filter={filter} onNavigate={setActive} onFilter={setFilter} />
          ) : active === "no-access" ? (
            <section className="panel">
              <h2>No access assigned</h2>
              <p className="empty">Please contact your Super User to request access to a module.</p>
            </section>
          ) : ["tickets", "settings", "tasks", "projects"].includes(active) ? (
            <WorkspacePage section={active} user={user} onUserUpdate={onUserUpdate} />
          ) : <section className="panel"><h2>Page not found</h2></section>}
        </main>
      </div>
    </div>
  );
}
