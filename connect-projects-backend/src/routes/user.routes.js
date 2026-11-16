
import { Router } from 'express';
import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { readDb, writeDb } from '../config/database.js';
import { ALL_PERMISSION_KEYS } from '../config/permissions.js';
import { publicUser, notFound } from '../utils/http.js';

const router = Router();

// Only the actual Super User account can manage users and permissions.
async function requireSuperUser(req, res, next) {
  try {
    const db = await readDb();
    const user = db.users.find(item => item.id === req.auth?.sub);

    if (!user || user.role !== 'Super User') {
      return res.status(403).json({
        message: 'Only the Super User can manage users and permissions.'
      });
    }

    req.currentUser = user;
    next();
  } catch (error) {
    next(error);
  }
}

// GET ALL USERS
router.get('/', requireSuperUser, async (req, res, next) => {
  try {
    const db = await readDb();

    res.json({
      users: db.users.map(publicUser)
    });
  } catch (error) {
    next(error);
  }
});

// CREATE USER
router.post('/', requireSuperUser, async (req, res, next) => {
  try {
    const { username, name, password, role } = req.body || {};

    if (
      !username ||
      !name ||
      !password ||
      !['Admin', 'Project Lead', 'Team Member'].includes(role)
    ) {
      return res.status(400).json({
        message: 'Username, name, password and a valid role are required.'
      });
    }

    if (String(password).length < 8 || String(password).length > 72) {
      return res.status(400).json({
        message: 'Password must contain between 8 and 72 characters.'
      });
    }

    const db = await readDb();

    if (db.users.some(
      user => user.username.toLowerCase() === String(username).trim().toLowerCase()
    )) {
      return res.status(409).json({
        message: 'Username already exists.'
      });
    }

    const user = {
      id: randomUUID(),
      username: String(username).trim(),
      name: String(name).trim(),
      role,
      permissions: [],
      passwordHash: await bcrypt.hash(password, 12)
    };

    db.users.push(user);
    await writeDb(db);

    res.status(201).json({
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

// UPDATE USER PERMISSIONS
router.put('/:id/permissions', requireSuperUser, async (req, res, next) => {
  try {
    const db = await readDb();

    const user = db.users.find(
      item => item.id === req.params.id
    );

    if (!user) {
      return notFound(res, 'User');
    }

    if (user.role === 'Super User') {
      return res.status(403).json({
        message: 'Super User permissions cannot be modified.'
      });
    }

    const permissions = req.body?.permissions;

    if (!Array.isArray(permissions)) {
      return res.status(400).json({
        message: 'Permissions must be provided as an array.'
      });
    }

    const invalidPermissions = permissions.filter(
      permission =>
        typeof permission !== 'string' ||
        !ALL_PERMISSION_KEYS.includes(permission)
    );

    if (invalidPermissions.length > 0) {
      return res.status(400).json({
        message: 'One or more permissions are invalid.',
        invalidPermissions
      });
    }

    user.permissions = [...new Set(permissions)];

    await writeDb(db);

    res.json({
      message: 'User permissions updated successfully.',
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

// DELETE USER
router.delete('/:id', requireSuperUser, async (req, res, next) => {
  try {
    const db = await readDb();

    const index = db.users.findIndex(
      user => user.id === req.params.id
    );

    if (index < 0) {
      return notFound(res, 'User');
    }

    if (db.users[index].role === 'Super User') {
      return res.status(403).json({
        message: 'The Super User account cannot be deleted.'
      });
    }

    const [user] = db.users.splice(index, 1);

    await writeDb(db);

    res.json({
      message: 'User deleted successfully.',
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
