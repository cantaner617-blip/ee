import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import apiRouter from './src/server/routes.ts';
import { db } from './src/server/db.ts';
import { bunnyStorage } from './src/server/bunny.ts';
import { expirationWorker } from './src/server/cron.ts';
const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);
const isProd = process.env.NODE_ENV === 'production';

// Global middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check Endpoint (For Railway, Docker, & Monitoring)
app.get('/health', (req, res) => {
  const dbStatus = db.getStatus();
  const bunnyConfig = bunnyStorage.getConfig();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    database: dbStatus,
    bunnyNet: {
      storageZone: bunnyConfig.storageZone,
      region: bunnyConfig.storageRegion,
      isConfigured: bunnyConfig.isConfigured,
      cdnBaseUrl: bunnyConfig.cdnBaseUrl,
    },
  });
});

// Mount API routes
app.use('/api', apiRouter);

// Forward root /sitemap.xml to api router handler
app.get('/sitemap.xml', (req, res) => {
  req.url = '/sitemap.xml';
  apiRouter(req, res, () => {});
});

// Start server function
async function startServer() {
  try {
    // 1. Initialize Database
    await db.init();

    // 2. Start Scheduled Image Expiration Worker
    expirationWorker.start(60000); // Check every minute

    // 3. Mount Frontend (Vite in dev, static dist in production)
    if (!isProd) {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
      console.log('⚡ Vite dev middleware bağlı.');
    } else {
      const distPath = path.resolve(process.cwd(), 'dist');
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
      console.log('📦 Production statik dosyaları sunuluyor:', distPath);
    }

    // 4. Start listening
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 ResimPaylaş sunucusu hazır: http://0.0.0.0:${PORT}`);
      console.log(`📡 Ortam: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🐰 Bunny.net durumu: ${bunnyStorage.isConfigured() ? 'YAPILANDIRILDI' : 'GELİŞTİRME/YEREL MOD'}`);
    });

    // Graceful Shutdown Handling (Railway / Docker SIGTERM)
    const shutdown = (signal: string) => {
      console.log(`🛑 ${signal} sinyali alındı. Sunucu güvenli bir şekilde kapatılıyor...`);
      expirationWorker.stop();
      server.close(() => {
        console.log('✅ HTTP sunucusu kapatıldı.');
        process.exit(0);
      });

      // Force exit after 10s if dangling connections
      setTimeout(() => {
        console.error('⚠️ Kapanma zaman aşımına uğradı, zorla sonlandırılıyor.');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  } catch (err: any) {
    console.error('Sunucu başlatılırken kritik hata:', err);
    process.exit(1);
  }
}

startServer();
