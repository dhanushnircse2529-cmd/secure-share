import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db, User } from '../db';
import { generateToken, authenticateUser, AuthRequest } from '../auth';

const router = Router();

// Register
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    const existingUser = db.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const newUser: User = {
      id: `usr_${crypto.randomBytes(8).toString('hex')}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      twoFactorEnabled: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.createUser(newUser);

    // Initial welcome notification
    db.createNotification({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: newUser.id,
      title: 'Welcome to SecureShare',
      message: 'Your cryptographic vault is active. All uploaded files will be encrypted using AES-256-GCM.',
      type: 'info',
      timestamp: new Date().toISOString(),
      read: false,
    });

    const token = generateToken(newUser);
    return res.status(201).json({
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        twoFactorEnabled: newUser.twoFactorEnabled,
        createdAt: newUser.createdAt,
      },
      token,
    });
  } catch (err: any) {
    console.error('Registration error:', err);
    return res.status(500).json({ error: 'Internal server error during registration' });
  }
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = db.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    return res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        twoFactorEnabled: user.twoFactorEnabled,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Current User Profile
router.get('/me', authenticateUser, (req: AuthRequest, res: Response) => {
  const user = req.user!;
  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    twoFactorEnabled: user.twoFactorEnabled,
    createdAt: user.createdAt,
  });
});

// Change Password
router.post('/change-password', authenticateUser, async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current password and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    db.updateUser(user.id, { passwordHash: newHash });

    db.createNotification({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      title: 'Password Changed',
      message: 'Your account security credentials were successfully updated.',
      type: 'success',
      timestamp: new Date().toISOString(),
      read: false,
    });

    return res.json({ message: 'Password updated successfully' });
  } catch (err) {
    console.error('Change password error:', err);
    return res.status(500).json({ error: 'Failed to update password' });
  }
});

// Toggle 2FA
router.post('/toggle-2fa', authenticateUser, (req: AuthRequest, res: Response) => {
  try {
    const user = req.user!;
    const newStatus = !user.twoFactorEnabled;

    db.updateUser(user.id, { twoFactorEnabled: newStatus });

    db.createNotification({
      id: `notif_${crypto.randomBytes(6).toString('hex')}`,
      userId: user.id,
      title: newStatus ? '2FA Protection Enabled' : '2FA Protection Disabled',
      message: newStatus ? 'Two-Factor Authentication requirement enabled for elevated account sessions.' : 'Two-Factor Authentication has been disabled.',
      type: newStatus ? 'success' : 'warning',
      timestamp: new Date().toISOString(),
      read: false,
    });

    return res.json({ twoFactorEnabled: newStatus, message: `2FA is now ${newStatus ? 'enabled' : 'disabled'}` });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update 2FA setting' });
  }
});

export default router;
