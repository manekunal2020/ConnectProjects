
import { Router } from 'express';
import {
  randomUUID,
  randomBytes,
  createHash
} from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readDb, writeDb } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { publicUser } from '../utils/http.js';
import { sendPasswordResetEmail } from '../services/email.service.js';

const router = Router();

function requireSuperUser(req, res, next) {
  if (req.auth?.role !== 'Super User') {
    return res.status(403).json({
      message: 'Only Super Users can manage account enquiries.'
    });
  }
  next();
}

const isValidEmail = (email) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

// LOGIN
router.post('/login', async (req, res, next) => {
  try {
    const username = String(req.body?.username || '').trim().toLowerCase();
    const password = String(req.body?.password || '');

    if (!username || !password) {
      return res.status(400).json({
        message: 'Username and password are required.'
      });
    }

    const db = await readDb();

    const user = db.users.find(
      item => item.username.toLowerCase() === username
    );

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({
        message: 'Incorrect username or password.'
      });
    }

    const token = jwt.sign(
      {
        sub: user.id,
        username: user.username,
        role: user.role
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    res.json({
      token,
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

// FORGOT PASSWORD
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Please provide a valid email address.'
      });
    }

    const db = await readDb();

    const user = db.users.find(
      item => String(item.email || '').toLowerCase() === email
    );

    // Always return the same response to avoid revealing registered emails.
    const successMessage =
      'If an account exists with this email address, a password reset link will be sent.';

    if (!user) {
      return res.json({ message: successMessage });
    }

    const resetToken = randomBytes(32).toString('hex');

    const resetTokenHash = createHash('sha256')
      .update(resetToken)
      .digest('hex');

    user.resetTokenHash = resetTokenHash;
    user.resetTokenExpires = Date.now() + 15 * 60 * 1000;

    await writeDb(db);

    const resetLink =
      `${process.env.APP_URL}/reset-password?token=${resetToken}`;

    try {
      await sendPasswordResetEmail(user.email, resetLink);
    } catch (emailError) {
      // Remove the token if the email could not be sent.
      const latestDb = await readDb();
      const latestUser = latestDb.users.find(
        item => item.id === user.id
      );

      if (latestUser) {
        delete latestUser.resetTokenHash;
        delete latestUser.resetTokenExpires;
        await writeDb(latestDb);
      }

      throw emailError;
    }

    res.json({ message: successMessage });
  } catch (error) {
    next(error);
  }
});

// RESET PASSWORD
router.post('/reset-password', async (req, res, next) => {
  try {
    const token = String(req.body?.token || '');
    const newPassword = String(req.body?.password || '');

    if (!token || !newPassword) {
      return res.status(400).json({
        message: 'Reset token and new password are required.'
      });
    }

    if (newPassword.length < 12 || newPassword.length > 72) {
      return res.status(400).json({
        message: 'Password must be between 12 and 72 characters.'
      });
    }

    const tokenHash = createHash('sha256')
      .update(token)
      .digest('hex');

    const db = await readDb();

    const user = db.users.find(
      item =>
        item.resetTokenHash === tokenHash &&
        item.resetTokenExpires > Date.now()
    );

    if (!user) {
      return res.status(400).json({
        message: 'This password reset link is invalid or has expired. Please request a new one.'
      });
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);

    // Make the reset link single-use.
    delete user.resetTokenHash;
    delete user.resetTokenExpires;

    await writeDb(db);

    res.json({
      message: 'Your password has been reset successfully. You can now log in with your new password.'
    });
  } catch (error) {
    next(error);
  }
});

