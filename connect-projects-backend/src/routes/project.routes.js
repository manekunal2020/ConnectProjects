
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readDb, writeDb } from '../config/database.js';
import { requirePermission } from '../middleware/permissions.js';
import { notFound } from '../utils/http.js';

const router = Router();

// VIEW PROJECTS
router.get('/', requirePermission('projects.view'), async (_req, res, next) => {
  try {
    const db = await readDb();
    res.json({ projects: db.projects });
  } catch (error) {
    next(error);
  }
});

// CREATE PROJECT
router.post('/', requirePermission('projects.create'), async (req, res, next) => {
  try {
    const { name, lead, due } = req.body || {};

    if (!String(name || '').trim()) {
      return res.status(400).json({
        message: 'Project name is required.'
      });
    }

    const db = await readDb();

    const project = {
      id: randomUUID(),
      name: String(name).trim(),
      lead: String(lead || req.auth.username),
      status: 'On track',
      progress: 0,
      due: due || null,
      tasks: 0,
      done: 0,
      createdAt: new Date().toISOString()
    };

    db.projects.push(project);
    await writeDb(db);

    res.status(201).json({ project });
  } catch (error) {
    next(error);
  }
});

// UPDATE PROJECT
router.patch('/:id', requirePermission('projects.edit'), async (req, res, next) => {
  try {
    const db = await readDb();

    const project = db.projects.find(
      item => item.id === req.params.id
    );

    if (!project) {
      return notFound(res, 'Project');
    }

    const allowed = ['name', 'lead', 'status', 'progress', 'due'];

    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        project[key] = req.body[key];
      }
    }

    if (Number.isFinite(Number(project.progress))) {
      project.progress = Math.max(
        0,
        Math.min(100, Number(project.progress))
      );
    }

    await writeDb(db);

    res.json({ project });
  } catch (error) {
    next(error);
  }
});

// DELETE PROJECT
router.delete('/:id', requirePermission('projects.delete'), async (req, res, next) => {
  try {
    const db = await readDb();

    const index = db.projects.findIndex(
      item => item.id === req.params.id
    );

    if (index < 0) {
      return notFound(res, 'Project');
    }

    const [project] = db.projects.splice(index, 1);

    await writeDb(db);

    res.json({
      message: 'Project deleted.',
      project
    });
  } catch (error) {
    next(error);
  }
});

export default router;
