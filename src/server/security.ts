import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import sizeOf from 'image-size';
import { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || 'resimpaylas-default-development-jwt-secret-do-not-use-in-production-32c';

export interface TokenPayload {
  userId: string;
  username: string;
  role: 'user' | 'admin';
}

/**
 * Generate secure JWT token
 */
export function signToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch {
    return null;
  }
}

/**
 * Generate cryptographically random, clean ID for images and albums (10 chars)
 */
export function generateShortId(length = 10): string {
  const chars = '23456789abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars[bytes[i] % chars.length];
  }
  return result;
}

export interface MagicValidationResult {
  valid: boolean;
  detectedMime: string | null;
  extension: string | null;
  error?: string;
}

/**
 * Validates real magic bytes from file buffer header
 * Rejects SVGs to prevent stored XSS attacks
 */
export function validateImageMagicBytes(buffer: Buffer): MagicValidationResult {
  if (!buffer || buffer.length < 12) {
    return { valid: false, detectedMime: null, extension: null, error: 'Dosya içeriği geçersiz veya çok küçük.' };
  }

  // 1. JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, detectedMime: 'image/jpeg', extension: 'jpg' };
  }

  // 2. PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, detectedMime: 'image/png', extension: 'png' };
  }

  // 3. GIF: 'GIF87a' or 'GIF89a' (47 49 46 38)
  if (
    buffer[0] === 0x47 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x38 &&
    (buffer[4] === 0x37 || buffer[4] === 0x39) &&
    buffer[5] === 0x61
  ) {
    return { valid: true, detectedMime: 'image/gif', extension: 'gif' };
  }

  // 4. WebP: 'RIFF' .... 'WEBP'
  // Bytes 0-3: 52 49 46 46 (RIFF), Bytes 8-11: 57 45 42 50 (WEBP)
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    return { valid: true, detectedMime: 'image/webp', extension: 'webp' };
  }

  // Reject SVG explicitly
  const headerText = buffer.subarray(0, 100).toString('utf8').toLowerCase();
  if (headerText.includes('<svg') || headerText.includes('<?xml') || headerText.includes('xmlns=')) {
    return {
      valid: false,
      detectedMime: null,
      extension: null,
      error: 'Güvenlik gerekçesiyle SVG dosyaları kabul edilmemektedir (XSS koruması). Lütfen PNG, JPG, WebP veya GIF yükleyin.',
    };
  }

  return {
    valid: false,
    detectedMime: null,
    extension: null,
    error: 'Desteklenmeyen görsel formatı. Yalnızca JPEG, PNG, WEBP ve GIF formatları desteklenir.',
  };
}

/**
 * Get image dimensions safely and protect against decompression bombs
 */
export function getImageDimensions(buffer: Buffer): { width: number; height: number; valid: boolean; error?: string } {
  try {
    const dimensions = sizeOf(buffer);
    const width = dimensions.width || 0;
    const height = dimensions.height || 0;

    // Protection against decompression bombs (max 16384x16384 px)
    if (width > 16384 || height > 16384) {
      return {
        width,
        height,
        valid: false,
        error: `Görsel çözünürlüğü çok yüksek (${width}x${height}). Maksimum çözünürlük 16384x16384 pikseldir.`,
      };
    }

    return { width, height, valid: true };
  } catch (err: any) {
    return { width: 0, height: 0, valid: false, error: 'Görsel boyutları okunamadı: ' + err.message };
  }
}

/**
 * In-memory sliding-window rate limiter
 */
interface RateLimitBucket {
  count: number;
  resetAt: number;
}
const ipBuckets = new Map<string, RateLimitBucket>();

export function createRateLimiter(windowMs: number, maxRequests: number, message = 'Çok fazla istek yapıldı. Lütfen biraz bekleyin.') {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() || req.ip || req.socket.remoteAddress || 'unknown';
    const key = `${req.baseUrl || req.path}_${ip}`;
    const now = Date.now();

    const bucket = ipBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      ipBuckets.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }

    if (bucket.count >= maxRequests) {
      const waitSec = Math.ceil((bucket.resetAt - now) / 1000);
      return res.status(429).json({
        error: message,
        retryAfterSeconds: waitSec,
      });
    }

    bucket.count += 1;
    next();
  };
}

// Clean up stale buckets every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of ipBuckets.entries()) {
    if (now > bucket.resetAt) {
      ipBuckets.delete(key);
    }
  }
}, 5 * 60 * 1000);
