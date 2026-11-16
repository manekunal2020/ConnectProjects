
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readDb, writeDb } from '../config/database.js';
import { requirePermission } from '../middleware/permissions.js';
import { notFound } from '../utils/http.js';

const router = Router();

const STATUSES = [
  'Open',
  'In Progress',
  'Pending',
  'Resolved',
  'Closed'
];

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

function addHistory(ticket, user, action, details = '') {
  ticket.history.push({
    id: randomUUID(),
    user: user.name,
    action,
    details,
    timestamp: new Date().toISOString()
  });
}

// VIEW TICKETS
router.get('/', requirePermission('tickets.view'), async (req, res, next) => {
  try {
    const db = await readDb();
    const user = db.users.find(item => item.id === req.auth.sub);

    let tickets = db.tickets || [];

    if (user?.role === 'Team Member') {
      tickets = tickets.filter(ticket => ticket.assigneeId === user.id);
    }

    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

// CREATE TICKET
router.post('/', requirePermission('tickets.create'), async (req, res, next) => {
  try {
   const {
  subject,
  description = '',
  category = 'General',
  priority = 'Medium',
  assigneeId = '',
  responseSlaHours,
  resolutionSlaHours
} = req.body || {};

    if (!String(subject || '').trim()) {
      return res.status(400).json({
        message: 'Ticket subject is required.'
      });
    }

    if (!PRIORITIES.includes(priority)) {
      return res.status(400).json({
        message: 'Invalid ticket priority.'
      });
    }

    const slaTargets = {
  Critical: { response: 1, resolution: 4 },
  High: { response: 4, resolution: 8 },
  Medium: { response: 8, resolution: 24 },
  Low: { response: 24, resolution: 72 }
};

const responseHours = Number(
  responseSlaHours ?? slaTargets[priority].response
);

const resolutionHours = Number(
  resolutionSlaHours ?? slaTargets[priority].resolution
);

    if (
      !Number.isFinite(responseHours) ||
      !Number.isFinite(resolutionHours) ||
      responseHours <= 0 ||
      resolutionHours <= 0 ||
      responseHours > 720 ||
      resolutionHours > 720
    ) {
      return res.status(400).json({
        message: 'SLA hours must be between 1 and 720.'
      });
    }

    const db = await readDb();
    db.tickets = db.tickets || [];

    const currentUser = db.users.find(
      user => user.id === req.auth.sub
    );

    let assignee = null;

    if (assigneeId) {
      assignee = db.users.find(
        user => user.id === assigneeId
      );

      if (!assignee) {
        return res.status(400).json({
          message: 'Selected assignee was not found.'
        });
      }
    }

    const now = new Date();

    const ticket = {
      id: randomUUID(),
      ticketNumber: `TKT-${Date.now().toString().slice(-8)}`,
      subject: String(subject).trim(),
      description: String(description).trim(),
      category: String(category).trim(),
      priority,
      status: 'Open',
      assigneeId: assignee?.id || null,
      assignee: assignee?.name || '',
      createdBy: currentUser.name,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      firstResponseAt: null,
      resolvedAt: null,
      closedAt: null,
      responseSlaHours: responseHours,
      resolutionSlaHours: resolutionHours,
      responseDueAt: new Date(
        now.getTime() + responseHours * 3600000
      ).toISOString(),
      resolutionDueAt: new Date(
        now.getTime() + resolutionHours * 3600000
      ).toISOString(),
      history: []
    };

    addHistory(ticket, currentUser, 'Created', 'Ticket created.');

    db.tickets.push(ticket);
    await writeDb(db);

    res.status(201).json({
      message: 'Ticket created successfully.',
      ticket
    });
  } catch (error) {
    next(error);
  }
});

// ASSIGN TICKET
router.patch('/:id/assign', requirePermission('tickets.assign'), async (req, res, next) => {
  try {
    const db = await readDb();
    const ticket = (db.tickets || []).find(
      item => item.id === req.params.id
    );

    if (!ticket) return notFound(res, 'Ticket');

    const assigneeId = req.body?.assigneeId;

    const assignee = db.users.find(
      user => user.id === assigneeId
    );

    if (!assignee) {
      return res.status(400).json({
        message: 'Valid assignee is required.'
      });
    }

    const currentUser = db.users.find(
      user => user.id === req.auth.sub
    );

    ticket.assigneeId = assignee.id;
    ticket.assignee = assignee.name;
    ticket.updatedAt = new Date().toISOString();

    addHistory(ticket, currentUser, 'Assigned', `Assigned to ${assignee.name}.`);

    await writeDb(db);

    res.json({
      message: 'Ticket assigned successfully.',
      ticket
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE TICKET
router.patch('/:id', requirePermission('tickets.update'), async (req, res, next) => {
  try {
    const db = await readDb();
    const ticket = (db.tickets || []).find(
      item => item.id === req.params.id
    );

    if (!ticket) return notFound(res, 'Ticket');

    const currentUser = db.users.find(
      user => user.id === req.auth.sub
    );

    const { subject, description, category, priority, status } = req.body || {};

    if (subject !== undefined) {
      if (!String(subject).trim()) {
        return res.status(400).json({
          message: 'Ticket subject cannot be empty.'
        });
      }
      ticket.subject = String(subject).trim();
    }

    if (description !== undefined) ticket.description = String(description).trim();
    if (category !== undefined) ticket.category = String(category).trim();

    if (priority !== undefined) {
      if (!PRIORITIES.includes(priority)) {
        return res.status(400).json({
          message: 'Invalid ticket priority.'
        });
      }
      ticket.priority = priority;
    }

    if (status !== undefined) {
      if (!STATUSES.includes(status)) {
        return res.status(400).json({
          message: 'Invalid ticket status.'
        });
      }

      if (status === 'Resolved' || status === 'Closed') {
        return res.status(403).json({
          message: 'Use the dedicated resolve or close permission.'
        });
      }

      if (ticket.status !== status) {
        const previousStatus = ticket.status;
        ticket.status = status;
        addHistory(ticket, currentUser, 'Status changed', `${previousStatus} → ${status}`);
      }
    }

    // Record the first response when an employee first updates a ticket.
    if (!ticket.firstResponseAt) {
      ticket.firstResponseAt = new Date().toISOString();
    }

    ticket.updatedAt = new Date().toISOString();

    await writeDb(db);

    res.json({ ticket });
  } catch (error) {
    next(error);
  }
});

// RESOLVE TICKET
router.patch('/:id/resolve', requirePermission('tickets.resolve'), async (req, res, next) => {
  try {
    const db = await readDb();
    const ticket = (db.tickets || []).find(
      item => item.id === req.params.id
    );

    if (!ticket) return notFound(res, 'Ticket');

    if (ticket.status === 'Closed') {
      return res.status(400).json({
        message: 'Closed tickets cannot be resolved.'
      });
    }

    const currentUser = db.users.find(
      user => user.id === req.auth.sub
    );

    const now = new Date().toISOString();

    ticket.status = 'Resolved';
    ticket.resolvedAt = now;
    ticket.updatedAt = now;
    ticket.firstResponseAt = ticket.firstResponseAt || now;

    addHistory(ticket, currentUser, 'Resolved', 'Ticket resolved.');

    await writeDb(db);

    res.json({
      message: 'Ticket resolved successfully.',
      ticket
    });
  } catch (error) {
    next(error);
  }
});

// CLOSE TICKET
router.patch('/:id/close', requirePermission('tickets.close'), async (req, res, next) => {
  try {
    const db = await readDb();
    const ticket = (db.tickets || []).find(
      item => item.id === req.params.id
    );

    if (!ticket) return notFound(res, 'Ticket');

    if (ticket.status !== 'Resolved') {
      return res.status(400).json({
        message: 'Only resolved tickets can be closed.'
      });
    }

    const currentUser = db.users.find(
      user => user.id === req.auth.sub
    );

    const now = new Date().toISOString();

    ticket.status = 'Closed';
    ticket.closedAt = now;
    ticket.updatedAt = now;

    addHistory(ticket, currentUser, 'Closed', 'Ticket closed.');

    await writeDb(db);

    res.json({
      message: 'Ticket closed successfully.',
      ticket
    });
  } catch (error) {
    next(error);
  }
});

// DELETE TICKET
router.delete('/:id', requirePermission('tickets.delete'), async (req, res, next) => {
  try {
    const db = await readDb();

    const index = (db.tickets || []).findIndex(
      item => item.id === req.params.id
    );

    if (index < 0) return notFound(res, 'Ticket');

    const [ticket] = db.tickets.splice(index, 1);

    await writeDb(db);

    res.json({
      message: 'Ticket deleted successfully.',
      ticket
    });
  } catch (error) {
    next(error);
  }
});

export default router;
