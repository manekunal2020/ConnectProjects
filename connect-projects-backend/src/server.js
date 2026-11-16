
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { readDb } from './config/database.js';

import { requireAuth } from './middleware/auth.js';

import authRoutes from './routes/auth.routes.js';
import projectRoutes from './routes/project.routes.js';
import taskRoutes from './routes/task.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import userRoutes from './routes/user.routes.js';
import ticketRoutes from './routes/ticket.routes.js';
import reportRoutes from './routes/report.routes.js';
import { startReportScheduler } from './services/report-scheduler.service.js';

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 24) {
  console.error(
    'JWT_SECRET is missing or too short. Copy .env.example to .env and set a long random secret.'
  );
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT || 5000);

// Allowed frontend origins
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'https://sumatool.netlify.app',
  ...(process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
];

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.error('Blocked CORS origin:', origin);
      return callback(new Error('Origin is not allowed by CORS.'));
    },
  })
);

app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'connect-projects-api',
  });
});

// Authentication routes
app.use('/api/auth', authRoutes);

// Protected API routes
app.use('/api', requireAuth);

app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/users', userRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/reports', reportRoutes);

// Not found handler
app.use((req, res) => {
  res.status(404).json({
    message: 'API endpoint not found.',
  });
});

// Error handler
app.use((error, _req, res, _next) => {
  console.error(error);

  res.status(500).json({
    message: error.message || 'Internal server error.',
  });
});

// Start server
await readDb();
startReportScheduler();

app.listen(port, () => {
  console.log(`Connect Projects API listening on http://localhost:${port}`);
});
