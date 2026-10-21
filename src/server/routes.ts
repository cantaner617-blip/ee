import express, { Request, Response } from 'express';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import path from 'node:path';
import { db } from './db.ts';
import { bunnyStorage } from './bunny.ts';
import {
  signToken,
  generateShortId,
  validateImageMagicBytes,
  getImageDimensions,
  createRateLimiter,
} from './security.ts';
import { optionalAuth, requireAuth, requireAdmin, AuthenticatedRequest } from './auth.ts';
import { ImageRecord, ImageVisibility, UserRole, UserStatus, ReportStatus } from './types.ts';

const router = express.Router();

// Configure Multer in-memory storage for streaming directly to Bunny.net
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 30 * 1024 * 1024, // Raw upload limit 30MB; validated against site_settings in handler
    files: 10, // Max 10 files per request
  },
});

// Rate limiters
const authLimiter = createRateLimiter(15 * 60 * 1000, 30, 'Giriş/Kayıt için çok fazla istek. 15 dakika sonra tekrar deneyin.');
const uploadLimiter = createRateLimiter(60 * 1000, 30, 'Yükleme sıklığı limiti aşıldı. Lütfen bir dakika bekleyin.');

// Helper to generate full sharing links
function buildShareLinks(image: ImageRecord, req: Request) {
  const host = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
  const viewUrl = `${host}/i/${image.id}`;
  const directCdnUrl = image.cdnUrl;

  return {
    viewUrl,
    directCdnUrl,
    htmlEmbed: `<img src="${directCdnUrl}" alt="${image.originalName}">`,
    markdownEmbed: `![${image.originalName}](${directCdnUrl})`,
    bbCodeEmbed: `[IMG]${directCdnUrl}[/IMG]`,
  };
}

// ==========================================
// 1. PUBLIC SETTINGS & HEALTH
// ==========================================

