import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
import bcrypt from 'bcryptjs';
import {
  User,
  ImageRecord,
  AlbumRecord,
  AlbumImageRecord,
  SiteSettings,
  ReportRecord,
  ImageVisibility,
  UserRole,
  UserStatus,
  ReportStatus,
} from './types.ts';

const DEFAULT_SETTINGS: SiteSettings = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  allowedFormats: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  allowGuestUpload: true,
  allowRegistration: true,
  maintenanceMode: false,
  defaultVisibility: 'public',
  siteName: 'ResimPaylaş',
  siteDescription: 'Hızlı, güvenli ve Bunny.net CDN altyapısıyla sınırsız görsel barındırma platformu.',
};

export class Database {
  private pgPool: pg.Pool | null = null;
  private isPostgres = false;
  private localDbPath: string;
  private inMemoryDb = {
    users: [] as User[],
    images: [] as ImageRecord[],
    albums: [] as AlbumRecord[],
    albumImages: [] as AlbumImageRecord[],
    siteSettings: { ...DEFAULT_SETTINGS },
    reports: [] as ReportRecord[],
  };

  constructor() {
    this.localDbPath = path.resolve(process.cwd(), 'data', 'resimpaylas-db.json');
  }

  public async init(): Promise<void> {
    const hasPgUrl = Boolean(process.env.DATABASE_URL?.trim());
    const hasPgHost = Boolean(process.env.PGHOST?.trim());

    if (hasPgUrl || hasPgHost) {
      try {
        const config: pg.PoolConfig = hasPgUrl
          ? {
              connectionString: process.env.DATABASE_URL,
              ssl: process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL?.includes('localhost')
                ? { rejectUnauthorized: false }
                : false,
              connectionTimeoutMillis: 10000,
            }
          : {
              host: process.env.PGHOST,
              port: parseInt(process.env.PGPORT || '5432', 10),
              user: process.env.PGUSER,
              password: process.env.PGPASSWORD,
              database: process.env.PGDATABASE,
              connectionTimeoutMillis: 10000,
            };

        this.pgPool = new pg.Pool(config);
        // Test query
        const client = await this.pgPool.connect();
        await client.query('SELECT NOW()');
        client.release();

        this.isPostgres = true;
        console.log('✅ PostgreSQL veritabanı başarıyla bağlandı. Migration çalıştırılıyor...');
        await this.runPgMigrations();
        return;
      } catch (err: any) {
        console.warn('⚠️ PostgreSQL bağlantısı kurulamadı. Yerel veri deposuna geçiliyor:', err.message);
        this.pgPool = null;
        this.isPostgres = false;
      }
    }

    // Initialize local JSON database
    this.initLocalDb();
  }

  public getStatus() {
    return {
      type: this.isPostgres ? 'PostgreSQL' : 'Local Persistent Storage (Dev/Fallback)',
      connected: true,
      hasPostgresConfig: Boolean(process.env.DATABASE_URL || process.env.PGHOST),
    };
  }

