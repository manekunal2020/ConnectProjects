import { useEffect, useState } from "react";
import {
  assignTicket,
  closeTicket,
  changeCurrentPassword,
  createProject,
  createTask,
  createTicket,
  deleteProject,
  deleteTask,
  deleteTicket,
  getAssignees,
  getProjects,
  getTaskAssignees,
  getTasks,
  getTickets,
  resolveTicket,
  updateCurrentProfile,
  updateProject,
  updateTask,
  updateTicket,
} from "../auth/authService.js";

const STATUSES = ["Open", "In Progress", "Pending", "Resolved", "Closed"];
const TASK_STATUSES = ["To do", "In progress", "Completed"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

function can(user, permission) {
  return user.role === "Super User" || (user.permissions || []).includes(permission);
}

function PageMessage({ error, notice }) {
  return (
    <>
      {error && <p className="account-request__message account-request__message--error" role="alert">{error}</p>}
      {notice && <p className="account-request__message account-request__message--success" role="status">{notice}</p>}
    </>
  );
}

export default function WorkspacePage({ section, user, onUserUpdate }) {
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [assignees, setAssignees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [projectForm, setProjectForm] = useState({ name: "", description: "", status: "On track", due: "", leadId: String(user.id || "") });
  const [taskForm, setTaskForm] = useState({ title: "", projectId: "", assigneeId: "", due: "", priority: "Medium", status: "To do" });
  const [ticketForm, setTicketForm] = useState({ subject: "", description: "", category: "General", priority: "Medium", assigneeId: "" });
  const [profileForm, setProfileForm] = useState({ name: user.name || "", email: user.email || "" });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [editingProjectId, setEditingProjectId] = useState("");

  const canAssign = can(user, "tickets.assign");
  const canAssignTasks = user.role === "Super User" || user.role === "Admin";

  async function load() {
    setError("");
    setLoading(true);
    try {
      if (section === "projects") {
        setProjects(await getProjects());
      } else if (section === "tasks") {
        const [taskRows, projectRows, people] = await Promise.all([
          getTasks(),
          getProjects(),
          canAssignTasks && (can(user, "tasks.create") || can(user, "tasks.edit"))
            ? getTaskAssignees()
            : Promise.resolve([]),
        ]);
        setTasks(taskRows);
        setProjects(projectRows);
        setAssignees(people);
      } else if (section === "tickets") {
        const [ticketRows, people] = await Promise.all([
          getTickets(),
          canAssign ? getAssignees() : Promise.resolve([]),
        ]);
        setTickets(ticketRows);
        setAssignees(people);
      }
    } catch (requestError) {
      setError(requestError.message || `Could not load ${section}.`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [section]);

  async function submitProject(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    const body = {
      ...projectForm,
      leadId: projectForm.leadId ? Number(projectForm.leadId) : null,
      due: projectForm.due || null,
    };
    try {
      if (editingProjectId) await updateProject(editingProjectId, body);
      else await createProject(body);
      setProjectForm({ name: "", description: "", status: "On track", due: "", leadId: String(user.id || "") });
      setEditingProjectId("");
      setNotice(editingProjectId ? "Project updated." : "Project created.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not save the project.");
    } finally {
      setSaving(false);
    }
  }

  function editProject(project) {
    setEditingProjectId(String(project.id));
    setProjectForm({
      name: project.name,
      description: project.description || "",
      status: project.status,
      due: project.due || "",
      leadId: "",
    });
  }

  async function removeProject(project) {
    if (!window.confirm(`Delete "${project.name}"?`)) return;
    try {
      await deleteProject(project.id);
      setNotice("Project deleted.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not delete the project.");
    }
  }

  async function submitTask(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createTask({
        ...taskForm,
        projectId: taskForm.projectId ? Number(taskForm.projectId) : null,
        assigneeId: taskForm.assigneeId ? Number(taskForm.assigneeId) : null,
        due: taskForm.due || null,
      });
      setTaskForm({ title: "", projectId: "", assigneeId: "", due: "", priority: "Medium", status: "To do" });
      setNotice("Task created.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not create the task.");
    } finally {
      setSaving(false);
    }
  }

  async function changeTaskStatus(task, status) {
    setError("");
    try {
      await updateTask(task.id, {
        title: task.title,
        projectId: projects.find((project) => project.name === task.project)?.id || null,
        assigneeId: task.assigneeId || null,
        due: task.due || null,
        priority: task.priority || "Medium",
        status,
      });
      setNotice("Task status updated.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not update the task.");
    }
  }

  async function changeTaskAssignee(task, assigneeId) {
    setError("");
    setNotice("");
    try {
      await updateTask(task.id, {
        title: task.title,
        projectId: projects.find((project) => project.name === task.project)?.id || null,
        assigneeId: assigneeId ? Number(assigneeId) : null,
        due: task.due || null,
        priority: task.priority || "Medium",
        status: task.status,
      });
      setNotice("Task assignment updated.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not update the task assignment.");
    }
  }

  async function removeTask(task) {
    if (!window.confirm(`Delete "${task.title}"?`)) return;
    try {
      await deleteTask(task.id);
      setNotice("Task deleted.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not delete the task.");
    }
  }

  async function submitTicket(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await createTicket({
        ...ticketForm,
        assigneeId: ticketForm.assigneeId ? Number(ticketForm.assigneeId) : null,
      });
      setTicketForm({ subject: "", description: "", category: "General", priority: "Medium", assigneeId: "" });
      setNotice("Ticket created.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not create the ticket.");
    } finally {
      setSaving(false);
    }
  }

  async function changeTicketStatus(ticket, status) {
    setError("");
    try {
      if (status === "Resolved") await resolveTicket(ticket.id);
      else if (status === "Closed") await closeTicket(ticket.id);
      else await updateTicket(ticket.id, { status });
      setNotice("Ticket status updated.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not update the ticket.");
    }
  }

  async function changeAssignee(ticketId, assigneeId) {
    setError("");
    try {
      await assignTicket(ticketId, Number(assigneeId));
      setNotice("Ticket assignment updated.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not assign the ticket.");
    }
  }

  async function removeTicket(ticket) {
    if (!window.confirm(`Delete ticket ${ticket.ticketNumber}?`)) return;
    try {
      await deleteTicket(ticket.id);
      setNotice("Ticket deleted.");
      await load();
    } catch (requestError) {
      setError(requestError.message || "Could not delete the ticket.");
    }
  }

  async function submitProfile(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const updated = await updateCurrentProfile(profileForm);
      onUserUpdate(updated);
      setProfileForm({ name: updated.name, email: updated.email });
      setNotice("Profile settings saved.");
    } catch (requestError) {
      setError(requestError.message || "Could not save your profile.");
    } finally {
      setSaving(false);
    }
  }

  async function submitPasswordChange(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setError("New password and confirmation do not match.");
      setSaving(false);
      return;
    }
    try {
      const response = await changeCurrentPassword(passwordForm);
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setNotice(response.message || "Password changed successfully.");
    } catch (requestError) {
      setError(requestError.message || "Could not change your password.");
    } finally {
      setSaving(false);
    }
  }

  if (section === "settings") {
    return (
      <section className="panel panel--wide workspace-panel">
        <div className="panel__head"><div><h2>Settings</h2><p className="muted">Manage your profile and password.</p></div></div>
        <PageMessage error={error} notice={notice} />
        <div className="settings-sections">
          <form className="workspace-form workspace-form--narrow" onSubmit={submitProfile}>
            <h3>Profile</h3>
            <label className="field"><span>Full name</span><input required maxLength={120} value={profileForm.name} onChange={(event) => setProfileForm({ ...profileForm, name: event.target.value })} /></label>
            <label className="field"><span>Email</span><input type="email" required maxLength={254} value={profileForm.email} onChange={(event) => setProfileForm({ ...profileForm, email: event.target.value })} /></label>
            <button className="btn btn--primary" disabled={saving}>{saving ? "Saving..." : "Save profile"}</button>
          </form>
          <form className="workspace-form workspace-form--narrow workspace-form--password" onSubmit={submitPasswordChange}>
            <h3>Change password</h3>
            <label className="field"><span>Current password</span><input type="password" autoComplete="current-password" required maxLength={72} value={passwordForm.currentPassword} onChange={(event) => setPasswordForm({ ...passwordForm, currentPassword: event.target.value })} /></label>
            <label className="field"><span>New password (12-72 characters)</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={passwordForm.newPassword} onChange={(event) => setPasswordForm({ ...passwordForm, newPassword: event.target.value })} /></label>
            <label className="field"><span>Confirm new password</span><input type="password" autoComplete="new-password" required minLength={12} maxLength={72} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm({ ...passwordForm, confirmPassword: event.target.value })} /></label>
            <button className="btn btn--primary" disabled={saving}>{saving ? "Updating..." : "Change password"}</button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="panel panel--wide workspace-panel">
      <div className="panel__head">
        <div><h2>{section === "projects" ? "Projects" : section === "tasks" ? "Tasks" : "Ticket management"}</h2><p className="muted">Records are stored in PostgreSQL and scoped by your account permissions.</p></div>
        <button className="btn" onClick={load} disabled={loading}>Refresh</button>
      </div>
      <PageMessage error={error} notice={notice} />
      {loading ? <p className="empty">Loading {section}...</p> : (
        <>
          {section === "projects" && (
            <>
              {(editingProjectId ? can(user, "projects.edit") : can(user, "projects.create")) && (
                <form className="workspace-form" onSubmit={submitProject}>
                  <label className="field"><span>Project name</span><input required maxLength={160} value={projectForm.name} onChange={(event) => setProjectForm({ ...projectForm, name: event.target.value })} /></label>
                  <label className="field"><span>Status</span><select value={projectForm.status} onChange={(event) => setProjectForm({ ...projectForm, status: event.target.value })}>{["On track", "At risk", "Delayed", "Completed"].map((item) => <option key={item}>{item}</option>)}</select></label>
                  <label className="field"><span>Due date</span><input type="date" value={projectForm.due} onChange={(event) => setProjectForm({ ...projectForm, due: event.target.value })} /></label>
                  <label className="field workspace-form__wide"><span>Description</span><textarea rows="2" maxLength={5000} value={projectForm.description} onChange={(event) => setProjectForm({ ...projectForm, description: event.target.value })} /></label>
                  <div className="workspace-form__actions"><button className="btn btn--primary" disabled={saving}>{saving ? "Saving..." : editingProjectId ? "Update project" : "Create project"}</button>{editingProjectId && <button className="btn" type="button" onClick={() => { setEditingProjectId(""); setProjectForm({ name: "", description: "", status: "On track", due: "", leadId: String(user.id || "") }); }}>Cancel</button>}</div>
                </form>
              )}
              {projects.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Project</th><th>Lead</th><th>Status</th><th>Progress</th><th>Due</th><th>Tasks</th><th>Actions</th></tr></thead><tbody>{projects.map((project) => <tr key={project.id}><td><strong>{project.name}</strong><span className="muted block">{project.description}</span></td><td>{project.lead}</td><td>{project.status}</td><td>{project.progress}%</td><td>{project.due || "—"}</td><td>{project.done}/{project.tasks}</td><td>{can(user, "projects.edit") && <button className="btn" onClick={() => editProject(project)}>Edit</button>} {can(user, "projects.delete") && <button className="btn" onClick={() => removeProject(project)}>Delete</button>}</td></tr>)}</tbody></table></div> : <p className="empty">No projects are available.</p>}
            </>
          )}

          {section === "tasks" && (
            <>
              {can(user, "tasks.create") && <form className="workspace-form" onSubmit={submitTask}>
                <label className="field"><span>Task title</span><input required maxLength={240} value={taskForm.title} onChange={(event) => setTaskForm({ ...taskForm, title: event.target.value })} /></label>
                <label className="field"><span>Project</span><select value={taskForm.projectId} onChange={(event) => setTaskForm({ ...taskForm, projectId: event.target.value })}><option value="">No project</option>{projects.map((project) => <option value={project.id} key={project.id}>{project.name}</option>)}</select></label>
                <label className="field"><span>Due date</span><input type="date" value={taskForm.due} onChange={(event) => setTaskForm({ ...taskForm, due: event.target.value })} /></label>
                <label className="field"><span>Priority</span><select value={taskForm.priority} onChange={(event) => setTaskForm({ ...taskForm, priority: event.target.value })}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
                {canAssignTasks && <label className="field"><span>Assign to</span><select value={taskForm.assigneeId} onChange={(event) => setTaskForm({ ...taskForm, assigneeId: event.target.value })}><option value="">Unassigned</option>{assignees.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>}
                <button className="btn btn--primary" disabled={saving}>{saving ? "Saving..." : "Create task"}</button>
              </form>}
              {tasks.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Task</th><th>Project</th><th>Assignee</th><th>Priority</th><th>Due</th><th>Status</th><th>Action</th></tr></thead><tbody>{tasks.map((task) => <tr key={task.id}><td>{task.title}</td><td>{task.project || "—"}</td><td>{canAssignTasks && can(user, "tasks.edit") ? <select aria-label={`Assignee for ${task.title}`} value={task.assigneeId || ""} onChange={(event) => changeTaskAssignee(task, event.target.value)}><option value="">Unassigned</option>{assignees.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select> : task.assignee || "Unassigned"}</td><td>{task.priority}</td><td>{task.due || "—"}</td><td>{can(user, "tasks.edit") ? <select aria-label={`Status for ${task.title}`} value={task.status} onChange={(event) => changeTaskStatus(task, event.target.value)}>{TASK_STATUSES.map((status) => <option key={status}>{status}</option>)}</select> : task.status}</td><td>{can(user, "tasks.delete") && <button className="btn" onClick={() => removeTask(task)}>Delete</button>}</td></tr>)}</tbody></table></div> : <p className="empty">No tasks are available.</p>}
            </>
          )}

          {section === "tickets" && (
            <>
              {can(user, "tickets.create") && <form className="workspace-form" onSubmit={submitTicket}>
                <label className="field"><span>Subject</span><input required maxLength={240} value={ticketForm.subject} onChange={(event) => setTicketForm({ ...ticketForm, subject: event.target.value })} /></label>
                <label className="field"><span>Category</span><input maxLength={100} value={ticketForm.category} onChange={(event) => setTicketForm({ ...ticketForm, category: event.target.value })} /></label>
                <label className="field"><span>Priority</span><select value={ticketForm.priority} onChange={(event) => setTicketForm({ ...ticketForm, priority: event.target.value })}>{PRIORITIES.map((item) => <option key={item}>{item}</option>)}</select></label>
                {canAssign && <label className="field"><span>Assignee</span><select value={ticketForm.assigneeId} onChange={(event) => setTicketForm({ ...ticketForm, assigneeId: event.target.value })}><option value="">Unassigned</option>{assignees.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select></label>}
                <label className="field workspace-form__wide"><span>Description</span><textarea rows="2" maxLength={5000} value={ticketForm.description} onChange={(event) => setTicketForm({ ...ticketForm, description: event.target.value })} /></label>
                <button className="btn btn--primary" disabled={saving}>{saving ? "Saving..." : "Create ticket"}</button>
              </form>}
              {tickets.length ? <div className="table-wrap"><table className="table"><thead><tr><th>Ticket</th><th>Subject</th><th>Priority</th><th>Assignee</th><th>Created</th><th>Response SLA</th><th>Resolution SLA</th><th>Status</th><th>Actions</th></tr></thead><tbody>{tickets.map((ticket) => <tr key={ticket.id}><td>{ticket.ticketNumber}</td><td>{ticket.subject}</td><td>{ticket.priority}</td><td>{canAssign ? <select aria-label={`Assignee for ${ticket.ticketNumber}`} value={ticket.assigneeId || ""} onChange={(event) => event.target.value && changeAssignee(ticket.id, event.target.value)}><option value="">Unassigned</option>{assignees.map((person) => <option value={person.id} key={person.id}>{person.name}</option>)}</select> : ticket.assignee || "Unassigned"}</td><td>{new Date(ticket.createdAt).toLocaleDateString()}</td><td>{new Date(ticket.responseDueAt).toLocaleString()}</td><td>{new Date(ticket.resolutionDueAt).toLocaleString()}</td><td>{can(user, "tickets.update") && !["Resolved", "Closed"].includes(ticket.status) ? <select value={ticket.status} onChange={(event) => changeTicketStatus(ticket, event.target.value)}>{STATUSES.filter((status) => !["Resolved", "Closed"].includes(status)).map((status) => <option key={status}>{status}</option>)}</select> : ticket.status}</td><td>{ticket.status !== "Resolved" && ticket.status !== "Closed" && can(user, "tickets.resolve") && <button className="btn" onClick={() => changeTicketStatus(ticket, "Resolved")}>Resolve</button>} {ticket.status === "Resolved" && can(user, "tickets.close") && <button className="btn" onClick={() => changeTicketStatus(ticket, "Closed")}>Close</button>} {can(user, "tickets.delete") && <button className="btn" onClick={() => removeTicket(ticket)}>Delete</button>}</td></tr>)}</tbody></table></div> : <p className="empty">No tickets are available.</p>}
            </>
          )}
        </>
      )}
    </section>
  );
}
