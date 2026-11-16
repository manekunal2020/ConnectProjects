
import { getUserPermissions } from '../config/permissions.js';

export function publicUser(user) {
  return {
    id: user.id,
    username: user.username,
    name: user.name,
    email: user.email || '',
    role: user.role,
    permissions: getUserPermissions(user),
  };
}

export function notFound(res, resource = 'Record') {
  return res.status(404).json({
    message: `${resource} not found.`
  });
}
