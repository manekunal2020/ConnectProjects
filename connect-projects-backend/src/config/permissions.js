
export const PERMISSIONS = {
  dashboard: [
    { key: 'dashboard.view', label: 'View Dashboard' },
  ],

  projects: [
    { key: 'projects.view', label: 'View Projects' },
    { key: 'projects.create', label: 'Create Projects' },
    { key: 'projects.edit', label: 'Edit Projects' },
    { key: 'projects.delete', label: 'Delete Projects' },
  ],

  tasks: [
    { key: 'tasks.view', label: 'View Tasks' },
    { key: 'tasks.create', label: 'Create Tasks' },
    { key: 'tasks.edit', label: 'Edit Tasks' },
    { key: 'tasks.delete', label: 'Delete Tasks' },
  ],

  tickets: [
    { key: 'tickets.view', label: 'View Tickets' },
    { key: 'tickets.create', label: 'Create Tickets' },
    { key: 'tickets.assign', label: 'Assign Tickets' },
    { key: 'tickets.update', label: 'Update Tickets' },
    { key: 'tickets.resolve', label: 'Resolve Tickets' },
    { key: 'tickets.close', label: 'Close Tickets' },
    { key: 'tickets.delete', label: 'Delete Tickets' },
  ],

  reports: [
    { key: 'reports.view', label: 'View Reports & Analytics' },
    { key: 'reports.generate', label: 'Generate Reports' },
    { key: 'reports.export', label: 'Export Excel, PDF and CSV' },
    { key: 'reports.schedule', label: 'Schedule Email Reports' },
  ],

  users: [
    { key: 'users.view', label: 'View Users' },
    { key: 'users.create', label: 'Create Users' },
    { key: 'users.edit', label: 'Edit Users' },
    { key: 'users.delete', label: 'Delete Users' },
  ],

  settings: [
    { key: 'settings.view', label: 'View Settings' },
    { key: 'settings.edit', label: 'Edit Settings' },
  ],
};

// Get every available permission key.
export const ALL_PERMISSION_KEYS = Object.values(PERMISSIONS)
  .flat()
  .map(permission => permission.key);

// Super User always has full access.
export function getUserPermissions(user) {
  if (user?.role === 'Super User') {
    return [...ALL_PERMISSION_KEYS];
  }

  return Array.isArray(user?.permissions)
    ? user.permissions.filter(permission =>
        ALL_PERMISSION_KEYS.includes(permission)
      )
    : [];
}

// Check whether a user has a particular permission.
export function hasPermission(user, permission) {
  if (user?.role === 'Super User') {
    return true;
  }

  return getUserPermissions(user).includes(permission);
}
