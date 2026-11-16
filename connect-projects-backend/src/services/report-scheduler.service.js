import { readDb, writeDb } from '../config/database.js';
import { sendScheduledReportEmail } from './email.service.js';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
let timer;
let running = false;

function getLocalParts(date, timeZone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  return Object.fromEntries(parts.map(({ type, value }) => [type, value]));
}

function getPeriodKey(schedule, parts) {
  const date = `${parts.year}-${parts.month}-${parts.day}`;
  if (schedule.frequency === 'daily') return date;
  if (schedule.frequency === 'monthly') return `${parts.year}-${parts.month}`;

  const localDate = new Date(`${date}T00:00:00Z`);
  const day = localDate.getUTCDay();
  localDate.setUTCDate(localDate.getUTCDate() - ((day + 6) % 7));
  return `${localDate.getUTCFullYear()}-${String(localDate.getUTCMonth() + 1).padStart(2, '0')}-${String(localDate.getUTCDate()).padStart(2, '0')}`;
}

function localMidnightToUtc(year, month, day, timeZone) {
  const desired = Date.UTC(year, month - 1, day);
  let timestamp = desired;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const parts = getLocalParts(new Date(timestamp), timeZone);
    const actual = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
    );
    timestamp += desired - actual;
  }

  return new Date(timestamp);
}

function getScheduleRange(schedule, parts) {
  const date = new Date(Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day)));
  let startDate = new Date(date);
  let endDate = new Date(date);

  if (schedule.frequency === 'weekly') {
    startDate.setUTCDate(startDate.getUTCDate() - ((startDate.getUTCDay() + 6) % 7));
    endDate = new Date(startDate);
    endDate.setUTCDate(endDate.getUTCDate() + 7);
  } else if (schedule.frequency === 'monthly') {
    startDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
    endDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
  } else {
    endDate.setUTCDate(endDate.getUTCDate() + 1);
  }

  const start = localMidnightToUtc(startDate.getUTCFullYear(), startDate.getUTCMonth() + 1, startDate.getUTCDate(), schedule.timeZone);
  const end = localMidnightToUtc(endDate.getUTCFullYear(), endDate.getUTCMonth() + 1, endDate.getUTCDate(), schedule.timeZone);
  const labelStart = startDate.toISOString().slice(0, 10);
  const labelEnd = new Date(endDate.getTime() - 86400000).toISOString().slice(0, 10);
  return { start, end, label: `${labelStart} to ${labelEnd}` };
}

function isDue(schedule, parts) {
  if (parts.hour === '24' || `${parts.hour}:${parts.minute}` < schedule.time) return false;
  if (schedule.frequency === 'weekly' && WEEKDAYS.indexOf(parts.weekday) !== schedule.weekday) return false;
  if (schedule.frequency === 'monthly' && Number(parts.day) !== schedule.monthDay) return false;
  return true;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[character]));
}