router.get('/settings/public', async (req: Request, res: Response) => {
  try {
    const settings = await db.getSiteSettings();
    const bunnyConfig = bunnyStorage.getConfig();

    res.json({
      siteName: settings.siteName,
      siteDescription: settings.siteDescription,
      maxFileSize: settings.maxFileSize,
      allowedFormats: settings.allowedFormats,
      allowGuestUpload: settings.allowGuestUpload,
      allowRegistration: settings.allowRegistration,
      maintenanceMode: settings.maintenanceMode,
      defaultVisibility: settings.defaultVisibility,
      storageStatus: {
        isBunnyConfigured: bunnyConfig.isConfigured,
        region: bunnyConfig.storageRegion,
        hasCdnUrl: Boolean(bunnyConfig.cdnBaseUrl && bunnyConfig.cdnBaseUrl !== 'Belirtilmedi'),
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Ayarlar getirilemedi.' });
  }
});

// Fallback local storage route for local development
router.get('/storage-fallback/*', (req: Request, res: Response) => {
  const storagePath = req.params[0];
  const fileBuffer = bunnyStorage.getLocalFile(storagePath);
  if (!fileBuffer) {
    return res.status(404).send('Görsel dosyası bulunamadı.');
  }

  const ext = path.extname(storagePath).toLowerCase();
  const mimeTypes: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
  };

  res.setHeader('Content-Type', mimeTypes[ext] || 'application/octet-stream');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.send(fileBuffer);
});

// ==========================================
// 2. AUTHENTICATION
// ==========================================

router.post('/auth/register', authLimiter, async (req: Request, res: Response) => {
  try {
    const settings = await db.getSiteSettings();
    if (!settings.allowRegistration) {
      return res.status(403).json({ error: 'Yeni üye kayıtları şu anda yönetici tarafından kapatılmıştır.' });
    }

    const { username, email, password } = req.body;

    if (!username || typeof username !== 'string' || username.trim().length < 3 || username.trim().length > 32) {
      return res.status(400).json({ error: 'Kullanıcı adı 3 ile 32 karakter arasında olmalıdır.' });
    }

    const validUsernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!validUsernameRegex.test(username.trim())) {
      return res.status(400).json({ error: 'Kullanıcı adı yalnızca harf, rakam, tire ve alt çizgi içerebilir.' });
    }

    if (!email || typeof email !== 'string' || !email.includes('@') || email.length > 120) {
      return res.status(400).json({ error: 'Geçerli bir e-posta adresi giriniz.' });
    }

    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ error: 'Şifre en az 6 karakter olmalıdır.' });
    }

    const existingUser = await db.getUserByUsername(username);
    if (existingUser) {
      return res.status(409).json({ error: 'Bu kullanıcı adı zaten kullanımda.' });
    }

    const existingEmail = await db.getUserByEmail(email);
    if (existingEmail) {
      return res.status(409).json({ error: 'Bu e-posta adresi ile zaten kayıt olunmuş.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const userId = 'usr_' + generateShortId(12);

    const newUser = await db.createUser({
      id: userId,
      username: username.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    const token = signToken({
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
    });

    res.status(201).json({
      message: 'Kayıt başarılı.',
      token,
      user: {
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Kayıt hatası:', err);
    res.status(500).json({ error: 'Kayıt sırasında sunucu hatası oluştu.' });
  }
});

router.post('/auth/login', authLimiter, async (req: Request, res: Response) => {
  try {
    const { login, password } = req.body;

    if (!login || !password) {
      return res.status(400).json({ error: 'Kullanıcı adı/e-posta ve şifre gereklidir.' });
    }

    // Try finding by username or email
    let user = await db.getUserByUsername(login);
    if (!user && login.includes('@')) {
      user = await db.getUserByEmail(login);
    }

    if (!user) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    if (user.status === 'banned') {
      return res.status(403).json({ error: 'Bu hesap askıya alınmıştır. Lütfen destek ile iletişime geçin.' });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(401).json({ error: 'Kullanıcı adı veya şifre hatalı.' });
    }

    const token = signToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    res.json({
      message: 'Giriş başarılı.',
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Giriş hatası:', err);
    res.status(500).json({ error: 'Giriş sırasında hata oluştu.' });
  }
});

router.post('/auth/logout', (req: Request, res: Response) => {
  res.json({ message: 'Başarıyla çıkış yapıldı.' });
});

router.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await db.getUserById(req.user!.userId);
    if (!user) {
      return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });
    }

    res.json({
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      status: user.status,
      createdAt: user.createdAt,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Kullanıcı bilgisi alınamadı.' });
  }
});

router.patch('/auth/password', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Geçerli bir mevcut şifre ve en az 6 karakterlik yeni şifre girin.' });
    }

    const user = await db.getUserById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Mevcut şifreniz hatalı.' });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.updateUserPassword(user.id, newHash);

    res.json({ message: 'Şifreniz başarıyla güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Şifre güncellenirken hata oluştu.' });
  }
});

router.delete('/auth/account', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { confirmPassword } = req.body;
    const user = await db.getUserById(req.user!.userId);
    if (!user) return res.status(404).json({ error: 'Kullanıcı bulunamadı.' });

    const match = await bcrypt.compare(confirmPassword, user.passwordHash);
    if (!match) {
      return res.status(400).json({ error: 'Hesap silme onayı için şifre hatalı.' });
    }

    // Delete user
    await db.deleteUser(user.id);
    res.json({ message: 'Hesabınız başarıyla silindi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Hesap silinirken hata oluştu.' });
  }
});

// ==========================================
// 3. IMAGE UPLOAD & SHARING
// ==========================================

