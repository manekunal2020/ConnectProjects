import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readDb, writeDb } from '../config/database.js';
import { requirePermission } from '../middleware/permissions.js';
import { isEmailConfigured } from '../services/email.service.js';
import { notFound } from '../utils/http.js';

const router = Router();
const FREQUENCIES = ['daily', 'weekly', 'monthly'];
const isValidEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

router.get('/tickets', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const db = await readDb();
    let tickets = db.tickets || [];
    if (req.currentUser.role === 'Team Member') {
      tickets = tickets.filter(ticket => ticket.assigneeId === req.currentUser.id);
    }
    res.json({ tickets });
  } catch (error) {
    next(error);
  }
});

router.get('/schedules', requirePermission('reports.view'), async (req, res, next) => {
  try {
    const db = await readDb();
    const schedules = (db.reportSchedules || []).filter(
      schedule => schedule.createdBy === req.auth.sub
    );
    res.json({ schedules });
  } catch (error) {
    next(error);
  }
});

router.post('/schedules', requirePermission('reports.schedule'), async (req, res, next) => {
  try {
    if (!isEmailConfigured()) {
      return res.status(503).json({
        message: 'Email delivery is not configured. Set EMAIL_USER and EMAIL_APP_PASSWORD in the backend environment.'
      });
    }

    const email = String(req.body?.email || '').trim().toLowerCase();
    const frequency = String(req.body?.frequency || '');
    const time = String(req.body?.time || '');
    const timeZone = String(req.body?.timeZone || '');
    const weekday = Number(req.body?.weekday);
    const monthDay = Number(req.body?.monthDay);

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid recipient email address.' });
    }
    if (!FREQUENCIES.includes(frequency)) {
      return res.status(400).json({ message: 'Choose a daily, weekly, or monthly schedule.' });
    }
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
      return res.status(400).json({ message: 'Choose a valid send time.' });
    }
    try {
      new Intl.DateTimeFormat('en', { timeZone }).format(new Date());
    } catch {
      return res.status(400).json({ message: 'Choose a valid time zone.' });
    }
    if (frequency === 'weekly' && (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)) {
      return res.status(400).json({ message: 'Choose a valid day of the week.' });
    }
    if (frequency === 'monthly' && (!Number.isInteger(monthDay) || monthDay < 1 || monthDay > 28)) {
      return res.status(400).json({ message: 'Choose a day from 1 to 28.' });
    }

    const db = await readDb();
    const schedule = {
      id: randomUUID(),
      email,
      frequency,
      time,
      timeZone,
      ...(frequency === 'weekly' ? { weekday } : {}),
      ...(frequency === 'monthly' ? { monthDay } : {}),
      createdBy: req.auth.sub,
      createdAt: new Date().toISOString(),
      lastSentPeriod: null,
      lastSentAt: null,
    };

    db.reportSchedules = db.reportSchedules || [];
    db.reportSchedules.push(schedule);
    await writeDb(db);
    res.status(201).json({ schedule });
  } catch (error) {
    next(error);
  }
});

router.delete('/schedules/:id', requirePermission('reports.schedule'), async (req, res, next) => {
  try {
    const db = await readDb();
    const index = (db.reportSchedules || []).findIndex(
      schedule => schedule.id === req.params.id && schedule.createdBy === req.auth.sub
    );

    if (index < 0) return notFound(res, 'Report schedule');
    const [schedule] = db.reportSchedules.splice(index, 1);
    await writeDb(db);
    res.json({ schedule });
  } catch (error) {
    next(error);
  }
});

export default router;
