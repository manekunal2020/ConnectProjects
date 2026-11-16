
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import { readDb, writeDb } from '../config/database.js';
import { requirePermission } from '../middleware/permissions.js';
import { notFound } from '../utils/http.js';

const router = Router();

// VIEW TASKS
router.get('/', requirePermission('tasks.view'), async (req, res, next) => {
  try {
    const db = await readDb();

    const currentUser = db.users.find(
      user => user.id === req.auth.sub
    );

    const tasks = currentUser?.role === 'Team Member'
      ? db.tasks.filter(task => task.assignee === currentUser.name)
      : db.tasks;

    res.json({ tasks });
  } catch (error) {
    next(error);
  }
});

// CREATE TASK
router.post('/', requirePermission('tasks.create'), async (req, res, next) => {
  try {
    const {
      title,
      project,
      due,
      priority = 'Medium',
      assignee = ''
    } = req.body || {};

    if (!String(title || '').trim()) {
      return res.status(400).json({
        message: 'Task title is required.'
      });
    }

    const db = await readDb();

    const task = {
      id: randomUUID(),
      title: String(title).trim(),
      project: String(project || ''),
      due: due || null,
      priority,
      status: 'To do',
      assignee,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      completedAt: null
    };

    db.tasks.push(task);

    const projectRecord = db.projects.find(
      item => item.name === task.project
    );

    if (projectRecord) {
      projectRecord.tasks = (projectRecord.tasks || 0) + 1;
    }

    await writeDb(db);

    res.status(201).json({ task });
  } catch (error) {
    next(error);
  }
});

// UPDATE TASK
router.patch('/:id', requirePermission('tasks.edit'), async (req, res, next) => {
  try {
    const db = await readDb();

    const task = db.tasks.find(
      item => item.id === req.params.id
    );

    if (!task) {
      return notFound(res, 'Task');
    }

    const allowed = [
      'title',
      'project',
      'due',
      'priority',
      'status',
      'assignee'
    ];

    for (const key of allowed) {
      if (req.body?.[key] !== undefined) {
        task[key] = req.body[key];
      }
    }

    task.updatedAt = new Date().toISOString();

    if (task.status === 'Completed') {
      task.completedAt = task.completedAt || new Date().toISOString();
    } else {
      task.completedAt = null;
    }

    await writeDb(db);

    res.json({ task });
  } catch (error) {
    next(error);
  }
});

// DELETE TASK
router.delete('/:id', requirePermission('tasks.delete'), async (req, res, next) => {
  try {
    const db = await readDb();

    const index = db.tasks.findIndex(
      item => item.id === req.params.id
    );

    if (index < 0) {
      return notFound(res, 'Task');
    }

    const [task] = db.tasks.splice(index, 1);

    const projectRecord = db.projects.find(
      item => item.name === task.project
    );

    if (projectRecord) {
      projectRecord.tasks = Math.max(0, (projectRecord.tasks || 0) - 1);
    }

    await writeDb(db);

    res.json({
      message: 'Task deleted.',
      task
    });
  } catch (error) {
    next(error);
  }
});

export default router;