  private initLocalDb() {
    try {
      const dir = path.dirname(this.localDbPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      if (fs.existsSync(this.localDbPath)) {
        const data = fs.readFileSync(this.localDbPath, 'utf8');
        const parsed = JSON.parse(data);
        this.inMemoryDb = {
          users: parsed.users || [],
          images: parsed.images || [],
          albums: parsed.albums || [],
          albumImages: parsed.albumImages || [],
          siteSettings: { ...DEFAULT_SETTINGS, ...(parsed.siteSettings || {}) },
          reports: parsed.reports || [],
        };
      } else {
        // Seed initial admin user if not exists
        const adminHash = bcrypt.hashSync('admin123!', 10);
        this.inMemoryDb.users.push({
          id: 'admin_usr_01',
          username: 'admin',
          email: 'admin@resimpaylas.com',
          passwordHash: adminHash,
          role: 'admin',
          status: 'active',
          createdAt: new Date().toISOString(),
        });
        this.saveLocalDb();
      }
      console.log('✅ Yerel veritabanı hazır:', this.localDbPath);
    } catch (err: any) {
      console.error('Yerel veritabanı başlatma hatası:', err);
    }
  }

  private saveLocalDb() {
    if (this.isPostgres) return;
    try {
      const tempPath = `${this.localDbPath}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.inMemoryDb, null, 2), 'utf8');
      fs.renameSync(tempPath, this.localDbPath);
    } catch (err) {
      console.error('Veritabanı kaydetme hatası:', err);
    }
  }

  private async runPgMigrations(): Promise<void> {
    if (!this.pgPool) return;
    const client = await this.pgPool.connect();
    try {
      await client.query('BEGIN');

      // Users table
      await client.query(`
        CREATE TABLE IF NOT EXISTS users (
          id VARCHAR(64) PRIMARY KEY,
          username VARCHAR(64) UNIQUE NOT NULL,
          email VARCHAR(128) UNIQUE NOT NULL,
          password_hash VARCHAR(256) NOT NULL,
          role VARCHAR(16) NOT NULL DEFAULT 'user',
          status VARCHAR(16) NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Images table
      await client.query(`
        CREATE TABLE IF NOT EXISTS images (
          id VARCHAR(32) PRIMARY KEY,
          owner_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
          original_name VARCHAR(255) NOT NULL,
          storage_path VARCHAR(512) NOT NULL,
          cdn_url VARCHAR(1024) NOT NULL,
          mime_type VARCHAR(64) NOT NULL,
          extension VARCHAR(16) NOT NULL,
          size_bytes BIGINT NOT NULL,
          width INTEGER NOT NULL DEFAULT 0,
          height INTEGER NOT NULL DEFAULT 0,
          visibility VARCHAR(16) NOT NULL DEFAULT 'public',
          delete_at TIMESTAMPTZ,
          status VARCHAR(16) NOT NULL DEFAULT 'active',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_images_owner ON images(owner_id);
        CREATE INDEX IF NOT EXISTS idx_images_visibility ON images(visibility);
        CREATE INDEX IF NOT EXISTS idx_images_status ON images(status);
        CREATE INDEX IF NOT EXISTS idx_images_delete_at ON images(delete_at);
      `);

      // Albums table
      await client.query(`
        CREATE TABLE IF NOT EXISTS albums (
          id VARCHAR(32) PRIMARY KEY,
          owner_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(128) NOT NULL,
          description TEXT,
          cover_image_id VARCHAR(32),
          visibility VARCHAR(16) NOT NULL DEFAULT 'public',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_albums_owner ON albums(owner_id);
      `);

      // Album Images junction
      await client.query(`
        CREATE TABLE IF NOT EXISTS album_images (
          album_id VARCHAR(32) NOT NULL REFERENCES albums(id) ON DELETE CASCADE,
          image_id VARCHAR(32) NOT NULL REFERENCES images(id) ON DELETE CASCADE,
          sort_order INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY (album_id, image_id)
        );
      `);

      // Site Settings table
      await client.query(`
        CREATE TABLE IF NOT EXISTS site_settings (
          key VARCHAR(64) PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);

      // Reports table
      await client.query(`
        CREATE TABLE IF NOT EXISTS reports (
          id VARCHAR(32) PRIMARY KEY,
          image_id VARCHAR(32) NOT NULL REFERENCES images(id) ON DELETE CASCADE,
          reason VARCHAR(128) NOT NULL,
          details TEXT,
          status VARCHAR(16) NOT NULL DEFAULT 'pending',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
      `);

      // Create default admin user if no users exist
      const checkUsers = await client.query('SELECT id FROM users LIMIT 1');
      if (checkUsers.rowCount === 0) {
        const adminHash = bcrypt.hashSync('admin123!', 10);
        await client.query(
          'INSERT INTO users (id, username, email, password_hash, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW())',
          ['admin_usr_01', 'admin', 'admin@resimpaylas.com', adminHash, 'admin', 'active']
        );
        console.log('👑 Varsayılan admin kullanıcısı oluşturuldu: admin / admin123!');
      }

      await client.query('COMMIT');
      console.log('✅ PostgreSQL tabloları ve indexleri doğrulandı.');
    } catch (err: any) {
      await client.query('ROLLBACK');
      console.error('PostgreSQL migration hatası:', err);
      throw err;
    } finally {
      client.release();
    }
  }

  // ================= USERS =================

  public async createUser(user: User): Promise<User> {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO users (id, username, email, password_hash, role, status, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [user.id, user.username, user.email, user.passwordHash, user.role, user.status, user.createdAt]
      );
      return user;
    }
    this.inMemoryDb.users.push(user);
    this.saveLocalDb();
    return user;
  }

  public async getUserById(id: string): Promise<User | null> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [id]);
      if (res.rowCount === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role as UserRole,
        status: row.status as UserStatus,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      };
    }
    const found = this.inMemoryDb.users.find((u) => u.id === id);
    return found ? { ...found } : null;
  }

  public async getUserByUsername(username: string): Promise<User | null> {
    const cleanUsername = username.trim().toLowerCase();
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM users WHERE LOWER(username) = $1 LIMIT 1', [cleanUsername]);
      if (res.rowCount === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role as UserRole,
        status: row.status as UserStatus,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      };
    }
    const found = this.inMemoryDb.users.find((u) => u.username.toLowerCase() === cleanUsername);
    return found ? { ...found } : null;
  }

  public async getUserByEmail(email: string): Promise<User | null> {
    const cleanEmail = email.trim().toLowerCase();
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
      if (res.rowCount === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        username: row.username,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role as UserRole,
        status: row.status as UserStatus,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      };
    }
    const found = this.inMemoryDb.users.find((u) => u.email.toLowerCase() === cleanEmail);
    return found ? { ...found } : null;
  }

  public async updateUserPassword(id: string, passwordHash: string): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [passwordHash, id]);
      return (res.rowCount ?? 0) > 0;
    }
    const user = this.inMemoryDb.users.find((u) => u.id === id);
    if (!user) return false;
    user.passwordHash = passwordHash;
    this.saveLocalDb();
    return true;
  }

  public async updateUserStatus(id: string, status: UserStatus): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);
      return (res.rowCount ?? 0) > 0;
    }
    const user = this.inMemoryDb.users.find((u) => u.id === id);
    if (!user) return false;
    user.status = status;
    this.saveLocalDb();
    return true;
  }

  public async updateUserRole(id: string, role: UserRole): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
      return (res.rowCount ?? 0) > 0;
    }
    const user = this.inMemoryDb.users.find((u) => u.id === id);
    if (!user) return false;
    user.role = role;
    this.saveLocalDb();
    return true;
  }

  public async deleteUser(id: string): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('DELETE FROM users WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    }
    const initialLen = this.inMemoryDb.users.length;
    this.inMemoryDb.users = this.inMemoryDb.users.filter((u) => u.id !== id);
    this.saveLocalDb();
    return this.inMemoryDb.users.length < initialLen;
  }

  public async getAllUsers(): Promise<User[]> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM users ORDER BY created_at DESC');
      return res.rows.map((row) => ({
        id: row.id,
        username: row.username,
        email: row.email,
        passwordHash: row.password_hash,
        role: row.role as UserRole,
        status: row.status as UserStatus,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      }));
    }
    return [...this.inMemoryDb.users].reverse();
  }

  // ================= IMAGES =================

  public async createImage(image: ImageRecord): Promise<ImageRecord> {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(
        `INSERT INTO images 
        (id, owner_id, original_name, storage_path, cdn_url, mime_type, extension, size_bytes, width, height, visibility, delete_at, status, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
        [
          image.id,
          image.ownerId,
          image.originalName,
          image.storagePath,
          image.cdnUrl,
          image.mimeType,
          image.extension,
          image.sizeBytes,
          image.width,
          image.height,
          image.visibility,
          image.deleteAt ? new Date(image.deleteAt) : null,
          image.status,
          image.createdAt,
        ]
      );
      return image;
    }
    this.inMemoryDb.images.push(image);
    this.saveLocalDb();
    return image;
  }

  public async getImageById(id: string): Promise<ImageRecord | null> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM images WHERE id = $1 LIMIT 1', [id]);
      if (res.rowCount === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        ownerId: row.owner_id,
        originalName: row.original_name,
        storagePath: row.storage_path,
        cdnUrl: row.cdn_url,
        mimeType: row.mime_type,
        extension: row.extension,
        sizeBytes: Number(row.size_bytes),
        width: row.width,
        height: row.height,
        visibility: row.visibility as ImageVisibility,
        deleteAt: row.delete_at ? (row.delete_at.toISOString ? row.delete_at.toISOString() : String(row.delete_at)) : null,
        status: row.status,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      };
    }
    const found = this.inMemoryDb.images.find((img) => img.id === id);
    return found ? { ...found } : null;
  }

  public async deleteImage(id: string): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query("UPDATE images SET status = 'deleted' WHERE id = $1", [id]);
      return (res.rowCount ?? 0) > 0;
    }
    const img = this.inMemoryDb.images.find((i) => i.id === id);
    if (!img) return false;
    img.status = 'deleted';
    this.saveLocalDb();
    return true;
  }

