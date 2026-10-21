import { Request, Response, NextFunction } from 'express';
import { verifyToken, TokenPayload } from './security.ts';
import { db } from './db.ts';

export interface AuthenticatedRequest extends Request {
  user?: TokenPayload;
}

/**
 * Optional authentication: attaches user to req if token is provided and valid
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyToken(token);
  if (payload) {
    // Check if user is still active in DB
    const user = await db.getUserById(payload.userId);
    if (user && user.status === 'active') {
      req.user = payload;
    }
  }
  next();
}

/**
 * Mandatory authentication: requires valid token and active user
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Bu işlem için giriş yapmanız gerekmektedir.' });
  }

  const token = authHeader.substring(7).trim();
  const payload = verifyToken(token);
  if (!payload) {
    return res.status(401).json({ error: 'Oturum süresi dolmuş veya geçersiz token.' });
  }

  const user = await db.getUserById(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'Kullanıcı bulunamadı.' });
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'Hesabınız askıya alınmıştır. Lütfen destekle iletişime geçin.' });
  }

  req.user = {
    userId: user.id,
    username: user.username,
    role: user.role,
  };

  next();
}

/**
 * Mandatory admin authentication: requires active admin role
 */
export async function requireAdmin(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Bu alana erişim yetkiniz bulunmamaktadır.' });
    }
    next();
  });
}
