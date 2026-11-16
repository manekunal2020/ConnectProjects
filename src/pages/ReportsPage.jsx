import { useEffect, useMemo, useState } from "react";
import {
  createReportSchedule,
  deleteReportSchedule,
  getReportEmailDeliveries,
  getReportSchedules,
  getReportTickets,
} from "../auth/authService.js";
import "./ReportsPage.css";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const MAX_REPORT_RECIPIENTS = 10;
const OPEN_STATUSES = new Set(["Open", "In Progress", "Pending"]);
const REPORT_TABS = ["Overview", "Employee Productivity", "SLA & Ticket Reports", "Pending & ageing", "Scheduled Reports"];

function localDateValue(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getDateRange(period, dateValue) {
  const selected = new Date(`${dateValue}T00:00:00`);
  let start = new Date(selected);
  let end = new Date(selected);

  if (period === "weekly") {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
    end = new Date(start);
    end.setDate(end.getDate() + 6);
  } else if (period === "monthly") {
    start = new Date(selected.getFullYear(), selected.getMonth(), 1);
    end = new Date(selected.getFullYear(), selected.getMonth() + 1, 0);
  }

  start.setHours(0, 0, 0, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

function inRange(value, range) {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return Number.isFinite(timestamp) && timestamp >= range.start.getTime() && timestamp <= range.end.getTime();
}

function ageInDays(ticket, now) {
  const created = new Date(ticket.createdAt).getTime();
  if (!Number.isFinite(created)) return 0;
  return Math.max(0, Math.floor((now.getTime() - created) / 86400000));
}

function isWithinSla(ticket, kind, now) {
  const dueAt = ticket[kind === "response" ? "responseDueAt" : "resolutionDueAt"];
  if (!dueAt || !Number.isFinite(new Date(dueAt).getTime())) return null;

  const completedAt = kind === "response"
    ? ticket.firstResponseAt
    : ticket.resolvedAt || ticket.closedAt;

  if (completedAt) return new Date(completedAt).getTime() <= new Date(dueAt).getTime();
  return now.getTime() <= new Date(dueAt).getTime();
}

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })
    : "—";
}

function formatDateTime(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })
    : "—";
}

function rateLabel(compliant, eligible) {
  return eligible ? `${Math.round((compliant / eligible) * 100)}%` : "N/A";
}

function ratePercent(compliant, eligible) {
  return eligible ? Math.round((compliant / eligible) * 100) : 0;
}