  public async getUserImages(
    userId: string,
    options: {
      search?: string;
      mimeType?: string;
      visibility?: ImageVisibility;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ images: ImageRecord[]; total: number }> {
    const page = options.page || 1;
    const limit = options.limit || 20;
    const offset = (page - 1) * limit;

    if (this.isPostgres && this.pgPool) {
      let query = "SELECT * FROM images WHERE owner_id = $1 AND status = 'active'";
      let countQuery = "SELECT COUNT(*) FROM images WHERE owner_id = $1 AND status = 'active'";
      const params: any[] = [userId];

      if (options.search) {
        params.push(`%${options.search}%`);
        query += ` AND original_name ILIKE $${params.length}`;
        countQuery += ` AND original_name ILIKE $${params.length}`;
      }
      if (options.mimeType) {
        params.push(options.mimeType);
        query += ` AND mime_type = $${params.length}`;
        countQuery += ` AND mime_type = $${params.length}`;
      }
      if (options.visibility) {
        params.push(options.visibility);
        query += ` AND visibility = $${params.length}`;
        countQuery += ` AND visibility = $${params.length}`;
      }

      query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const [dataRes, countRes] = await Promise.all([
        this.pgPool.query(query, params),
        this.pgPool.query(countQuery, params),
      ]);

      const images = dataRes.rows.map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        originalName: row.original_name,
        storagePath: row.storage_path,
        cdnUrl: row.cdn_url,
        mimeType: row.mime_type,
        extension: row.extension,
        sizeBytes: Number(row.size_bytes),
        width: row.width,
        height: row.height,
        visibility: row.visibility as ImageVisibility,
        deleteAt: row.delete_at ? (row.delete_at.toISOString ? row.delete_at.toISOString() : String(row.delete_at)) : null,
        status: row.status,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      }));