// SUBMIT ACCOUNT ENQUIRY
router.post('/account-requests', async (req, res, next) => {
  try {
    const name = String(req.body?.name || '').trim();
    const username = String(req.body?.username || '').trim().toLowerCase();
    const email = String(req.body?.email || '').trim().toLowerCase();

    if (!name || !username || !email) {
      return res.status(400).json({
        message: 'Name, username, and email are required.'
      });
    }

    if (!/^[a-z0-9._-]{3,30}$/i.test(username)) {
      return res.status(400).json({
        message: 'Please provide a valid username.'
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: 'Please provide a valid email address.'
      });
    }

    const db = await readDb();
    db.accountRequests = db.accountRequests || [];

    const usernameExists = db.users.some(
      user => user.username.toLowerCase() === username
    );

    const emailExists = db.users.some(
      user => String(user.email || '').toLowerCase() === email
    );

    const requestExists = db.accountRequests.some(
      request =>
        request.status === 'Pending' &&
        (request.username === username || request.email === email)
    );

    if (usernameExists || emailExists || requestExists) {
      return res.status(409).json({
        message: 'This username or email is already registered or has a pending enquiry.'
      });
    }

    const accountRequest = {
      id: randomUUID(),
      name,
      username,
      email,
      status: 'Pending',
      submittedAt: new Date().toISOString()
    };

    db.accountRequests.push(accountRequest);
    await writeDb(db);

    res.status(201).json({
      message: 'Your account enquiry has been submitted successfully.',
      request: {
        id: accountRequest.id,
        status: accountRequest.status
      }
    });
  } catch (error) {
    next(error);
  }
});

// GET PENDING ACCOUNT ENQUIRIES
router.get(
  '/account-requests',
  requireAuth,
  requireSuperUser,
  async (req, res, next) => {
    try {
      const db = await readDb();
      db.accountRequests = db.accountRequests || [];

      const pendingRequests = db.accountRequests
        .filter(request => request.status === 'Pending')
        .map(request => ({
          ...request,
          submittedAt: request.submittedAt || request.createdAt
        }));

      res.json(pendingRequests);
    } catch (error) {
      next(error);
    }
  }
);

// APPROVE ACCOUNT ENQUIRY
router.post(
  '/account-requests/:id/approve',
  requireAuth,
  requireSuperUser,
  async (req, res, next) => {
    try {
      const password = String(req.body?.password || '');

      if (password.length < 12 || password.length > 72) {
        return res.status(400).json({
          message: 'Temporary password must be between 12 and 72 characters.'
        });
      }

      const db = await readDb();
      db.accountRequests = db.accountRequests || [];

      const request = db.accountRequests.find(
        item => item.id === req.params.id
      );

      if (!request || request.status !== 'Pending') {
        return res.status(404).json({
          message: 'Pending account enquiry not found.'
        });
      }

      const usernameExists = db.users.some(
        user => user.username.toLowerCase() === request.username.toLowerCase()
      );

      const emailExists = db.users.some(
        user => String(user.email || '').toLowerCase() === request.email.toLowerCase()
      );

      if (usernameExists || emailExists) {
        return res.status(409).json({
          message: 'This username or email is already registered.'
        });
      }

      const newUser = {
        id: randomUUID(),
        username: request.username,
        name: request.name,
        email: request.email,
        role: 'Project Lead',
        passwordHash: await bcrypt.hash(password, 10)
      };

      db.users.push(newUser);

      request.status = 'Approved';
      request.approvedAt = new Date().toISOString();
      request.approvedBy = req.auth.sub;

      await writeDb(db);

      res.status(201).json({
        message: 'Account approved and created successfully.',
        user: publicUser(newUser)
      });
    } catch (error) {
      next(error);
    }
  }
);

// REJECT ACCOUNT ENQUIRY
router.post(
  '/account-requests/:id/reject',
  requireAuth,
  requireSuperUser,
  async (req, res, next) => {
    try {
      const db = await readDb();
      db.accountRequests = db.accountRequests || [];

      const request = db.accountRequests.find(
        item => item.id === req.params.id
      );

      if (!request || request.status !== 'Pending') {
        return res.status(404).json({
          message: 'Pending account enquiry not found.'
        });
      }

      request.status = 'Rejected';
      request.rejectedAt = new Date().toISOString();
      request.rejectedBy = req.auth.sub;

      await writeDb(db);

      res.json({
        message: 'Account enquiry rejected successfully.'
      });
    } catch (error) {
      next(error);
    }
  }
);

// GET LOGGED-IN USER
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const db = await readDb();

    const user = db.users.find(
      item => item.id === req.auth.sub
    );

    if (!user) {
      return res.status(401).json({
        message: 'User account no longer exists.'
      });
    }

    res.json({
      user: publicUser(user)
    });
  } catch (error) {
    next(error);
  }
});

export default router;