function buildReport(db, now, range) {
  const allTickets = db.tickets || [];
  const inRange = value => {
    const time = new Date(value).getTime();
    return Number.isFinite(time) && time >= range.start.getTime() && time < range.end.getTime();
  };
  const tickets = allTickets.filter(ticket => inRange(ticket.createdAt));
  const openTickets = allTickets.filter(ticket => !['Resolved', 'Closed'].includes(ticket.status));
  const responseMet = ticket => ticket.firstResponseAt
    ? new Date(ticket.firstResponseAt) <= new Date(ticket.responseDueAt)
    : new Date(now) <= new Date(ticket.responseDueAt);
  const resolutionMet = ticket => {
    const completedAt = ticket.resolvedAt || ticket.closedAt;
    return completedAt
      ? new Date(completedAt) <= new Date(ticket.resolutionDueAt)
      : new Date(now) <= new Date(ticket.resolutionDueAt);
  };
  const responseEligible = tickets.filter(ticket => ticket.responseDueAt);
  const resolutionEligible = tickets.filter(ticket => ticket.resolutionDueAt);
  const resolved = allTickets.filter(ticket =>
    ['Resolved', 'Closed'].includes(ticket.status) && inRange(ticket.resolvedAt || ticket.closedAt)
  );
  const responseCompliant = responseEligible.filter(responseMet).length;
  const resolutionCompliant = resolutionEligible.filter(resolutionMet).length;
  const responseRate = responseEligible.length
    ? `${Math.round(responseCompliant / responseEligible.length * 100)}%`
    : 'N/A';
  const resolutionRate = resolutionEligible.length
    ? `${Math.round(resolutionCompliant / resolutionEligible.length * 100)}%`
    : 'N/A';
  const oldest = [...openTickets]
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
    .slice(0, 10);
  const ageDays = ticket => Math.max(0, Math.floor((now - new Date(ticket.createdAt)) / 86400000));
  const productivity = new Map();
  for (const ticket of resolved) {
    const assignee = ticket.assignee || 'Unassigned';
    productivity.set(assignee, (productivity.get(assignee) || 0) + 1);
  }
  const rows = [...productivity].map(([name, count]) => `<tr><td>${escapeHtml(name)}</td><td>${count}</td></tr>`).join('');
  const pendingRows = oldest.map(ticket => `<tr><td>${escapeHtml(ticket.ticketNumber || ticket.id)}</td><td>${escapeHtml(ticket.subject)}</td><td>${escapeHtml(ticket.assignee || 'Unassigned')}</td><td>${ageDays(ticket)} days</td></tr>`).join('');

  return {
    text: [
      `Report period: ${range.label}`,
      `Tickets created: ${tickets.length}`,
      `Pending tickets: ${openTickets.length}`,
      `Resolved/closed: ${resolved.length}`,
      `Response SLA compliance: ${responseRate}`,
      `Resolution SLA compliance: ${resolutionRate}`,
    ].join('\n'),
    html: `<h1>Connect Projects ticket report</h1><p>Period: ${escapeHtml(range.label)} · Generated ${escapeHtml(now.toISOString())}</p><ul><li>Tickets created: ${tickets.length}</li><li>Pending tickets: ${openTickets.length}</li><li>Resolved / closed: ${resolved.length}</li><li>Response SLA compliance: ${responseRate}</li><li>Resolution SLA compliance: ${resolutionRate}</li></ul><h2>Resolved tickets by employee</h2><table border="1" cellpadding="6"><thead><tr><th>Employee</th><th>Resolved</th></tr></thead><tbody>${rows || '<tr><td colspan="2">No resolved tickets</td></tr>'}</tbody></table><h2>Oldest pending tickets</h2><table border="1" cellpadding="6"><thead><tr><th>Ticket</th><th>Subject</th><th>Assignee</th><th>Age</th></tr></thead><tbody>${pendingRows || '<tr><td colspan="4">No pending tickets</td></tr>'}</tbody></table>`,
  };
}

async function deliverDueReports() {
  if (running) return;
  running = true;
  try {
    const db = await readDb();
    let updated = false;
    const now = new Date();

    for (const schedule of db.reportSchedules || []) {
      let parts;
      try {
        parts = getLocalParts(now, schedule.timeZone);
      } catch {
        console.error(`Skipping report schedule ${schedule.id}: invalid time zone.`);
        continue;
      }

      const period = getPeriodKey(schedule, parts);
      if (!isDue(schedule, parts) || schedule.lastSentPeriod === period) continue;

      try {
        const range = getScheduleRange(schedule, parts);
        const owner = db.users.find(user => user.id === schedule.createdBy);
        if (!owner) {
          console.error(`Skipping report schedule ${schedule.id}: owner no longer exists.`);
          continue;
        }
        const reportDb = owner.role === 'Team Member'
          ? {
              ...db,
              tickets: (db.tickets || []).filter(ticket => ticket.assigneeId === owner.id),
            }
          : db;
        const report = buildReport(reportDb, now, range);
        await sendScheduledReportEmail({
          to: schedule.email,
          subject: `Connect Projects ${schedule.frequency} ticket report (${range.label})`,
          ...report,
        });
        schedule.lastSentPeriod = period;
        schedule.lastSentAt = now.toISOString();
        updated = true;
      } catch (error) {
        console.error(`Could not send report schedule ${schedule.id}:`, error.message);
      }
    }

    if (updated) await writeDb(db);
  } catch (error) {
    console.error('Report scheduler failed:', error);
  } finally {
    running = false;
  }
}

export function startReportScheduler() {
  if (timer) return;
  timer = setInterval(deliverDueReports, 30_000);
  timer.unref();
  deliverDueReports();
}