router.post(
  '/images/upload',
  uploadLimiter,
  optionalAuth,
  upload.array('images', 10),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const settings = await db.getSiteSettings();

      // Check maintenance mode
      if (settings.maintenanceMode && req.user?.role !== 'admin') {
        return res.status(503).json({
          error: 'Platform şu anda bakım modundadır. Yükleme işlemleri geçici olarak durdurulmuştur.',
        });
      }

      // Check guest upload policy
      if (!req.user && !settings.allowGuestUpload) {
        return res.status(403).json({
          error: 'Misafir yüklemeleri kapalıdır. Görsel yüklemek için lütfen giriş yapın veya kayıt olun.',
        });
      }

      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) {
        return res.status(400).json({ error: 'Lütfen yüklenecek en az bir görsel dosyası seçin.' });
      }

      const visibility: ImageVisibility = ['public', 'unlisted', 'private'].includes(req.body.visibility)
        ? req.body.visibility
        : settings.defaultVisibility;

      // Expiration handling (minutes: 10, 60, 1440, 10080, or 0 / null for permanent)
      const expirationMinutes = parseInt(req.body.expirationMinutes || '0', 10);
      let deleteAt: string | null = null;
      if (expirationMinutes > 0) {
        deleteAt = new Date(Date.now() + expirationMinutes * 60 * 1000).toISOString();
      }

      const results = [];
      const errors = [];

      for (const file of files) {
        try {
          // 1. File size check
          if (file.size > settings.maxFileSize) {
            const maxMb = (settings.maxFileSize / (1024 * 1024)).toFixed(1);
            errors.push({
              filename: file.originalname,
              error: `Dosya boyutu sınırı aşıldı (${(file.size / (1024 * 1024)).toFixed(2)} MB). Maksimum izin: ${maxMb} MB.`,
            });
            continue;
          }

          // 2. Magic byte check (Strict verification)
          const magicCheck = validateImageMagicBytes(file.buffer);
          if (!magicCheck.valid || !magicCheck.detectedMime || !magicCheck.extension) {
            errors.push({
              filename: file.originalname,
              error: magicCheck.error || 'Dosya içeriği geçerli bir görsel formatı ile eşleşmiyor.',
            });
            continue;
          }

          // 3. Format whitelist check
          if (!settings.allowedFormats.includes(magicCheck.detectedMime)) {
            errors.push({
              filename: file.originalname,
              error: `Bu dosya formatına (${magicCheck.detectedMime}) izin verilmiyor.`,
            });
            continue;
          }

          // 4. Dimensions check & decompression bomb protection
          const dimensions = getImageDimensions(file.buffer);
          if (!dimensions.valid) {
            errors.push({
              filename: file.originalname,
              error: dimensions.error || 'Görsel çözünürlüğü okunamadı.',
            });
            continue;
          }

          // 5. Generate unique ID & storage path
          const imageId = generateShortId(10);
          const storagePath = bunnyStorage.generateStoragePath(imageId, magicCheck.extension);

          // 6. Upload to Bunny.net Storage
          const uploadRes = await bunnyStorage.uploadFile(storagePath, file.buffer, magicCheck.detectedMime);
          if (!uploadRes.success) {
            errors.push({
              filename: file.originalname,
              error: uploadRes.error || 'Bunny.net depolama alanına yükleme başarısız oldu.',
            });
            continue;
          }

          // 7. Store record in database
          const imageRecord: ImageRecord = {
            id: imageId,
            ownerId: req.user ? req.user.userId : null,
            originalName: file.originalname.slice(0, 200),
            storagePath,
            cdnUrl: uploadRes.cdnUrl,
            mimeType: magicCheck.detectedMime,
            extension: magicCheck.extension,
            sizeBytes: file.size,
            width: dimensions.width,
            height: dimensions.height,
            visibility,
            deleteAt,
            status: 'active',
            createdAt: new Date().toISOString(),
          };

          await db.createImage(imageRecord);

          // 8. Generate sharing links
          const links = buildShareLinks(imageRecord, req);

          results.push({
            ...imageRecord,
            isBunny: uploadRes.isBunny,
            links,
          });
        } catch (fileErr: any) {
          console.error(`Görsel işleme hatası (${file.originalname}):`, fileErr);
          errors.push({
            filename: file.originalname,
            error: 'Dosya işlenirken beklenmeyen bir hata oluştu: ' + fileErr.message,
          });
        }
      }

      if (results.length === 0 && errors.length > 0) {
        return res.status(400).json({
          error: 'Hiçbir görsel yüklenemedi.',
          details: errors,
        });
      }

      res.status(201).json({
        message: `${results.length} görsel başarıyla yüklendi.`,
        uploaded: results,
        errors: errors.length > 0 ? errors : undefined,
      });
    } catch (err: any) {
      console.error('Genel yükleme hatası:', err);
      res.status(500).json({ error: 'Yükleme sırasında sunucu hatası oluştu: ' + err.message });
    }
  }
);

