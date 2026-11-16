
import { readDb } from '../config/database.js';
import { hasPermission } from '../config/permissions.js';

export function requirePermission(permission) {
  return async (req, res, next) => {
    try {
      const db = await readDb();

      // Always fetch the latest user permissions.
      const user = db.users.find(
        item => item.id === req.auth?.sub
      );

      if (!user) {
        return res.status(401).json({
          message: 'User account no longer exists.'
        });
      }

      // Super User always has full access.
      if (user.role === 'Super User') {
        req.currentUser = user;
        return next();
      }

      if (!hasPermission(user, permission)) {
        return res.status(403).json({
          message: 'You do not have permission to perform this action.'
        });
      }

      req.currentUser = user;
      next();
    } catch (error) {
      next(error);
    }
  };
}
