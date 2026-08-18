import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db, User } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'secureshare-jwt-token-signature-secret-key-2026';

export interface AuthRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): any {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
}

export function authenticateUser(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  const token = authHeader.substring(7);
  const payload = verifyToken(token);

  if (!payload || !payload.id) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }

  const user = db.getUserById(payload.id);
  if (!user) {
    return res.status(401).json({ error: 'User account not found' });
  }

  req.user = user;
  next();
}

/**
 * Public recipient temporary access token (issued after password/OTP is verified for a share link)
 */
export function generateShareAccessToken(shareLinkId: string, token: string, email?: string): string {
  return jwt.sign(
    {
      shareLinkId,
      token,
      recipientEmail: email || null,
      type: 'share_access',
    },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

export function verifyShareAccessToken(jwtToken: string): any {
  try {
    return jwt.verify(jwtToken, JWT_SECRET);
  } catch (e) {
    return null;
  }
}