router.get('/images/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const image = await db.getImageById(id);

    if (!image || image.status !== 'active') {
      return res.status(404).json({ error: 'Aradığınız görsel bulunamadı veya süresi dolduğu için silinmiş.' });
    }

    // Check expiration
    if (image.deleteAt && new Date(image.deleteAt).getTime() <= Date.now()) {
      return res.status(404).json({ error: 'Bu görselin saklanma süresi dolduğu için erişilemez.' });
    }

    // Privacy check:
    // 'public' and 'unlisted': accessible to anyone who has the link
    // 'private': only owner or admin can view
    if (image.visibility === 'private') {
      if (!req.user || (req.user.userId !== image.ownerId && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Bu görsel özeldir. Yalnızca yükleyen kullanıcı görüntüleyebilir.' });
      }
    }

    const links = buildShareLinks(image, req);
    const isOwner = req.user ? req.user.userId === image.ownerId : false;
    const isAdmin = req.user?.role === 'admin';

    res.json({
      ...image,
      links,
      canDelete: isOwner || isAdmin,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Görsel bilgisi alınamadı.' });
  }
});

router.get('/images/:id/links', (req: Request, res: Response) => {
  db.getImageById(req.params.id)
    .then((image) => {
      if (!image || image.status !== 'active') {
        return res.status(404).json({ error: 'Görsel bulunamadı.' });
      }
      res.json(buildShareLinks(image, req));
    })
    .catch(() => res.status(500).json({ error: 'Bağlantılar üretilemedi.' }));
});

router.delete('/images/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const image = await db.getImageById(id);

    if (!image) {
      return res.status(404).json({ error: 'Görsel bulunamadı.' });
    }

    // Permission check: owner or admin
    if (image.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Bu görseli silme yetkiniz bulunmamaktadır.' });
    }

    // Delete from Bunny.net Storage
    const storageRes = await bunnyStorage.deleteFile(image.storagePath);
    if (!storageRes.success) {
      console.warn(`Bunny storage silme uyarısı:`, storageRes.error);
    }

    // Update DB status
    await db.deleteImage(image.id);

    res.json({ message: 'Görsel başarıyla silindi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Görsel silinirken hata oluştu.' });
  }
});

router.post('/images/batch-delete', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { imageIds } = req.body;
    if (!Array.isArray(imageIds) || imageIds.length === 0) {
      return res.status(400).json({ error: 'Silinecek görsel ID listesi gereklidir.' });
    }

    let deleted = 0;
    for (const id of imageIds) {
      const img = await db.getImageById(id);
      if (img && (img.ownerId === req.user!.userId || req.user!.role === 'admin')) {
        await bunnyStorage.deleteFile(img.storagePath);
        await db.deleteImage(img.id);
        deleted++;
      }
    }

    res.json({ message: `${deleted} görsel başarıyla silindi.` });
  } catch (err: any) {
    res.status(500).json({ error: 'Toplu silme sırasında hata oluştu.' });
  }
});

router.get('/images/:id/download', async (req: Request, res: Response) => {
  try {
    const image = await db.getImageById(req.params.id);
    if (!image || image.status !== 'active') {
      return res.status(404).send('Görsel bulunamadı.');
    }

    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(image.originalName)}"`);
    res.setHeader('Content-Type', image.mimeType);

    // If Bunny CDN is configured, redirect to CDN URL
    if (bunnyStorage.isConfigured()) {
      return res.redirect(image.cdnUrl);
    }

    // If fallback, send local buffer
    const localBuf = bunnyStorage.getLocalFile(image.storagePath);
    if (localBuf) {
      return res.send(localBuf);
    }

    res.redirect(image.cdnUrl);
  } catch (err: any) {
    res.status(500).send('İndirme hatası.');
  }
});

router.post('/images/:id/report', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, details } = req.body;

    const image = await db.getImageById(id);
    if (!image) {
      return res.status(404).json({ error: 'Bildirilecek görsel bulunamadı.' });
    }

    if (!reason || typeof reason !== 'string') {
      return res.status(400).json({ error: 'Şikâyet gerekçesi belirtiniz.' });
    }

    const reportId = 'rep_' + generateShortId(10);
    await db.createReport({
      id: reportId,
      imageId: id,
      reason: reason.trim(),
      details: (details || '').trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json({ message: 'Şikâyetiniz incelenmek üzere iletildi. Teşekkür ederiz.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Şikâyet gönderilemedi.' });
  }
});

// User's own gallery
router.get('/images', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = req.query.search as string;
    const mimeType = req.query.mimeType as string;
    const visibility = req.query.visibility as ImageVisibility;

    const result = await db.getUserImages(req.user!.userId, {
      page,
      limit,
      search,
      mimeType,
      visibility,
    });

    const enriched = result.images.map((img) => ({
      ...img,
      links: buildShareLinks(img, req),
    }));

    res.json({
      images: enriched,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Görseller getirilemedi.' });
  }
});

