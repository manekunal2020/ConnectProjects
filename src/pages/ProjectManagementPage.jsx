import { useEffect, useMemo, useState } from "react";
import {
  addProjectSubcategory,
  createProjectConfiguration,
  createProjectManagementClient,
  deleteProjectConfiguration,
  getProjectConfiguration,
  getProjectManagementClients,
  getProjectManagementLeads,
  getProjects,
  saveProjectSla,
  updateProject,
} from "../auth/authService.js";
import "./ProjectManagementPage.css";

const DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const STANDARD_PRIORITIES = [
  { name: "Critical", level: 1, color: "#C62828" },
  { name: "High", level: 2, color: "#E65100" },
  { name: "Medium", level: 3, color: "#F2A900" },
  { name: "Low", level: 4, color: "#2E7D32" },
];
const EMPTY_CONFIG = { shifts: [], priorities: [], categories: [], slas: [] };

function hasPermission(user, permission) {
  return user.role === "Super User" || (user.permissions || []).includes(permission);
}

function hoursLabel(value) {
  return value ? String(value).slice(0, 5) : "";
}

export default function ProjectManagementPage({ user }) {
  const [projects, setProjects] = useState([]);
  const [clients, setClients] = useState([]);
  const [leads, setLeads] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [config, setConfig] = useState(EMPTY_CONFIG);
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [configLoading, setConfigLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientIndustry, setClientIndustry] = useState("");
  const [projectForm, setProjectForm] = useState(null);
  const [shiftForm, setShiftForm] = useState({
    name: "",
    days: ["MON", "TUE", "WED", "THU", "FRI"],
    startTime: "09:00",
    endTime: "17:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
  });
  const [priorityForm, setPriorityForm] = useState({ name: "", level: 1, color: "#C62828" });
  const [categoryName, setCategoryName] = useState("");
  const [subcategoryNames, setSubcategoryNames] = useState({});
  const [projectQuery, setProjectQuery] = useState("");
  const [projectStatus, setProjectStatus] = useState("All statuses");

  const project = projects.find((item) => String(item.id) === String(selectedId));
  const canEdit = hasPermission(user, "projects.edit");
  const canCreate = hasPermission(user, "projects.create");
  const filteredProjects = useMemo(() => projects.filter((item) => {
    const query = projectQuery.trim().toLowerCase();
    const manager = item.projectManager?.name || item.lead || "";
    const matchesQuery = !query || `${item.name} ${item.client?.name || ""} ${manager}`.toLowerCase().includes(query);
    return matchesQuery && (projectStatus === "All statuses" || item.status === projectStatus);
  }), [projects, projectQuery, projectStatus]);
  const activeCount = projects.filter((item) => item.active !== false && item.status !== "Completed").length;
  const atRiskCount = projects.filter((item) => ["At risk", "Delayed"].includes(item.status)).length;
  const setupCounts = useMemo(() => [
    { label: "Support shifts", count: config.shifts.length },
    { label: "Priorities", count: config.priorities.length },
    { label: "Categories", count: config.categories.length },
    { label: "SLAs", count: config.slas.length },
  ], [config]);

  async function loadLists() {
    setError("");
    setLoading(true);
    try {
      const [projectRows, clientRows, leadRows] = await Promise.all([
        getProjects(),
        getProjectManagementClients(),
        getProjectManagementLeads(),
      ]);
      setProjects(projectRows);
      setClients(clientRows);
      setLeads(leadRows);
      setSelectedId((current) => current || (projectRows[0] ? String(projectRows[0].id) : ""));
    } catch (requestError) {
      setError(requestError.message || "Could not load project setup.");
    } finally {
      setLoading(false);
    }
  }

  async function loadConfig(projectId) {
    setConfigLoading(true);
    setError("");
    try {
      setConfig(await getProjectConfiguration(projectId));
      return true;
    } catch (requestError) {
      setError(requestError.message || "Could not load project configuration.");
      return false;
    } finally {
      setConfigLoading(false);
    }
  }

  useEffect(() => {
    loadLists();
  }, []);

  useEffect(() => {
    if (selectedId) loadConfig(selectedId);
    else setConfig(EMPTY_CONFIG);
  }, [selectedId]);

  useEffect(() => {
    if (!project) {
      setProjectForm(null);
      return;
    }
    setProjectForm({
      clientId: String(project.client?.id || ""),
      projectManagerId: String(project.projectManager?.id || ""),
      teamLeaderIds: (project.teamLeaders || []).map((leader) => String(leader.id)),
      active: project.active !== false,
    });
  }, [selectedId, projects]);

  async function runMutation(action, successMessage) {
    setSaving(true);
    setError("");
    setNotice("");
    try {
      await action();
      if (!(await loadConfig(selectedId))) return false;
      setNotice(successMessage);
      return true;
    } catch (requestError) {
      setError(requestError.message || "Could not save project configuration.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function saveProjectSetup(event) {
    event.preventDefault();
    if (!project || !projectForm) return;
    setSaving(true);
    setError("");
    setNotice("");
    const body = {
      name: project.name,
      description: project.description || "",
      status: project.status,
      due: project.due || null,
      clientId: projectForm.clientId ? Number(projectForm.clientId) : null,
      teamLeaderIds: projectForm.teamLeaderIds.map(Number),
      active: projectForm.active,
    };
    if (user.role !== "Project Lead" && projectForm.projectManagerId) {
      body.leadId = Number(projectForm.projectManagerId);
      body.projectManagerId = Number(projectForm.projectManagerId);
    }
    try {
      await updateProject(project.id, body);
      setProjects(await getProjects());
      setNotice("Project details saved.");
    } catch (requestError) {
      setError(requestError.message || "Could not save project details.");
    } finally {
      setSaving(false);
    }
  }

  async function addClient(event) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const client = await createProjectManagementClient({ name: clientName, industry: clientIndustry });
      setClients((current) => [...current, client].sort((a, b) => a.name.localeCompare(b.name)));
      setProjectForm((current) => ({ ...current, clientId: String(client.id) }));
      setClientName("");
      setClientIndustry("");
      setNotice("Client added.");
    } catch (requestError) {
      setError(requestError.message || "Could not add client.");
    } finally {
      setSaving(false);
    }
  }

  async function addShift(event) {
    event.preventDefault();
    const saved = await runMutation(() => createProjectConfiguration(project.id, "shifts", {
      name: shiftForm.name,
      daysOfWeek: DAYS.filter((day) => shiftForm.days.includes(day)).join(","),
      startTime: shiftForm.startTime,
      endTime: shiftForm.endTime,
      timezone: shiftForm.timezone,
    }), "Support shift added.");
    if (saved) setShiftForm((current) => ({ ...current, name: "" }));
  }

  async function addPriority(event) {
    event.preventDefault();
    const saved = await runMutation(() => createProjectConfiguration(project.id, "priorities", {
      ...priorityForm,
      level: Number(priorityForm.level),
    }), "Priority added.");
    if (saved) setPriorityForm((current) => ({ ...current, name: "", level: config.priorities.length + 2 }));
  }

  async function addStandardPriorities() {
    for (const priority of STANDARD_PRIORITIES) {
      if (config.priorities.some((item) => item.name.toLowerCase() === priority.name.toLowerCase())) continue;
      if (!(await runMutation(
        () => createProjectConfiguration(project.id, "priorities", priority),
        `${priority.name} priority added.`
      ))) break;
    }
  }

  async function addCategory(event) {
    event.preventDefault();
    const saved = await runMutation(() => createProjectConfiguration(project.id, "categories", { name: categoryName }), "Category added.");
    if (saved) setCategoryName("");
  }

  async function addSubcategory(event, categoryId) {
    event.preventDefault();
    const name = (subcategoryNames[categoryId] || "").trim();
    if (!name) return;
    const saved = await runMutation(() => addProjectSubcategory(project.id, categoryId, name), "Subcategory added.");
    if (saved) setSubcategoryNames((current) => ({ ...current, [categoryId]: "" }));
  }

  async function saveSla(event, priorityId) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const responseMinutes = Number(form.get("responseMinutes"));
    const resolutionMinutes = Number(form.get("resolutionMinutes"));
    if (resolutionMinutes < responseMinutes) {
      setError("Resolution time must be at least the response time.");
      return;
    }
    await runMutation(() => saveProjectSla(project.id, {
      priorityId,
      responseMinutes,
      resolutionMinutes,
      businessHoursOnly: form.get("businessHoursOnly") === "on",
    }), "SLA saved.");
  }

  if (loading) return <section className="panel"><p className="empty">Loading project setup...</p></section>;

  return (
    <section className="panel panel--wide project-management-page">
      <div className="project-overview-heading">
        <div>
          <span className="project-overview-eyebrow">WORKSPACE / PROJECT MANAGEMENT</span>
          <h2>Project overview</h2>
          <p className="muted">Manage client projects, teams, priorities, and delivery from one place.</p>
        </div>
        <button className="btn" type="button" onClick={loadLists} disabled={loading}>Refresh projects</button>
      </div>
      {error && <p className="account-request__message account-request__message--error" role="alert">{error}</p>}
      {notice && <p className="account-request__message account-request__message--success" role="status">{notice}</p>}
      <div className="project-overview-metrics">
        <article><span>Total projects</span><strong>{String(projects.length).padStart(2, "0")}</strong><small>Across your workspace</small></article>
        <article><span>Active projects</span><strong>{String(activeCount).padStart(2, "0")}</strong><small>Currently in progress</small></article>
        <article className={atRiskCount ? "is-at-risk" : ""}><span>Projects at risk</span><strong>{String(atRiskCount).padStart(2, "0")}</strong><small>At risk or delayed</small></article>
        <article><span>Total clients</span><strong>{String(clients.length).padStart(2, "0")}</strong><small>Registered clients</small></article>
        <article><span>Setup items</span><strong>{String(setupCounts.reduce((total, item) => total + item.count, 0)).padStart(2, "0")}</strong><small>For the selected project</small></article>
      </div>
      <div className="project-overview-insight">
        <span className="project-overview-insight__mark" aria-hidden="true">i</span>
        <div><strong>Keep delivery on track</strong><p>Choose a project below to configure its team, support hours, priorities, categories, and SLAs.</p></div>
      </div>
      <section className="project-overview-list" aria-labelledby="all-projects-title">
        <div className="project-overview-list__heading">
          <div><h3 id="all-projects-title">All projects</h3><p className="muted">View and manage projects across your client portfolio.</p></div>
          <span className="project-overview-list__count">{projects.length} projects</span>
        </div>
        <div className="project-overview-toolbar">
          <label className="project-overview-search">
            <span className="sr-only">Search projects</span>
            <input value={projectQuery} onChange={(event) => setProjectQuery(event.target.value)} placeholder="Search projects, clients or managers..." />
          </label>
          <label className="project-overview-status">
            <span className="sr-only">Filter by status</span>
            <select value={projectStatus} onChange={(event) => setProjectStatus(event.target.value)}>
              <option>All statuses</option>
              {[...new Set(projects.map((item) => item.status).filter(Boolean))].map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
        </div>
        {projects.length ? (
          <div className="table-wrap">
            <table className="table project-overview-table">
              <thead><tr><th>PROJECT</th><th>CLIENT</th><th>PROJECT MANAGER</th><th>TEAM LEADERS</th><th>STATUS</th><th>PROGRESS</th><th>DUE DATE</th></tr></thead>
              <tbody>{filteredProjects.map((item) => {
                const progress = Math.min(100, Math.max(0, Number(item.progress) || 0));
                const manager = item.projectManager?.name || item.lead || "Unassigned";
                return (
                  <tr key={item.id} className={String(item.id) === String(selectedId) ? "is-selected" : ""}>
                    <td><button className="project-overview-select" type="button" aria-pressed={String(item.id) === String(selectedId)} onClick={() => setSelectedId(String(item.id))}>{item.name}</button><small className="project-overview-description">{item.description || `Project #${item.id}`}</small></td>
                    <td>{item.client?.name || "Not assigned"}</td>
                    <td>{manager}</td>
                    <td>{(item.teamLeaders || []).length || "—"}</td>
                    <td><span className={`project-overview-status-tag ${["At risk", "Delayed"].includes(item.status) ? "is-risk" : item.status === "Completed" ? "is-complete" : ""}`}>{item.status || "Not set"}</span></td>
                    <td><div className="project-overview-progress"><span><i style={{ width: `${progress}%` }} /></span><small>{progress}%</small></div></td>
                    <td>{item.due || "Not set"}</td>
                  </tr>
                );
              })}</tbody>
            </table>
            {!filteredProjects.length && <p className="empty">No projects match your search or status filter.</p>}
          </div>
        ) : <p className="empty">No projects are available.</p>}
      </section>
      {!projects.length ? (
        <p className="empty">Create a project first, then configure its support team and service settings here.</p>
      ) : (
        <>
          {project && projectForm && (
            <>
              <div className="project-configuration-heading">
                <div><span className="project-overview-eyebrow">PROJECT CONFIGURATION</span><h3>{project.name}</h3></div>
                <span className="project-configuration-client">{project.client?.name || "No client assigned"}</span>
              </div>
              <form className="project-setup-form" onSubmit={saveProjectSetup}>
                <h3>Client and team</h3>
                <label className="field">
                  <span>Client</span>
                  <select value={projectForm.clientId} onChange={(event) => setProjectForm({ ...projectForm, clientId: event.target.value })}>
                    <option value="">Not assigned</option>
                    {clients.map((client) => <option value={client.id} key={client.id}>{client.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span>Project manager</span>
                  <select value={projectForm.projectManagerId} disabled={user.role === "Project Lead"} onChange={(event) => setProjectForm({ ...projectForm, projectManagerId: event.target.value })}>
                    <option value="">Unassigned</option>
                    {project.projectManager && !leads.some((lead) => String(lead.id) === String(project.projectManager.id)) && (
                      <option value={project.projectManager.id}>{project.projectManager.name} (existing assignment)</option>
                    )}
                    {leads.map((lead) => <option value={lead.id} key={lead.id}>{lead.name}</option>)}
                  </select>
                </label>
                <fieldset className="project-setup-form__leaders">
                  <legend>Team leaders</legend>
                  {leads.map((lead) => (
                    <label key={lead.id}>
                      <input type="checkbox" checked={projectForm.teamLeaderIds.includes(String(lead.id))} onChange={(event) => setProjectForm({
                        ...projectForm,
                        teamLeaderIds: event.target.checked
                          ? [...projectForm.teamLeaderIds, String(lead.id)]
                          : projectForm.teamLeaderIds.filter((id) => id !== String(lead.id)),
                      })} />
                      {lead.name}
                    </label>
                  ))}
                  {!leads.length && <span className="muted">No Project Lead accounts are available.</span>}
                </fieldset>
                <label className="project-setup-form__active"><input type="checkbox" checked={projectForm.active} onChange={(event) => setProjectForm({ ...projectForm, active: event.target.checked })} /> Project is active</label>
                {canEdit && <button className="btn btn--primary" disabled={saving}>{saving ? "Saving..." : "Save project setup"}</button>}
              </form>

              {canCreate && (
                <form className="project-client-form" onSubmit={addClient}>
                  <h3>Add a client</h3>
                  <label className="field"><span>Client name</span><input required maxLength={160} value={clientName} onChange={(event) => setClientName(event.target.value)} /></label>
                  <label className="field"><span>Industry (optional)</span><input maxLength={160} value={clientIndustry} onChange={(event) => setClientIndustry(event.target.value)} /></label>
                  <button className="btn" disabled={saving}>Add client</button>
                </form>
              )}

              <div className="project-setup-summary" aria-label="Configuration status">
                {setupCounts.map((item) => <div key={item.label}><strong>{item.count}</strong><span>{item.label}</span></div>)}
              </div>

              <div className="project-setup-tabs" role="tablist" aria-label="Project configuration">
                {["overview", "shifts", "priorities", "categories", "slas"].map((tab) => (
                  <button type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "is-active" : ""} key={tab} onClick={() => setActiveTab(tab)}>
                    {tab === "slas" ? "SLAs" : tab === "shifts" ? "Support hours" : tab === "categories" ? "Categories" : tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </button>
                ))}
              </div>
              {configLoading ? <p className="empty">Loading configuration...</p> : (
                <div className="project-setup-content">
                  {activeTab === "overview" && (
                    <div className="project-setup-overview">
                      <h3>{project.name}</h3>
                      <p className="muted">{project.client?.name || "No client assigned"} · Managed by {project.projectManager?.name || "Unassigned"}</p>
                      <div className="project-setup-bars">
                        {setupCounts.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.count}</strong><i style={{ width: `${Math.min(100, item.count * 20)}%` }} /></div>)}
                      </div>
                      <p className="muted">Add configuration for hours, priorities, categories, and SLAs to complete project setup.</p>
                    </div>
                  )}

                  {activeTab === "shifts" && (
                    <div className="project-setup-section">
                      <h3>Support hours</h3>
                      {canEdit && <form className="project-config-form" onSubmit={addShift}>
                        <label className="field"><span>Shift name</span><input required maxLength={120} value={shiftForm.name} onChange={(event) => setShiftForm({ ...shiftForm, name: event.target.value })} /></label>
                        <fieldset className="project-config-days"><legend>Days</legend>{DAYS.map((day) => <label key={day}><input type="checkbox" checked={shiftForm.days.includes(day)} onChange={(event) => setShiftForm({ ...shiftForm, days: event.target.checked ? [...shiftForm.days, day] : shiftForm.days.filter((item) => item !== day) })} />{day}</label>)}</fieldset>
                        <label className="field"><span>Starts</span><input type="time" required value={shiftForm.startTime} onChange={(event) => setShiftForm({ ...shiftForm, startTime: event.target.value })} /></label>
                        <label className="field"><span>Ends</span><input type="time" required value={shiftForm.endTime} onChange={(event) => setShiftForm({ ...shiftForm, endTime: event.target.value })} /></label>
                        <label className="field"><span>Time zone</span><input required maxLength={80} value={shiftForm.timezone} onChange={(event) => setShiftForm({ ...shiftForm, timezone: event.target.value })} /></label>
                        <button className="btn btn--primary" disabled={saving || !shiftForm.days.length}>Add shift</button>
                      </form>}
                      {config.shifts.map((shift) => <div className="project-config-row" key={shift.id}><strong>{shift.name}</strong><span>{shift.daysOfWeek} · {hoursLabel(shift.startTime)}–{hoursLabel(shift.endTime)} · {shift.timezone}</span>{canEdit && <button className="btn" disabled={saving} onClick={() => runMutation(() => deleteProjectConfiguration(project.id, "shifts", shift.id), "Shift removed.")}>Remove</button>}</div>)}
                      {!config.shifts.length && <p className="empty">No support hours configured.</p>}
                    </div>
                  )}

                  {activeTab === "priorities" && (
                    <div className="project-setup-section">
                      <h3>Priorities</h3>
                      {canEdit && <form className="project-config-form" onSubmit={addPriority}>
                        <label className="field"><span>Name</span><input required maxLength={80} value={priorityForm.name} onChange={(event) => setPriorityForm({ ...priorityForm, name: event.target.value })} /></label>
                        <label className="field"><span>Level (1 is highest)</span><input type="number" min="1" max="10" required value={priorityForm.level} onChange={(event) => setPriorityForm({ ...priorityForm, level: event.target.value })} /></label>
                        <label className="field"><span>Color</span><input type="color" value={priorityForm.color} onChange={(event) => setPriorityForm({ ...priorityForm, color: event.target.value })} /></label>
                        <button className="btn btn--primary" disabled={saving}>Add priority</button>
                      </form>}
                      {canEdit && <button className="btn" disabled={saving} onClick={addStandardPriorities}>Add standard four priorities</button>}
                      {config.priorities.map((priority) => <div className="project-config-row" key={priority.id}><i className="project-priority-dot" style={{ backgroundColor: priority.color }} /><strong>{priority.level}. {priority.name}</strong>{canEdit && <button className="btn" disabled={saving} onClick={() => runMutation(() => deleteProjectConfiguration(project.id, "priorities", priority.id), "Priority removed.")}>Remove</button>}</div>)}
                      {!config.priorities.length && <p className="empty">No priorities configured.</p>}
                    </div>
                  )}

                  {activeTab === "categories" && (
                    <div className="project-setup-section">
                      <h3>Ticket categories</h3>
                      {canEdit && <form className="project-config-form" onSubmit={addCategory}>
                        <label className="field"><span>Category name</span><input required maxLength={120} value={categoryName} onChange={(event) => setCategoryName(event.target.value)} /></label>
                        <button className="btn btn--primary" disabled={saving}>Add category</button>
                      </form>}
                      {config.categories.map((category) => <article className="project-category-card" key={category.id}>
                        <header><strong>{category.name}</strong>{canEdit && <button className="btn" disabled={saving} onClick={() => runMutation(() => deleteProjectConfiguration(project.id, "categories", category.id), "Category removed.")}>Remove</button>}</header>
                        <ul>{category.subcategories.map((subcategory) => <li key={subcategory.id}>{subcategory.name}{canEdit && <button className="btn" disabled={saving} onClick={() => runMutation(() => deleteProjectConfiguration(project.id, "categories", subcategory.id, category.id), "Subcategory removed.")}>Remove</button>}</li>)}</ul>
                        {canEdit && <form className="project-config-form" onSubmit={(event) => addSubcategory(event, category.id)}>
                          <label className="field"><span>Subcategory</span><input maxLength={120} value={subcategoryNames[category.id] || ""} onChange={(event) => setSubcategoryNames({ ...subcategoryNames, [category.id]: event.target.value })} /></label>
                          <button className="btn" disabled={saving}>Add subcategory</button>
                        </form>}
                      </article>)}
                      {!config.categories.length && <p className="empty">No ticket categories configured.</p>}
                    </div>
                  )}

                  {activeTab === "slas" && (
                    <div className="project-setup-section">
                      <h3>Service level agreements</h3>
                      {!config.priorities.length && <p className="empty">Add project priorities before setting SLAs.</p>}
                      {config.priorities.map((priority) => {
                        const sla = config.slas.find((item) => item.priorityId === priority.id);
                        return <form className="project-sla-form" key={priority.id} onSubmit={(event) => saveSla(event, priority.id)}>
                          <strong>{priority.name}</strong>
                          <label className="field"><span>Response (minutes)</span><input name="responseMinutes" type="number" min="1" required defaultValue={sla?.responseMinutes ?? 60} disabled={!canEdit} /></label>
                          <label className="field"><span>Resolution (minutes)</span><input name="resolutionMinutes" type="number" min="1" required defaultValue={sla?.resolutionMinutes ?? 480} disabled={!canEdit} /></label>
                          <label className="project-setup-form__active"><input name="businessHoursOnly" type="checkbox" defaultChecked={sla?.businessHoursOnly ?? true} disabled={!canEdit} /> Count business hours only</label>
                          {canEdit && <button className="btn btn--primary" disabled={saving}>Save SLA</button>}
                          {sla && canEdit && <button type="button" className="btn" disabled={saving} onClick={() => runMutation(() => deleteProjectConfiguration(project.id, "slas", sla.id), "SLA removed.")}>Remove</button>}
                        </form>;
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