      return {
        images,
        total: parseInt(countRes.rows[0].count, 10),
      };
    }

    let list = this.inMemoryDb.images.filter((img) => img.ownerId === userId && img.status === 'active');

    if (options.search) {
      const q = options.search.toLowerCase();
      list = list.filter((img) => img.originalName.toLowerCase().includes(q));
    }
    if (options.mimeType) {
      list = list.filter((img) => img.mimeType === options.mimeType);
    }
    if (options.visibility) {
      list = list.filter((img) => img.visibility === options.visibility);
    }

    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const total = list.length;
    const paginated = list.slice(offset, offset + limit);

    return { images: paginated, total };
  }

  public async getPublicImages(limit = 12): Promise<ImageRecord[]> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(
        "SELECT * FROM images WHERE visibility = 'public' AND status = 'active' ORDER BY created_at DESC LIMIT $1",
        [limit]
      );
      return res.rows.map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        originalName: row.original_name,
        storagePath: row.storage_path,
        cdnUrl: row.cdn_url,
        mimeType: row.mime_type,
        extension: row.extension,
        sizeBytes: Number(row.size_bytes),
        width: row.width,
        height: row.height,
        visibility: row.visibility as ImageVisibility,
        deleteAt: row.delete_at ? (row.delete_at.toISOString ? row.delete_at.toISOString() : String(row.delete_at)) : null,
        status: row.status,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      }));
    }

    return this.inMemoryDb.images
      .filter((img) => img.visibility === 'public' && img.status === 'active')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit);
  }

  public async getAllImagesAdmin(
    page = 1,
    limit = 20,
    search?: string
  ): Promise<{ images: ImageRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    if (this.isPostgres && this.pgPool) {
      let query = 'SELECT * FROM images WHERE 1=1';
      let countQuery = 'SELECT COUNT(*) FROM images WHERE 1=1';
      const params: any[] = [];

      if (search) {
        params.push(`%${search}%`);
        query += ` AND (original_name ILIKE $1 OR id ILIKE $1)`;
        countQuery += ` AND (original_name ILIKE $1 OR id ILIKE $1)`;
      }

      query += ` ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`;

      const [dataRes, countRes] = await Promise.all([
        this.pgPool.query(query, params),
        this.pgPool.query(countQuery, params),
      ]);

      return {
        images: dataRes.rows.map((row) => ({
          id: row.id,
          ownerId: row.owner_id,
          originalName: row.original_name,
          storagePath: row.storage_path,
          cdnUrl: row.cdn_url,
          mimeType: row.mime_type,
          extension: row.extension,
          sizeBytes: Number(row.size_bytes),
          width: row.width,
          height: row.height,
          visibility: row.visibility as ImageVisibility,
          deleteAt: row.delete_at ? (row.delete_at.toISOString ? row.delete_at.toISOString() : String(row.delete_at)) : null,
          status: row.status,
          createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
        })),
        total: parseInt(countRes.rows[0].count, 10),
      };
    }

    let list = [...this.inMemoryDb.images];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter((img) => img.originalName.toLowerCase().includes(q) || img.id.toLowerCase().includes(q));
    }
    list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return {
      images: list.slice(offset, offset + limit),
      total: list.length,
    };
  }

  public async getExpiredImages(): Promise<ImageRecord[]> {
    const nowIso = new Date().toISOString();
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(
        "SELECT * FROM images WHERE delete_at IS NOT NULL AND delete_at <= NOW() AND status = 'active'"
      );
      return res.rows.map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        originalName: row.original_name,
        storagePath: row.storage_path,
        cdnUrl: row.cdn_url,
        mimeType: row.mime_type,
        extension: row.extension,
        sizeBytes: Number(row.size_bytes),
        width: row.width,
        height: row.height,
        visibility: row.visibility as ImageVisibility,
        deleteAt: row.delete_at ? (row.delete_at.toISOString ? row.delete_at.toISOString() : String(row.delete_at)) : null,
        status: row.status,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      }));
    }

    return this.inMemoryDb.images.filter(
      (img) => img.deleteAt !== null && img.deleteAt <= nowIso && img.status === 'active'
    );
  }

  public async getStats(): Promise<{
    totalUsers: number;
    totalImages: number;
    activeImages: number;
    todayUploads: number;
    totalSizeBytes: number;
    pendingReports: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (this.isPostgres && this.pgPool) {
      const [usersCount, imagesCount, todayCount, storageSum, reportsCount] = await Promise.all([
        this.pgPool.query('SELECT COUNT(*) FROM users'),
        this.pgPool.query("SELECT COUNT(*) FROM images WHERE status = 'active'"),
        this.pgPool.query('SELECT COUNT(*) FROM images WHERE created_at >= $1', [today]),
        this.pgPool.query("SELECT COALESCE(SUM(size_bytes), 0) FROM images WHERE status = 'active'"),
        this.pgPool.query("SELECT COUNT(*) FROM reports WHERE status = 'pending'"),
      ]);

      const allImagesCount = await this.pgPool.query('SELECT COUNT(*) FROM images');

      return {
        totalUsers: parseInt(usersCount.rows[0].count, 10),
        totalImages: parseInt(allImagesCount.rows[0].count, 10),
        activeImages: parseInt(imagesCount.rows[0].count, 10),
        todayUploads: parseInt(todayCount.rows[0].count, 10),
        totalSizeBytes: Number(storageSum.rows[0].coalesce),
        pendingReports: parseInt(reportsCount.rows[0].count, 10),
      };
    }

    const todayIso = today.toISOString();
    const activeImages = this.inMemoryDb.images.filter((i) => i.status === 'active');
    const todayUploads = this.inMemoryDb.images.filter((i) => i.createdAt >= todayIso).length;
    const totalSizeBytes = activeImages.reduce((sum, img) => sum + img.sizeBytes, 0);
    const pendingReports = this.inMemoryDb.reports.filter((r) => r.status === 'pending').length;

    return {
      totalUsers: this.inMemoryDb.users.length,
      totalImages: this.inMemoryDb.images.length,
      activeImages: activeImages.length,
      todayUploads,
      totalSizeBytes,
      pendingReports,
    };
  }

  // ================= ALBUMS =================

  public async createAlbum(album: AlbumRecord): Promise<AlbumRecord> {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO albums (id, owner_id, title, description, cover_image_id, visibility, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [album.id, album.ownerId, album.title, album.description, album.coverImageId, album.visibility, album.createdAt]
      );
      return album;
    }
    this.inMemoryDb.albums.push(album);
    this.saveLocalDb();
    return album;
  }

  public async getAlbumById(id: string): Promise<AlbumRecord | null> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM albums WHERE id = $1 LIMIT 1', [id]);
      if (res.rowCount === 0) return null;
      const row = res.rows[0];
      return {
        id: row.id,
        ownerId: row.owner_id,
        title: row.title,
        description: row.description,
        coverImageId: row.cover_image_id,
        visibility: row.visibility as ImageVisibility,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      };
    }
    const found = this.inMemoryDb.albums.find((a) => a.id === id);
    return found ? { ...found } : null;
  }

  public async getUserAlbums(ownerId: string): Promise<AlbumRecord[]> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT * FROM albums WHERE owner_id = $1 ORDER BY created_at DESC', [ownerId]);
      return res.rows.map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        title: row.title,
        description: row.description,
        coverImageId: row.cover_image_id,
        visibility: row.visibility as ImageVisibility,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      }));
    }
    return this.inMemoryDb.albums
      .filter((a) => a.ownerId === ownerId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async deleteAlbum(id: string): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('DELETE FROM albums WHERE id = $1', [id]);
      return (res.rowCount ?? 0) > 0;
    }
    const initialLen = this.inMemoryDb.albums.length;
    this.inMemoryDb.albums = this.inMemoryDb.albums.filter((a) => a.id !== id);
    this.inMemoryDb.albumImages = this.inMemoryDb.albumImages.filter((ai) => ai.albumId !== id);
    this.saveLocalDb();
    return this.inMemoryDb.albums.length < initialLen;
  }

  public async addImageToAlbum(albumId: string, imageId: string, sortOrder = 0): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO album_images (album_id, image_id, sort_order) VALUES ($1, $2, $3) ON CONFLICT (album_id, image_id) DO NOTHING',
        [albumId, imageId, sortOrder]
      );
      return true;
    }
    const exists = this.inMemoryDb.albumImages.some((ai) => ai.albumId === albumId && ai.imageId === imageId);
    if (!exists) {
      this.inMemoryDb.albumImages.push({ albumId, imageId, sortOrder });
      this.saveLocalDb();
    }
    return true;
  }

  public async removeImageFromAlbum(albumId: string, imageId: string): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('DELETE FROM album_images WHERE album_id = $1 AND image_id = $2', [albumId, imageId]);
      return (res.rowCount ?? 0) > 0;
    }
    const initLen = this.inMemoryDb.albumImages.length;
    this.inMemoryDb.albumImages = this.inMemoryDb.albumImages.filter(
      (ai) => !(ai.albumId === albumId && ai.imageId === imageId)
    );
    this.saveLocalDb();
    return this.inMemoryDb.albumImages.length < initLen;
  }

  public async getAlbumImages(albumId: string): Promise<ImageRecord[]> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query(
        `SELECT i.* FROM images i
         INNER JOIN album_images ai ON ai.image_id = i.id
         WHERE ai.album_id = $1 AND i.status = 'active'
         ORDER BY ai.sort_order ASC, i.created_at DESC`,
        [albumId]
      );
      return res.rows.map((row) => ({
        id: row.id,
        ownerId: row.owner_id,
        originalName: row.original_name,
        storagePath: row.storage_path,
        cdnUrl: row.cdn_url,
        mimeType: row.mime_type,
        extension: row.extension,
        sizeBytes: Number(row.size_bytes),
        width: row.width,
        height: row.height,
        visibility: row.visibility as ImageVisibility,
        deleteAt: row.delete_at ? (row.delete_at.toISOString ? row.delete_at.toISOString() : String(row.delete_at)) : null,
        status: row.status,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      }));
    }

    const imageIds = this.inMemoryDb.albumImages
      .filter((ai) => ai.albumId === albumId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((ai) => ai.imageId);

    return imageIds
      .map((id) => this.inMemoryDb.images.find((img) => img.id === id && img.status === 'active'))
      .filter((img): img is ImageRecord => img !== undefined);
  }

  // ================= SITE SETTINGS =================

  public async getSiteSettings(): Promise<SiteSettings> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('SELECT key, value FROM site_settings');
      const settings = { ...DEFAULT_SETTINGS };
      for (const row of res.rows) {
        try {
          (settings as any)[row.key] = JSON.parse(row.value);
        } catch {
          (settings as any)[row.key] = row.value;
        }
      }
      return settings;
    }
    return { ...this.inMemoryDb.siteSettings };
  }

  public async updateSiteSettings(partial: Partial<SiteSettings>): Promise<SiteSettings> {
    if (this.isPostgres && this.pgPool) {
      const client = await this.pgPool.connect();
      try {
        await client.query('BEGIN');
        for (const [key, value] of Object.entries(partial)) {
          await client.query(
            `INSERT INTO site_settings (key, value, updated_at) 
             VALUES ($1, $2, NOW()) 
             ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
            [key, JSON.stringify(value)]
          );
        }
        await client.query('COMMIT');
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
      return this.getSiteSettings();
    }

    this.inMemoryDb.siteSettings = {
      ...this.inMemoryDb.siteSettings,
      ...partial,
    };
    this.saveLocalDb();
    return { ...this.inMemoryDb.siteSettings };
  }

  // ================= REPORTS =================

  public async createReport(report: ReportRecord): Promise<ReportRecord> {
    if (this.isPostgres && this.pgPool) {
      await this.pgPool.query(
        'INSERT INTO reports (id, image_id, reason, details, status, created_at) VALUES ($1, $2, $3, $4, $5, $6)',
        [report.id, report.imageId, report.reason, report.details, report.status, report.createdAt]
      );
      return report;
    }
    this.inMemoryDb.reports.push(report);
    this.saveLocalDb();
    return report;
  }

  public async getReports(status?: ReportStatus): Promise<ReportRecord[]> {
    if (this.isPostgres && this.pgPool) {
      let query = 'SELECT * FROM reports';
      const params: any[] = [];
      if (status) {
        query += ' WHERE status = $1';
        params.push(status);
      }
      query += ' ORDER BY created_at DESC';
      const res = await this.pgPool.query(query, params);
      return res.rows.map((row) => ({
        id: row.id,
        imageId: row.image_id,
        reason: row.reason,
        details: row.details,
        status: row.status as ReportStatus,
        createdAt: row.created_at.toISOString ? row.created_at.toISOString() : String(row.created_at),
      }));
    }
    let list = [...this.inMemoryDb.reports];
    if (status) {
      list = list.filter((r) => r.status === status);
    }
    return list.reverse();
  }

  public async updateReportStatus(id: string, status: ReportStatus): Promise<boolean> {
    if (this.isPostgres && this.pgPool) {
      const res = await this.pgPool.query('UPDATE reports SET status = $1 WHERE id = $2', [status, id]);
      return (res.rowCount ?? 0) > 0;
    }
    const report = this.inMemoryDb.reports.find((r) => r.id === id);
    if (!report) return false;
    report.status = status;
    this.saveLocalDb();
    return true;
  }
}

export const db = new Database();