// Recent public images for homepage showcase
router.get('/public-images', async (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string || '12', 10);
    const images = await db.getPublicImages(limit);
    const enriched = images.map((img) => ({
      id: img.id,
      originalName: img.originalName,
      cdnUrl: img.cdnUrl,
      width: img.width,
      height: img.height,
      mimeType: img.mimeType,
      createdAt: img.createdAt,
      links: buildShareLinks(img, req),
    }));
    res.json(enriched);
  } catch (err: any) {
    res.status(500).json({ error: 'Öne çıkan görseller getirilemedi.' });
  }
});

// ==========================================
// 4. ALBUMS
// ==========================================

router.get('/albums', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const albums = await db.getUserAlbums(req.user!.userId);
    res.json(albums);
  } catch (err: any) {
    res.status(500).json({ error: 'Albümler getirilemedi.' });
  }
});

router.post('/albums', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { title, description, visibility } = req.body;
    if (!title || typeof title !== 'string' || title.trim().length === 0) {
      return res.status(400).json({ error: 'Albüm başlığı zorunludur.' });
    }

    const albumId = 'alb_' + generateShortId(10);
    const album = await db.createAlbum({
      id: albumId,
      ownerId: req.user!.userId,
      title: title.trim(),
      description: (description || '').trim(),
      coverImageId: null,
      visibility: visibility || 'public',
      createdAt: new Date().toISOString(),
    });

    res.status(201).json(album);
  } catch (err: any) {
    res.status(500).json({ error: 'Albüm oluşturulamadı.' });
  }
});

router.get('/albums/:id', optionalAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const album = await db.getAlbumById(req.params.id);
    if (!album) {
      return res.status(404).json({ error: 'Albüm bulunamadı.' });
    }

    // Privacy check
    if (album.visibility === 'private') {
      if (!req.user || (req.user.userId !== album.ownerId && req.user.role !== 'admin')) {
        return res.status(403).json({ error: 'Bu albüm gizlidir.' });
      }
    }

    const images = await db.getAlbumImages(album.id);
    const enriched = images.map((img) => ({
      ...img,
      links: buildShareLinks(img, req),
    }));

    res.json({
      ...album,
      images: enriched,
      isOwner: req.user ? req.user.userId === album.ownerId : false,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Albüm detayları alınamadı.' });
  }
});

router.post('/albums/:id/add-images', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const album = await db.getAlbumById(req.params.id);
    if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
    if (album.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Bu albümü düzenleme yetkiniz yok.' });
    }

    const { imageIds } = req.body;
    if (!Array.isArray(imageIds)) return res.status(400).json({ error: 'Görsel listesi gereklidir.' });

    for (const imgId of imageIds) {
      await db.addImageToAlbum(album.id, imgId);
    }

    res.json({ message: 'Görseller albüme eklendi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Görseller albüme eklenemedi.' });
  }
});

router.delete('/albums/:id/remove-image', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const album = await db.getAlbumById(req.params.id);
    if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
    if (album.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Bu albümü düzenleme yetkiniz yok.' });
    }

    const { imageId } = req.body;
    await db.removeImageFromAlbum(album.id, imageId);

    res.json({ message: 'Görsel albümden çıkarıldı.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Görsel albümden çıkarılamadı.' });
  }
});

router.delete('/albums/:id', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const album = await db.getAlbumById(req.params.id);
    if (!album) return res.status(404).json({ error: 'Albüm bulunamadı.' });
    if (album.ownerId !== req.user!.userId && req.user!.role !== 'admin') {
      return res.status(403).json({ error: 'Bu albümü silme yetkiniz yok.' });
    }

    await db.deleteAlbum(album.id);
    res.json({ message: 'Albüm başarıyla silindi (Görselleriniz korunmuştur).' });
  } catch (err: any) {
    res.status(500).json({ error: 'Albüm silinirken hata oluştu.' });
  }
});

// ==========================================
// 5. ADMIN CONTROL PANEL
// ==========================================

router.get('/admin/stats', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const stats = await db.getStats();
    const bunnyConfig = bunnyStorage.getConfig();

    res.json({
      ...stats,
      bunnyConfig,
      storageFormatted: `${(stats.totalSizeBytes / (1024 * 1024)).toFixed(2)} MB`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'İstatistikler alınamadı.' });
  }
});

