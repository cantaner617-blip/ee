import 'dotenv/config';
import https from 'node:https';
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { BunnyConfig } from './types.ts';

const REGION_ENDPOINTS: Record<string, string> = {
  de: 'storage.bunnycdn.com',
  default: 'storage.bunnycdn.com',
  uk: 'uk.storage.bunnycdn.com',
  ny: 'ny.storage.bunnycdn.com',
  la: 'la.storage.bunnycdn.com',
  sg: 'sg.storage.bunnycdn.com',
  syd: 'syd.storage.bunnycdn.com',
  se: 'se.storage.bunnycdn.com',
  br: 'br.storage.bunnycdn.com',
  jh: 'jh.storage.bunnycdn.com',
};

export class BunnyStorageService {
  private localFallbackDir: string;

  constructor() {
    this.localFallbackDir = path.resolve(process.cwd(), 'data', 'storage');
    if (!fs.existsSync(this.localFallbackDir)) {
      fs.mkdirSync(this.localFallbackDir, { recursive: true });
    }
  }

  public get config(): BunnyConfig {
    return {
      storageZone: process.env.BUNNY_STORAGE_ZONE?.trim() || '',
      storagePassword: process.env.BUNNY_STORAGE_PASSWORD?.trim() || '',
      storageRegion: (process.env.BUNNY_STORAGE_REGION?.trim().toLowerCase() || 'de'),
      cdnBaseUrl: (process.env.BUNNY_CDN_BASE_URL?.trim() || '').replace(/\/+$/, ''),
      apiKey: process.env.BUNNY_API_KEY?.trim() || '',
    };
  }

  /**
   * Check if Bunny.net Storage Zone credentials and CDN URL are configured
   */
  public isConfigured(): boolean {
    return Boolean(
      this.config.storageZone &&
      this.config.storagePassword &&
      this.config.cdnBaseUrl
    );
  }

  public getConfig() {
    return {
      storageZone: this.config.storageZone || 'Belirtilmedi',
      storageRegion: this.config.storageRegion || 'de',
      cdnBaseUrl: this.config.cdnBaseUrl || 'Belirtilmedi',
      hasPassword: Boolean(this.config.storagePassword),
      hasApiKey: Boolean(this.config.apiKey),
      isConfigured: this.isConfigured(),
    };
  }

  private getStorageHost(): string {
    const region = this.config.storageRegion.toLowerCase();
    return REGION_ENDPOINTS[region] || REGION_ENDPOINTS.de;
  }

  /**
   * Generate safe storage path: images/YYYY/MM/{uniqueId}.{ext}
   */
  public generateStoragePath(id: string, extension: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const safeExt = extension.replace(/^\./, '').toLowerCase();
    return `images/${year}/${month}/${id}.${safeExt}`;
  }

  /**
   * Build public CDN URL from configured base URL
   */
  public getCdnUrl(storagePath: string, reqAppUrl?: string): string {
    if (this.isConfigured()) {
      return `${this.config.cdnBaseUrl}/${storagePath}`;
    }
    // Fallback: local development URL
    const baseUrl = (process.env.APP_URL || reqAppUrl || 'http://localhost:3000').replace(/\/+$/, '');
    return `${baseUrl}/api/storage-fallback/${storagePath}`;
  }

