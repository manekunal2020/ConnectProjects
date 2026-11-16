
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import bcrypt from 'bcryptjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, '../../data');
const dbFile = path.join(dataDir, 'db.json');

const initialData = async () => {
  const users = [
    {
      id: 'u-superuser',
      username: 'superuser',
      name: 'Kunal Mane',
      email: 'superuser@connectprojects.local',
      role: 'Super User',
      passwordHash: await bcrypt.hash('SuperUser@2026!', 10)
    },
    {
      id: 'u-admin',
      username: 'admin',
      name: 'Ananya Kulkarni',
      role: 'Admin',
      passwordHash: await bcrypt.hash('admin123', 10)
    },
    {
      id: 'u-lead',
      username: 'lead',
      name: 'Priya Nair',
      role: 'Project Lead',
      passwordHash: await bcrypt.hash('lead123', 10)
    },
    {
      id: 'u-member',
      username: 'member',
      name: 'Meera Joshi',
      role: 'Team Member',
      passwordHash: await bcrypt.hash('member123', 10)
    }
  ];

  return {
    users,
    accountRequests: [],
    reportSchedules: [],
    projects: [
      { id: 'p-1', name: 'Website Redesign', lead: 'Priya Nair', status: 'On track', progress: 72, due: '2026-11-28', tasks: 34, done: 24, createdAt: new Date().toISOString() },
      { id: 'p-2', name: 'Mobile App v2', lead: 'Arjun Mehta', status: 'At risk', progress: 41, due: '2026-11-15', tasks: 58, done: 24, createdAt: new Date().toISOString() },
      { id: 'p-3', name: 'Data Migration', lead: 'Sana Qureshi', status: 'On track', progress: 88, due: '2026-11-10', tasks: 21, done: 18, createdAt: new Date().toISOString() },
      { id: 'p-4', name: 'Client Portal', lead: 'Rohan Desai', status: 'Delayed', progress: 29, due: '2026-11-06', tasks: 40, done: 12, createdAt: new Date().toISOString() },
      { id: 'p-5', name: 'Internal Wiki', lead: 'Priya Nair', status: 'Completed', progress: 100, due: '2026-10-30', tasks: 16, done: 16, createdAt: new Date().toISOString() }
    ],
    tasks: [
      { id: 't-101', title: 'Finalize homepage wireframes', project: 'Website Redesign', due: '2026-11-05', priority: 'High', status: 'In progress', assignee: 'Meera Joshi' },
      { id: 't-102', title: 'Fix login token refresh bug', project: 'Mobile App v2', due: '2026-11-04', priority: 'High', status: 'To do', assignee: 'Meera Joshi' },
      { id: 't-103', title: 'Validate customer table import', project: 'Data Migration', due: '2026-11-07', priority: 'Medium', status: 'In progress', assignee: 'Sana Qureshi' },
      { id: 't-104', title: 'Write API docs for invoices', project: 'Client Portal', due: '2026-11-09', priority: 'Low', status: 'To do', assignee: 'Rohan Desai' },
      { id: 't-105', title: 'Review accessibility audit', project: 'Website Redesign', due: '2026-11-12', priority: 'Medium', status: 'To do', assignee: 'Meera Joshi' }
    ],
    tickets: [],
    activity: [
      { id: 'a-1', who: 'Priya Nair', what: 'completed', target: 'Header component', when: '12 min ago' },
      { id: 'a-2', who: 'Arjun Mehta', what: 'commented on', target: 'Fix login token refresh bug', when: '1 hr ago' },
      { id: 'a-3', who: 'Sana Qureshi', what: 'updated', target: 'Data Migration', when: 'Yesterday' }
    ]
  };
};

let writeQueue = Promise.resolve();

export async function readDb() {
  await fs.mkdir(dataDir, { recursive: true });

  try {
    const data = JSON.parse(await fs.readFile(dbFile, 'utf8'));

    let changed = false;

    if (!Array.isArray(data.accountRequests)) {
      data.accountRequests = [];
      changed = true;
    }

    // Initialize ticket storage for existing databases.
    if (!Array.isArray(data.tickets)) {
      data.tickets = [];
      changed = true;
    }

    if (!Array.isArray(data.reportSchedules)) {
      data.reportSchedules = [];
      changed = true;
    }

    // Add Super User to existing databases if missing.
    const superUserExists = data.users.some(
      user => user.username.toLowerCase() === 'superuser'
    );

    if (!superUserExists) {
      data.users.push({
        id: 'u-superuser',
        username: 'superuser',
        name: 'Kunal Mane',
        email: 'superuser@connectprojects.local',
        role: 'Super User',
        passwordHash: await bcrypt.hash('SuperUser@2026!', 10)
      });

      changed = true;
    }

    if (changed) {
      await writeDb(data);
    }

    return data;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;

    const fresh = await initialData();
    await fs.writeFile(dbFile, JSON.stringify(fresh, null, 2));

    return fresh;
  }
}

export async function writeDb(data) {
  writeQueue = writeQueue.then(async () => {
    await fs.mkdir(dataDir, { recursive: true });

    const tempFile = `${dbFile}.tmp`;

    await fs.writeFile(tempFile, JSON.stringify(data, null, 2));
    await fs.rename(tempFile, dbFile);
  });

  return writeQueue;
}