router.post('/admin/test-bunny', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const result = await bunnyStorage.testConnection();
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Test sırasında hata oluştu: ' + err.message });
  }
});

router.get('/admin/users', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await db.getAllUsers();
    const safeUsers = users.map((u) => ({
      id: u.id,
      username: u.username,
      email: u.email,
      role: u.role,
      status: u.status,
      createdAt: u.createdAt,
    }));
    res.json(safeUsers);
  } catch (err: any) {
    res.status(500).json({ error: 'Kullanıcılar alınamadı.' });
  }
});

router.patch('/admin/users/:id/role', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role } = req.body;
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Geçersiz rol.' });
    }
    await db.updateUserRole(req.params.id, role as UserRole);
    res.json({ message: 'Kullanıcı rolü güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Rol güncellenemedi.' });
  }
});

router.patch('/admin/users/:id/status', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['active', 'banned'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum.' });
    }
    await db.updateUserStatus(req.params.id, status as UserStatus);
    res.json({ message: 'Kullanıcı durumu güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Kullanıcı durumu güncellenemedi.' });
  }
});

router.get('/admin/images', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string || '1', 10);
    const limit = parseInt(req.query.limit as string || '20', 10);
    const search = req.query.search as string;

    const result = await db.getAllImagesAdmin(page, limit, search);
    res.json({
      images: result.images.map((img) => ({
        ...img,
        links: buildShareLinks(img, req),
      })),
      total: result.total,
      page,
      limit,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Görseller alınamadı.' });
  }
});

router.delete('/admin/images/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const image = await db.getImageById(req.params.id);
    if (!image) return res.status(404).json({ error: 'Görsel bulunamadı.' });

    await bunnyStorage.deleteFile(image.storagePath);
    await db.deleteImage(image.id);

    res.json({ message: 'Görsel yönetici tarafından kalıcı olarak silindi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Görsel silinemedi.' });
  }
});

router.get('/admin/reports', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const status = req.query.status as ReportStatus;
    const reports = await db.getReports(status);
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: 'Şikâyetler alınamadı.' });
  }
});

router.patch('/admin/reports/:id', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { status } = req.body;
    if (!['pending', 'resolved', 'dismissed'].includes(status)) {
      return res.status(400).json({ error: 'Geçersiz durum.' });
    }
    await db.updateReportStatus(req.params.id, status as ReportStatus);
    res.json({ message: 'Şikâyet durumu güncellendi.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Şikâyet güncellenemedi.' });
  }
});

router.patch('/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const updated = await db.updateSiteSettings(req.body);
    res.json({ message: 'Ayarlar başarıyla güncellendi.', settings: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Ayarlar kaydedilemedi.' });
  }
});

// ==========================================
// 6. SITEMAP XML (Only public active images)
// ==========================================

router.get('/sitemap.xml', async (req: Request, res: Response) => {
  try {
    const host = (process.env.APP_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');
    const publicImages = await db.getPublicImages(500);

    const staticUrls = [
      { loc: `${host}/`, changefreq: 'daily', priority: '1.0' },
      { loc: `${host}/hakkimizda`, changefreq: 'monthly', priority: '0.6' },
      { loc: `${host}/iletisim`, changefreq: 'monthly', priority: '0.6' },
      { loc: `${host}/gizlilik`, changefreq: 'monthly', priority: '0.5' },
      { loc: `${host}/kullanim-sartlari`, changefreq: 'monthly', priority: '0.5' },
      { loc: `${host}/dmca`, changefreq: 'monthly', priority: '0.5' },
    ];

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
`;

    for (const url of staticUrls) {
      xml += `  <url>
    <loc>${url.loc}</loc>
    <changefreq>${url.changefreq}</changefreq>
    <priority>${url.priority}</priority>
  </url>
`;
    }

    for (const img of publicImages) {
      xml += `  <url>
    <loc>${host}/i/${img.id}</loc>
    <lastmod>${img.createdAt.split('T')[0]}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
    <image:image>
      <image:loc>${img.cdnUrl}</image:loc>
      <image:title>${escapeXml(img.originalName)}</image:title>
    </image:image>
  </url>
`;
    }

    xml += `</urlset>`;

    res.setHeader('Content-Type', 'application/xml');
    res.send(xml);
  } catch (err: any) {
    res.status(500).send('Sitemap oluşturulamadı.');
  }
});

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export default router;