  /**
   * Upload buffer to Bunny.net Storage Zone
   */
  public async uploadFile(
    storagePath: string,
    fileBuffer: Buffer,
    mimeType: string
  ): Promise<{ success: boolean; cdnUrl: string; isBunny: boolean; error?: string }> {
    if (this.isConfigured()) {
      try {
        const host = this.getStorageHost();
        const normalizedPath = storagePath.replace(/^\/+/, '');
        const targetUrl = `https://${host}/${this.config.storageZone}/${normalizedPath}`;

        const uploadResult = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
          const req = https.request(
            targetUrl,
            {
              method: 'PUT',
              headers: {
                AccessKey: this.config.storagePassword,
                'Content-Type': mimeType,
                'Content-Length': fileBuffer.length,
              },
              timeout: 25000,
            },
            (res) => {
              let body = '';
              res.setEncoding('utf8');
              res.on('data', (chunk) => { body += chunk; });
              res.on('end', () => {
                resolve({ statusCode: res.statusCode || 0, body });
              });
            }
          );

          req.on('error', (err) => reject(err));
          req.on('timeout', () => {
            req.destroy(new Error('Bunny.net Storage upload timeout (25s)'));
          });

          req.write(fileBuffer);
          req.end();
        });

        if (uploadResult.statusCode >= 200 && uploadResult.statusCode < 300) {
          const cdnUrl = `${this.config.cdnBaseUrl}/${normalizedPath}`;
          return { success: true, cdnUrl, isBunny: true };
        } else {
          return {
            success: false,
            cdnUrl: '',
            isBunny: true,
            error: `Bunny.net Storage API hatası: HTTP ${uploadResult.statusCode} - ${uploadResult.body || 'Bilinmeyen hata'}`,
          };
        }
      } catch (err: any) {
        return {
          success: false,
          cdnUrl: '',
          isBunny: true,
          error: `Bunny.net bağlantı hatası: ${err.message || 'Sunucuya ulaşılamadı'}`,
        };
      }
    }

    // Fallback: save to local filesystem for development without Bunny credentials
    try {
      const localFilePath = path.join(this.localFallbackDir, storagePath);
      const dir = path.dirname(localFilePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(localFilePath, fileBuffer);
      const fallbackUrl = this.getCdnUrl(storagePath);
      return { success: true, cdnUrl: fallbackUrl, isBunny: false };
    } catch (err: any) {
      return {
        success: false,
        cdnUrl: '',
        isBunny: false,
        error: `Yerel depolama yazma hatası: ${err.message}`,
      };
    }
  }

  /**
   * Delete file from Bunny.net Storage Zone
   */
  public async deleteFile(storagePath: string): Promise<{ success: boolean; error?: string }> {
    if (this.isConfigured()) {
      try {
        const host = this.getStorageHost();
        const normalizedPath = storagePath.replace(/^\/+/, '');
        const targetUrl = `https://${host}/${this.config.storageZone}/${normalizedPath}`;

        const deleteResult = await new Promise<{ statusCode: number; body: string }>((resolve, reject) => {
          const req = https.request(
            targetUrl,
            {
              method: 'DELETE',
              headers: {
                AccessKey: this.config.storagePassword,
              },
              timeout: 15000,
            },
            (res) => {
              let body = '';
              res.setEncoding('utf8');
              res.on('data', (chunk) => { body += chunk; });
              res.on('end', () => {
                resolve({ statusCode: res.statusCode || 0, body });
              });
            }
          );

          req.on('error', (err) => reject(err));
          req.on('timeout', () => {
            req.destroy(new Error('Bunny.net Storage delete timeout'));
          });

          req.end();
        });

        // 200 OK or 404 Not Found (already gone)
        if (deleteResult.statusCode === 200 || deleteResult.statusCode === 404) {
          return { success: true };
        }
        return {
          success: false,
          error: `Bunny.net silme hatası: HTTP ${deleteResult.statusCode}`,
        };
      } catch (err: any) {
        return {
          success: false,
          error: `Bunny.net silme bağlantı hatası: ${err.message}`,
        };
      }
    }

    // Local fallback deletion
    try {
      const localFilePath = path.join(this.localFallbackDir, storagePath);
      if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath);
      }
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Read fallback file from local disk if in fallback mode
   */
  public getLocalFile(storagePath: string): Buffer | null {
    const localFilePath = path.join(this.localFallbackDir, storagePath);
    if (fs.existsSync(localFilePath)) {
      return fs.readFileSync(localFilePath);
    }
    return null;
  }

  /**
   * Diagnostic test: verify Bunny.net connection and CDN reachability
   */
  public async testConnection(): Promise<{
    configured: boolean;
    storageAccessible: boolean;
    cdnAccessible: boolean;
    details: string;
    latencyMs?: number;
  }> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        storageAccessible: false,
        cdnAccessible: false,
        details: 'Bunny.net Storage Zone ve CDN bilgileri .env içinde henüz tanımlanmamış. Yerel geliştirme depolaması devrede.',
      };
    }

    const startTime = Date.now();
    try {
      // Test listing or reading the zone root
      const host = this.getStorageHost();
      const testUrl = `https://${host}/${this.config.storageZone}/`;

      const checkStorage = await new Promise<{ statusCode: number }>((resolve, reject) => {
        const req = https.request(
          testUrl,
          {
            method: 'GET',
            headers: {
              AccessKey: this.config.storagePassword,
              Accept: '*/*',
            },
            timeout: 10000,
          },
          (res) => {
            res.resume();
            resolve({ statusCode: res.statusCode || 0 });
          }
        );
        req.on('error', reject);
        req.on('timeout', () => req.destroy(new Error('Storage timeout')));
        req.end();
      });

      const latencyMs = Date.now() - startTime;
      const storageOk = checkStorage.statusCode === 200 || checkStorage.statusCode === 204;

      // Test CDN pull zone URL
      let cdnOk = false;
      try {
        const cdnUrlObj = new URL(this.config.cdnBaseUrl);
        const client = cdnUrlObj.protocol === 'https:' ? https : http;
        cdnOk = await new Promise<boolean>((resolve) => {
          const req = client.request(
            this.config.cdnBaseUrl,
            { method: 'HEAD', timeout: 5000 },
            (res) => {
              res.resume();
              resolve(res.statusCode ? res.statusCode < 500 : false);
            }
          );
          req.on('error', () => resolve(false));
          req.on('timeout', () => { req.destroy(); resolve(false); });
          req.end();
        });
      } catch {
        cdnOk = false;
      }

      return {
        configured: true,
        storageAccessible: storageOk,
        cdnAccessible: cdnOk,
        latencyMs,
        details: storageOk
          ? `Bunny.net Storage (${this.config.storageRegion.toUpperCase()} / ${host}) başarıyla bağlandı. Gecikme: ${latencyMs}ms.`
          : `Bunny.net Storage erişim anahtarı reddedildi (HTTP ${checkStorage.statusCode}). Lütfen BUNNY_STORAGE_PASSWORD ve Storage Zone adını kontrol edin.`,
      };
    } catch (err: any) {
      return {
        configured: true,
        storageAccessible: false,
        cdnAccessible: false,
        details: `Bunny.net bağlantı hatası: ${err.message}`,
      };
    }
  }
}

export const bunnyStorage = new BunnyStorageService();
