import { db } from './db.ts';
import { bunnyStorage } from './bunny.ts';

export class ExpirationWorker {
  private timer: NodeJS.Timeout | null = null;
  private isRunning = false;

  public start(intervalMs = 60000): void {
    if (this.timer) return;
    console.log(`⏱️ Süreli görsel temizleme servisi başlatıldı (Aralık: ${intervalMs / 1000}s).`);
    
    // Initial run after 5s
    setTimeout(() => this.runCleanup(), 5000);
    
    this.timer = setInterval(() => {
      this.runCleanup();
    }, intervalMs);
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      console.log('⏱️ Süreli görsel temizleme servisi durduruldu.');
    }
  }

  public async runCleanup(): Promise<number> {
    if (this.isRunning) return 0;
    this.isRunning = true;
    let deletedCount = 0;

    try {
      const expiredImages = await db.getExpiredImages();
      if (expiredImages.length === 0) {
        this.isRunning = false;
        return 0;
      }

      console.log(`🧹 Süresi dolmuş ${expiredImages.length} adet görsel tespit edildi. Temizlik başlıyor...`);

      for (const img of expiredImages) {
        try {
          // Delete from Bunny.net Storage
          const storageRes = await bunnyStorage.deleteFile(img.storagePath);
          if (!storageRes.success) {
            console.warn(`⚠️ Görsel storage silinirken uyarı (${img.id}):`, storageRes.error);
          }

          // Mark deleted in DB
          await db.deleteImage(img.id);
          deletedCount++;
          console.log(`✅ Süresi dolan görsel silindi: ${img.id} (${img.originalName})`);
        } catch (err: any) {
          console.error(`❌ Görsel silinirken hata oluştu (${img.id}):`, err.message);
        }
      }
    } catch (err: any) {
      console.error('❌ Expiration cleanup job hatası:', err.message);
    } finally {
      this.isRunning = false;
    }

    return deletedCount;
  }
}

export const expirationWorker = new ExpirationWorker();
