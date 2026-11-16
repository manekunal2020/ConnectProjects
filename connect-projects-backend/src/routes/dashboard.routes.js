
import { Router } from 'express';
import { readDb } from '../config/database.js';
import { requirePermission } from '../middleware/permissions.js';

const router = Router();

router.get('/', requirePermission('dashboard.view'), async (_req, res, next) => {
  try {
    const db = await readDb();

    const openTasks = db.tasks.filter(
      task => task.status !== 'Completed'
    );

    const overdueProjects = db.projects.filter(
      project =>
        project.status !== 'Completed' &&
        project.due &&
        new Date(`${project.due}T23:59:59`) < new Date()
    );

    const workloadMap = new Map();

    for (const task of openTasks) {
      if (task.assignee) {
        workloadMap.set(
          task.assignee,
          (workloadMap.get(task.assignee) || 0) + 1
        );
      }
    }

    res.json({
      totals: {
        projects: db.projects.length,
        active: db.projects.filter(
          project => project.status !== 'Completed'
        ).length,
        tasksOpen: openTasks.length,
        overdue: overdueProjects.length
      },
      projects: db.projects,
      tasks: db.tasks,
      activity: db.activity,
      workload: [...workloadMap].map(([name, open]) => ({
        name,
        open
      }))
    });
  } catch (error) {
    next(error);
  }
});

export default router;