function escapeCell(value) {
  const text = spreadsheetCell(value);
  return text.replace(/"/g, '""');
}

function spreadsheetCell(value) {
  const text = String(value ?? "");
  return /^[\t\r ]*[=+\-@]/.test(text) ? `'${text}` : text;
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function makeReportRows(metrics, employees, pending, periodLabel) {
  return [
    ["Connect Projects - Reports & Analytics", periodLabel],
    [],
    ["Summary", "Value"],
    ["Tickets created", metrics.total],
    ["Resolved or closed", metrics.resolved],
    ["Pending backlog", pending.length],
    ["Response SLA compliance", rateLabel(metrics.responseCompliant, metrics.responseEligible)],
    ["Resolution SLA compliance", rateLabel(metrics.resolutionCompliant, metrics.resolutionEligible)],
    [],
    ["Employee productivity", "Resolved", "Open assigned"],
    ...employees.map((employee) => [employee.name, employee.resolved, employee.open]),
    [],
    ["Pending and ageing tickets", "Subject", "Assignee", "Status", "Age (days)", "Created"],
    ...pending.map((ticket) => [
      ticket.ticketNumber || ticket.id,
      ticket.subject,
      ticket.assignee || "Unassigned",
      ticket.status,
      ticket.age,
      formatDate(ticket.createdAt),
    ]),
  ];
}

function getTrendBuckets(tickets, period, range) {
  const start = new Date(range.start);
  if (period === "daily") start.setDate(start.getDate() - 6);
  start.setHours(0, 0, 0, 0);

  const bucketDays = period === "monthly" ? 7 : 1;
  const buckets = [];
  let cursor = start;

  while (cursor <= range.end) {
    const bucketStart = new Date(cursor);
    const bucketEnd = new Date(cursor);
    bucketEnd.setDate(bucketEnd.getDate() + bucketDays);
    bucketEnd.setMilliseconds(bucketEnd.getMilliseconds() - 1);
    const effectiveEnd = bucketEnd < range.end ? bucketEnd : range.end;
    const inBucket = (value) => {
      const timestamp = new Date(value).getTime();
      return Number.isFinite(timestamp) && timestamp >= bucketStart.getTime() && timestamp <= effectiveEnd.getTime();
    };

    buckets.push({
      label: period === "monthly"
        ? `Week ${buckets.length + 1}`
        : bucketStart.toLocaleDateString(undefined, { weekday: "short" }),
      created: tickets.filter((ticket) => inBucket(ticket.createdAt)).length,
      resolved: tickets.filter((ticket) => inBucket(ticket.resolvedAt || ticket.closedAt)).length,
    });

    cursor = new Date(bucketEnd);
    cursor.setMilliseconds(cursor.getMilliseconds() + 1);
    cursor.setHours(0, 0, 0, 0);
    if (period === "daily" && buckets.length >= 7) break;
  }

  return buckets;
}

const STATUS_COLORS = {
  Open: "#1c4778",
  "In Progress": "#527ba8",
  Pending: "#c18a2e",
  Resolved: "#3d8b63",
  Closed: "#94a3b8",
};

function TicketTrendChart({ data }) {
  const maxValue = Math.max(1, ...data.flatMap((item) => [item.created, item.resolved]));

  return (
    <div className="reports-trend" role="img" aria-label="Tickets created and resolved over the report period">
      <div className="reports-trend__legend">
        <span><i className="reports-swatch reports-swatch--created" />Created</span>
        <span><i className="reports-swatch reports-swatch--resolved" />Resolved</span>
      </div>
      <div className="reports-trend__plot">
        {data.map((item, index) => (
          <div className="reports-trend__column" key={`${item.label}-${index}`}>
            <div className="reports-trend__bars">
              <span
                className="reports-trend__bar reports-trend__bar--created"
                style={{ height: `${item.created ? Math.max(4, item.created / maxValue * 100) : 0}%` }}
                title={`${item.created} created`}
              />
              <span
                className="reports-trend__bar reports-trend__bar--resolved"
                style={{ height: `${item.resolved ? Math.max(4, item.resolved / maxValue * 100) : 0}%` }}
                title={`${item.resolved} resolved`}
              />
            </div>
            <span className="reports-trend__label">{item.label}</span>
            <small>{item.created}/{item.resolved}</small>
          </div>
        ))}
      </div>
    </div>
  );
}

function TicketStatusChart({ data }) {
  const total = data.reduce((sum, item) => sum + item.count, 0);
  let offset = 0;
  const stops = data.filter((item) => item.count > 0).map((item) => {
    const from = offset;
    offset += (item.count / total) * 100;
    return `${item.color} ${from}% ${offset}%`;
  });

  return (
    <div className="reports-status-chart">
      <div
        className={`reports-donut${total ? "" : " reports-donut--empty"}`}
        style={total ? { background: `conic-gradient(${stops.join(", ")})` } : undefined}
        role="img"
        aria-label={total ? data.filter((item) => item.count).map((item) => `${item.status}: ${item.count}`).join(", ") : "No tickets"}
      >
        <div><strong>{total}</strong><span>tickets</span></div>
      </div>
      <ul className="reports-status-legend">
        {data.map((item) => (
          <li key={item.status}><i style={{ backgroundColor: item.color }} /><span>{item.status}</span><strong>{item.count}</strong></li>
        ))}
      </ul>
    </div>
  );
}

function AgeingChart({ buckets }) {
  const maxValue = Math.max(1, ...buckets.map((bucket) => bucket.count));
  return (
    <div className="reports-ageing-chart" role="img" aria-label="Pending tickets grouped by age">
      {buckets.map((bucket) => (
        <div className="reports-ageing-row" key={bucket.label}>
          <span>{bucket.label}</span>
          <div><i style={{ width: `${bucket.count ? Math.max(3, bucket.count / maxValue * 100) : 0}%` }} /></div>
          <strong>{bucket.count}</strong>
        </div>
      ))}
    </div>
  );
}

export default function ReportsPage({ user }) {
  const [tickets, setTickets] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [deliveries, setDeliveries] = useState([]);
  const [period, setPeriod] = useState("weekly");
  const [activeTab, setActiveTab] = useState("Overview");
  const [referenceDate, setReferenceDate] = useState(() => localDateValue(new Date()));
  const [now, setNow] = useState(() => new Date());
  const [loading, setLoading] = useState(true);
  const [savingSchedule, setSavingSchedule] = useState(false);
  const [removingId, setRemovingId] = useState("");
  const [refreshingDeliveries, setRefreshingDeliveries] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [scheduleForm, setScheduleForm] = useState({
    emails: [user.email || ""],
    frequency: "weekly",
    time: "09:00",
    weekday: String(new Date().getDay()),
    monthDay: "1",
  });

  const canExport = user.role === "Super User" || (user.permissions || []).includes("reports.export");
  const canSchedule = user.role === "Super User" || (user.permissions || []).includes("reports.schedule");
  const range = useMemo(() => getDateRange(period, referenceDate), [period, referenceDate]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000);
    let active = true;
    Promise.all([getReportTickets(), getReportSchedules(), getReportEmailDeliveries()])
      .then(([ticketData, scheduleData, deliveryData]) => {
        if (!active) return;
        setTickets(ticketData);
        setSchedules(scheduleData);
        setDeliveries(deliveryData);
      })
      .catch((requestError) => {
        if (active) setError(requestError.message || "Could not load reports.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, []);

  const periodTickets = useMemo(
    () => tickets.filter((ticket) => inRange(ticket.createdAt, range)),
    [tickets, range],
  );
  const pendingTickets = useMemo(
    () => tickets
      .filter((ticket) => OPEN_STATUSES.has(ticket.status))
      .map((ticket) => ({ ...ticket, age: ageInDays(ticket, now) }))
      .sort((a, b) => b.age - a.age),
    [tickets, now],
  );
  const employeeRows = useMemo(() => {
    const employees = new Map();
    for (const ticket of tickets) {
      if (!["Resolved", "Closed"].includes(ticket.status) || !inRange(ticket.resolvedAt || ticket.closedAt, range)) continue;
      const name = ticket.assignee || "Unassigned";
      if (!employees.has(name)) employees.set(name, { name, resolved: 0, open: 0 });
      employees.get(name).resolved += 1;
    }
    for (const ticket of pendingTickets) {
      const name = ticket.assignee || "Unassigned";
      if (!employees.has(name)) employees.set(name, { name, resolved: 0, open: 0 });
      employees.get(name).open += 1;
    }
    return [...employees.values()].sort((a, b) => b.resolved - a.resolved || a.name.localeCompare(b.name));
  }, [tickets, pendingTickets, range]);
  const trendBuckets = useMemo(
    () => getTrendBuckets(tickets, period, range),
    [tickets, period, range],
  );
  const statusBuckets = useMemo(() => {
    const counts = new Map();
    for (const ticket of tickets) counts.set(ticket.status || "Unknown", (counts.get(ticket.status || "Unknown") || 0) + 1);
    return [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([status, count]) => ({ status, count, color: STATUS_COLORS[status] || "#64748b" }));
  }, [tickets]);
  const ageingBuckets = useMemo(() => [
    { label: "0–2 days", count: pendingTickets.filter((ticket) => ticket.age <= 2).length },
    { label: "3–7 days", count: pendingTickets.filter((ticket) => ticket.age >= 3 && ticket.age <= 7).length },
    { label: "8–14 days", count: pendingTickets.filter((ticket) => ticket.age >= 8 && ticket.age <= 14).length },
    { label: "15+ days", count: pendingTickets.filter((ticket) => ticket.age >= 15).length },
  ], [pendingTickets]);

  const metrics = useMemo(() => {
    const resolved = tickets.filter((ticket) => ["Resolved", "Closed"].includes(ticket.status) && inRange(ticket.resolvedAt || ticket.closedAt, range)).length;
    const responseResults = periodTickets.map((ticket) => isWithinSla(ticket, "response", now)).filter((value) => value !== null);
    const resolutionResults = periodTickets.map((ticket) => isWithinSla(ticket, "resolution", now)).filter((value) => value !== null);
    return {
      total: periodTickets.length,
      resolved,
      responseEligible: responseResults.length,
      responseCompliant: responseResults.filter(Boolean).length,
      resolutionEligible: resolutionResults.length,
      resolutionCompliant: resolutionResults.filter(Boolean).length,
    };
  }, [periodTickets, tickets, range, now]);

  const periodLabel = `${period.charAt(0).toUpperCase()}${period.slice(1)} report · ${formatDate(range.start)} – ${formatDate(range.end)}`;
  const averageAge = pendingTickets.length
    ? (pendingTickets.reduce((sum, ticket) => sum + ticket.age, 0) / pendingTickets.length).toFixed(1)
    : "0.0";
  const employeesWithResolutions = employeeRows.filter((employee) => employee.resolved > 0).length;
  const resolvedPerEmployee = employeesWithResolutions
    ? (metrics.resolved / employeesWithResolutions).toFixed(1)
    : "0.0";

  function scheduleDescription(schedule) {
    if (schedule.frequency === "weekly") return `Every ${WEEKDAYS[schedule.weekday]} at ${schedule.time}`;
    if (schedule.frequency === "monthly") return `Day ${schedule.monthDay} of each month at ${schedule.time}`;
    return `Every day at ${schedule.time}`;
  }

  async function refreshSchedules() {
    const data = await getReportSchedules();
    setSchedules(data);
  }

  async function refreshDeliveries() {
    setRefreshingDeliveries(true);
    setError("");
    try {
      setDeliveries(await getReportEmailDeliveries());
    } catch (requestError) {
      setError(requestError.message || "Could not load previous scheduled emails.");
    } finally {
      setRefreshingDeliveries(false);
    }
  }

  async function handleScheduleSubmit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSavingSchedule(true);
    try {
      await createReportSchedule({
        ...scheduleForm,
        emails: scheduleForm.emails.map((email) => email.trim()),
        weekday: Number(scheduleForm.weekday),
        monthDay: Number(scheduleForm.monthDay),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      });
      await refreshSchedules();
      setNotice("Email report schedule created.");
    } catch (requestError) {
      setError(requestError.message || "Could not create the email schedule.");
    } finally {
      setSavingSchedule(false);
    }
  }

  async function handleDeleteSchedule(scheduleId) {
    setError("");
    setNotice("");
    setRemovingId(scheduleId);
    try {
      await deleteReportSchedule(scheduleId);
      setSchedules((current) => current.filter((schedule) => schedule.id !== scheduleId));
      setNotice("Email report schedule removed.");
    } catch (requestError) {
      setError(requestError.message || "Could not remove the email schedule.");
    } finally {
      setRemovingId("");
    }
  }

  function exportReport(format) {
    const rows = makeReportRows(metrics, employeeRows, pendingTickets, periodLabel);
    const filename = `connect-projects-${period}-report-${referenceDate}`;
    if (format === "csv") {
      const csv = rows.map((row) => row.map((cell) => `"${escapeCell(cell)}"`).join(",")).join("\r\n");
      downloadFile(`${filename}.csv`, `\uFEFF${csv}`, "text/csv;charset=utf-8");
      return;
    }

    const table = rows.map((row) => `<tr>${row.map((cell) => `<td>${spreadsheetCell(cell).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[character]))}</td>`).join("")}</tr>`).join("");
    if (format === "excel") {
      const workbook = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"><!--[if gte mso 9]><xml><x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet><x:Name>Reports</x:Name><x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions></x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook></xml><![endif]--></head><body><table>${table}</table></body></html>`;
      downloadFile(`${filename}.xls`, workbook, "application/vnd.ms-excel;charset=utf-8");
      return;
    }
    window.print();
  }

  const chartDescription = period === "daily"
    ? "Daily totals across the seven days ending on the reference date."
    : period === "monthly"
      ? "Weekly totals during the selected month."
      : "Daily totals during the selected week.";

  const renderEmployeeReport = () => (
    <section className="reports-card">
      <div className="reports-card__heading">
        <div><h2>Employee productivity</h2><p>Tickets resolved during the selected period and current open assignments.</p></div>
      </div>
      {employeeRows.length ? (
        <div className="table-wrap">
          <table className="table reports-table">
            <thead><tr><th>Employee</th><th>Resolved in period</th><th>Open assigned</th><th>Resolved share</th></tr></thead>
            <tbody>{employeeRows.map((employee) => {
              const maxResolved = Math.max(1, ...employeeRows.map((item) => item.resolved));
              return <tr key={employee.name}><td>{employee.name}</td><td>{employee.resolved}</td><td>{employee.open}</td><td><span className="reports-bar"><span style={{ width: `${(employee.resolved / maxResolved) * 100}%` }} /></span></td></tr>;
            })}</tbody>
          </table>
        </div>
      ) : <p className="reports-empty">No ticket activity is available for this period.</p>}
    </section>
  );

  const renderSlaReport = () => (
    <>
      <section className="reports-card">
        <div className="reports-card__heading">
          <div><h2>SLA compliance</h2><p>Compliance is measured against each ticket’s response and resolution due times.</p></div>
        </div>
        <div className="reports-sla-grid">
          <div className="reports-sla-card">
            <span>First response</span><strong>{rateLabel(metrics.responseCompliant, metrics.responseEligible)}</strong>
            <div className="reports-sla-track" role="progressbar" aria-label="First response SLA compliance" aria-valuenow={ratePercent(metrics.responseCompliant, metrics.responseEligible)} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${ratePercent(metrics.responseCompliant, metrics.responseEligible)}%` }} /></div>
            <small>{metrics.responseCompliant} of {metrics.responseEligible} within target</small>
          </div>
          <div className="reports-sla-card">
            <span>Resolution</span><strong>{rateLabel(metrics.resolutionCompliant, metrics.resolutionEligible)}</strong>
            <div className="reports-sla-track" role="progressbar" aria-label="Resolution SLA compliance" aria-valuenow={ratePercent(metrics.resolutionCompliant, metrics.resolutionEligible)} aria-valuemin="0" aria-valuemax="100"><span style={{ width: `${ratePercent(metrics.resolutionCompliant, metrics.resolutionEligible)}%` }} /></div>
            <small>{metrics.resolutionCompliant} of {metrics.resolutionEligible} within target</small>
          </div>
        </div>
      </section>
      <div className="reports-charts-grid">
        <section className="reports-card reports-chart-panel">
          <div className="reports-card__heading"><div><h2>Ticket status</h2><p>Current ticket distribution.</p></div></div>
          {statusBuckets.length ? <TicketStatusChart data={statusBuckets} /> : <p className="reports-empty">No tickets are available for this account.</p>}
        </section>
        <section className="reports-card reports-chart-panel">
          <div className="reports-card__heading"><div><h2>Ticket activity</h2><p>{chartDescription}</p></div></div>
          <TicketTrendChart data={trendBuckets} />
        </section>
      </div>
    </>
  );

  const renderPendingReport = () => (
    <>
      <div className="reports-charts-grid reports-charts-grid--backlog">
        <section className="reports-card reports-chart-panel">
          <div className="reports-card__heading"><div><h2>Backlog ageing</h2><p>Open tickets grouped by age.</p></div></div>
          <AgeingChart buckets={ageingBuckets} />
        </section>
        <section className="reports-card reports-chart-panel reports-backlog-summary">
          <p className="reports-eyebrow">CURRENT BACKLOG</p>
          <strong>{pendingTickets.length}</strong>
          <span>pending tickets</span>
          <small>{averageAge} days average age</small>
        </section>
      </div>
      <section className="reports-card">
        <div className="reports-card__heading">
          <div><h2>Pending &amp; ageing tickets</h2><p>Current open backlog, sorted from oldest to newest.</p></div>
          <span className="reports-count">{pendingTickets.length} pending</span>
        </div>
        {pendingTickets.length ? (
          <div className="table-wrap">
            <table className="table reports-table reports-age-table">
              <thead><tr><th>Ticket</th><th>Subject</th><th>Assignee</th><th>Status</th><th>Age</th><th>Response SLA</th><th>Resolution SLA</th></tr></thead>
              <tbody>{pendingTickets.map((ticket) => {
                const response = isWithinSla(ticket, "response", now);
                const resolution = isWithinSla(ticket, "resolution", now);
                return <tr key={ticket.id}><td>{ticket.ticketNumber || ticket.id}</td><td>{ticket.subject}</td><td>{ticket.assignee || "Unassigned"}</td><td><span className="reports-status">{ticket.status}</span></td><td><strong className={ticket.age >= 7 ? "reports-age reports-age--high" : "reports-age"}>{ticket.age}d</strong></td><td>{response === null ? "—" : response ? "On track" : "Breached"}</td><td>{resolution === null ? "—" : resolution ? "On track" : "Breached"}</td></tr>;
              })}</tbody>
            </table>
          </div>
        ) : <p className="reports-empty">There are no pending tickets.</p>}
      </section>
    </>
  );

  const renderScheduleReport = () => canSchedule ? (
    <section className="reports-card reports-schedule">
      <div className="reports-card__heading">
        <div><h2>Scheduled email reports</h2><p>Send a recurring ticket summary to one or more email addresses.</p></div>
      </div>
      <form className="reports-schedule-form" onSubmit={handleScheduleSubmit}>
        <div className="reports-schedule-recipients">
          <span>Email addresses</span>
          {scheduleForm.emails.map((email, index) => (
            <div className="reports-schedule-recipient" key={index}>
              <input
                type="email"
                required
                aria-label={`Recipient email ${index + 1}`}
                value={email}
                onChange={(event) => setScheduleForm((current) => ({
                  ...current,
                  emails: current.emails.map((value, itemIndex) => itemIndex === index ? event.target.value : value),
                }))}
                placeholder="name@example.com"
              />
              {scheduleForm.emails.length > 1 && (
                <button
                  type="button"
                  className="reports-remove-recipient"
                  aria-label={`Remove recipient ${index + 1}`}
                  onClick={() => setScheduleForm((current) => ({
                    ...current,
                    emails: current.emails.filter((_, itemIndex) => itemIndex !== index),
                  }))}
                >Remove</button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="reports-add-recipient"
            disabled={scheduleForm.emails.length >= MAX_REPORT_RECIPIENTS}
            onClick={() => setScheduleForm((current) => ({ ...current, emails: [...current.emails, ""] }))}
          >+ Add another email</button>
        </div>
        <label><span>Frequency</span><select value={scheduleForm.frequency} onChange={(event) => setScheduleForm({ ...scheduleForm, frequency: event.target.value })}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></label>
        {scheduleForm.frequency === "weekly" && <label><span>Day</span><select value={scheduleForm.weekday} onChange={(event) => setScheduleForm({ ...scheduleForm, weekday: event.target.value })}>{WEEKDAYS.map((day, index) => <option value={index} key={day}>{day}</option>)}</select></label>}
        {scheduleForm.frequency === "monthly" && <label><span>Day of month</span><select value={scheduleForm.monthDay} onChange={(event) => setScheduleForm({ ...scheduleForm, monthDay: event.target.value })}>{Array.from({ length: 28 }, (_, index) => index + 1).map((day) => <option value={day} key={day}>{day}</option>)}</select></label>}
        <label><span>Send time</span><input type="time" required value={scheduleForm.time} onChange={(event) => setScheduleForm({ ...scheduleForm, time: event.target.value })} /></label>
        <button className="btn btn--primary" type="submit" disabled={savingSchedule}>{savingSchedule ? "Saving..." : "Schedule report"}</button>
      </form>
      <p className="reports-schedule-note">Times use your browser’s time zone. Automatic delivery requires MAIL_HOST, MAIL_USERNAME, MAIL_PASSWORD, and MAIL_FROM in the backend environment.</p>
      <div className="reports-history-section">
        <div className="reports-card__heading">
          <div><h2>Active schedules</h2><p>Recurring email reports you have configured.</p></div>
        </div>
        {schedules.length > 0 ? (
          <ul className="reports-schedule-list">
            {schedules.map((schedule) => (
              <li key={schedule.id}>
                <div><strong>{scheduleDescription(schedule)}</strong><span>{(schedule.emails || [schedule.email]).join(", ")} · {schedule.timeZone}</span><small>{schedule.lastSentAt ? `Last sent ${formatDate(schedule.lastSentAt)}` : "Not sent yet"}</small></div>
                <button className="btn" type="button" disabled={removingId === schedule.id} onClick={() => handleDeleteSchedule(schedule.id)}>{removingId === schedule.id ? "Removing..." : "Remove"}</button>
              </li>
            ))}
          </ul>
        ) : <p className="reports-empty">No email report schedules yet.</p>}
      </div>
      <div className="reports-history-section">
        <div className="reports-card__heading">
          <div><h2>Previous scheduled emails</h2><p>Successfully delivered report emails, newest first.</p></div>
          <button className="btn" type="button" onClick={refreshDeliveries} disabled={refreshingDeliveries}>{refreshingDeliveries ? "Refreshing..." : "Refresh history"}</button>
        </div>
        {deliveries.length ? (
          <ul className="reports-delivery-list">
            {deliveries.map((delivery) => (
              <li className="reports-delivery-row" key={delivery.id}>
                <span className="reports-file-chip">{delivery.frequency.slice(0, 3).toUpperCase()}</span>
                <div><strong>{delivery.frequency.charAt(0).toUpperCase() + delivery.frequency.slice(1)} report · {delivery.reportPeriod}</strong><span>{delivery.recipientEmail} · {formatDateTime(delivery.sentAt)}</span></div>
                <span className="reports-delivery-status">Sent</span>
              </li>
            ))}
          </ul>
        ) : <p className="reports-empty">No scheduled report emails have been sent yet.</p>}
      </div>
    </section>
  ) : (
    <section className="reports-card"><p className="reports-empty">You don’t have permission to manage scheduled reports.</p></section>
  );

  return (
    <div className="reports-page">
      <section className="reports-intro">
        <div>
          <p className="reports-eyebrow">CONNECT PROJECTS / ANALYTICS</p>
          <h2>Reports &amp; Analytics</h2>
          <p>Understand team performance and operational health at a glance.</p>
        </div>
        <div className="reports-toolbar">
          <label>
            <span>Report period</span>
            <select value={period} onChange={(event) => setPeriod(event.target.value)}>
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <label>
            <span>Reference date</span>
            <input type="date" value={referenceDate} onChange={(event) => setReferenceDate(event.target.value)} />
          </label>
          {canExport && (
            <div className="reports-export-actions" aria-label="Export report">
              <button className="btn" onClick={() => exportReport("excel")}>Excel</button>
              <button className="btn" onClick={() => exportReport("pdf")}>PDF</button>
              <button className="btn btn--primary" onClick={() => exportReport("csv")}>CSV</button>
            </div>
          )}
        </div>
      </section>

      <div className="reports-tabs" role="tablist" aria-label="Report sections">
        {REPORT_TABS.filter((tab) => tab !== "Scheduled Reports" || canSchedule).map((tab) => (
          <button key={tab} type="button" role="tab" aria-selected={activeTab === tab} className={activeTab === tab ? "is-active" : ""} onClick={() => setActiveTab(tab)}>{tab}</button>
        ))}
      </div>

      {error && <p className="reports-message reports-message--error" role="alert">{error}</p>}
      {notice && <p className="reports-message reports-message--success" role="status">{notice}</p>}
      {loading ? (
        <section className="reports-card"><p className="reports-empty">Loading ticket reports...</p></section>
      ) : (
        <>
          <p className="reports-period">{periodLabel}</p>
          {activeTab === "Overview" && (
            <>
              <section className="reports-kpis" aria-label="Report summary">
                <article className="reports-kpi reports-kpi--purple"><span>Resolved per employee</span><strong>{resolvedPerEmployee}</strong><small>Average during this period</small></article>
                <article className="reports-kpi reports-kpi--green"><span>Response SLA</span><strong>{rateLabel(metrics.responseCompliant, metrics.responseEligible)}</strong><small>{metrics.responseEligible} measured tickets</small></article>
                <article className="reports-kpi reports-kpi--orange"><span>Pending tickets</span><strong>{pendingTickets.length}</strong><small>Current open backlog</small></article>
                <article className="reports-kpi reports-kpi--blue"><span>Average ageing</span><strong>{averageAge} days</strong><small>Across pending tickets</small></article>
              </section>
              <div className="reports-charts-grid reports-overview-grid">
                <section className="reports-card reports-chart-panel reports-chart-panel--wide">
                  <div className="reports-card__heading"><div><h2>Ticket activity</h2><p>{chartDescription}</p></div></div>
                  <TicketTrendChart data={trendBuckets} />
                </section>
                <section className="reports-card reports-chart-panel">
                  <div className="reports-card__heading"><div><h2>Ticket status</h2><p>Current ticket distribution.</p></div></div>
                  {statusBuckets.length ? <TicketStatusChart data={statusBuckets} /> : <p className="reports-empty">No tickets are available for this account.</p>}
                </section>
                <section className="reports-card reports-chart-panel">
                  <div className="reports-card__heading"><div><h2>Ticket ageing</h2><p>Open tickets grouped by age.</p></div></div>
                  <AgeingChart buckets={ageingBuckets} />
                </section>
                <section className="reports-card reports-quick-actions">
                  <div className="reports-card__heading"><div><h2>Quick actions</h2><p>Common reporting tasks.</p></div></div>
                  {canExport && <button type="button" onClick={() => exportReport("excel")}><strong>Export spreadsheet</strong><small>Excel-compatible report</small><span aria-hidden="true">›</span></button>}
                  {canExport && <button type="button" onClick={() => exportReport("pdf")}><strong>Print / save as PDF</strong><small>Export current report</small><span aria-hidden="true">›</span></button>}
                  {canSchedule && <button type="button" onClick={() => setActiveTab("Scheduled Reports")}><strong>Schedule reports</strong><small>Automated email delivery</small><span aria-hidden="true">›</span></button>}
                </section>
              </div>
            </>
          )}
          {activeTab === "Employee Productivity" && renderEmployeeReport()}
          {activeTab === "SLA & Ticket Reports" && renderSlaReport()}
          {activeTab === "Pending & ageing" && renderPendingReport()}
          {activeTab === "Scheduled Reports" && renderScheduleReport()}
        </>
      )}
    </div>
  );
}
