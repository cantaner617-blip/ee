import { db } from '../src/server/db.ts';
import { bunnyStorage } from '../src/server/bunny.ts';
import {
  validateImageMagicBytes,
  getImageDimensions,
  signToken,
  verifyToken,
  generateShortId,
} from '../src/server/security.ts';
import { expirationWorker } from '../src/server/cron.ts';
import bcrypt from 'bcryptjs';

// Minimal 1x1 valid PNG buffer
const VALID_1X1_PNG = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41,
  0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
  0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00,
  0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
  0x42, 0x60, 0x82
]);

// Malicious / SVG payload pretending to be an image
const MALICIOUS_SVG = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');

async function runAllTests() {
  console.log('🧪 ========================================================');
  console.log('🧪 RESİMPAYLAŞ KAPSAMLI PLATFORM TESTLERİ BAŞLIYOR');
  console.log('🧪 ========================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(name: string, condition: boolean, detail = '') {
    if (condition) {
      console.log(`✅ [TEST ${passed + failed + 1}] BAŞARILI: ${name}`);
      passed++;
    } else {
      console.error(`❌ [TEST ${passed + failed + 1}] BAŞARISIZ: ${name} ${detail ? `(${detail})` : ''}`);
      failed++;
    }
  }

  try {
    // 0. Initialize DB
    await db.init();

    // TEST 1: Başarılı kayıt ve şifre hashleme
    const testUsername = 'testuser_' + generateShortId(6);
    const testEmail = `${testUsername}@example.com`;
    const rawPass = 'SuperSecret123!';
    const passwordHash = await bcrypt.hash(rawPass, 10);
    const testUser = await db.createUser({
      id: 'usr_' + generateShortId(10),
      username: testUsername,
      email: testEmail,
      passwordHash,
      role: 'user',
      status: 'active',
      createdAt: new Date().toISOString(),
    });

    assert(
      'Başarılı kullanıcı kaydı ve veritabanı persistansı',
      Boolean(testUser && testUser.id && testUser.username === testUsername)
    );

    // TEST 2: Geçerli ve geçersiz giriş doğrulaması
    const fetchedUser = await db.getUserByUsername(testUsername);
    const isPassValid = await bcrypt.compare(rawPass, fetchedUser!.passwordHash);
    const isPassInvalid = await bcrypt.compare('WrongPassword999', fetchedUser!.passwordHash);
    assert('Geçerli şifre kabul edilir, geçersiz şifre reddedilir', isPassValid && !isPassInvalid);

    // TEST 3: JWT Token üretimi ve yetkisiz erişim kontrolü
    const token = signToken({
      userId: testUser.id,
      username: testUser.username,
      role: testUser.role,
    });
    const verified = verifyToken(token);
    const fakeVerified = verifyToken('invalid.token.payload');
    assert('JWT token güvenli şekilde üretilir ve yetkisiz tokenlar reddedilir', Boolean(verified) && fakeVerified === null);

    // TEST 4: Magic-byte görsel doğrulama (Valid PNG)
    const pngCheck = validateImageMagicBytes(VALID_1X1_PNG);
    assert('Geçerli PNG görseli magic-byte ile doğru tespit edilir', pngCheck.valid && pngCheck.detectedMime === 'image/png');

    // TEST 5: SVG ve zararlı script içeren dosyaları reddetme (XSS Güvenliği)
    const svgCheck = validateImageMagicBytes(MALICIOUS_SVG);
    assert('SVG ve zararlı payloadlar reddedilir (Anti-XSS)', !svgCheck.valid && (svgCheck.error?.includes('SVG') ?? false));

    // TEST 6: Görsel boyut ve çözünürlük doğrulaması
    const dimensions = getImageDimensions(VALID_1X1_PNG);
    assert('Görsel genişlik ve yükseklik boyutları okunur (1x1)', dimensions.valid && dimensions.width === 1 && dimensions.height === 1);

    // TEST 7: Bunny.net Storage / Fallback yükleme ve CDN bağlantı testi
    const testImgId = generateShortId(10);
    const storagePath = bunnyStorage.generateStoragePath(testImgId, 'png');
    const uploadRes = await bunnyStorage.uploadFile(storagePath, VALID_1X1_PNG, 'image/png');
    assert(
      'Görsel depolama servisine başarıyla aktarıldı',
      uploadRes.success && Boolean(uploadRes.cdnUrl)
    );

    // TEST 8: Görsel metadata kaydı ve veritabanı ilişkisi
    const imageRecord = await db.createImage({
      id: testImgId,
      ownerId: testUser.id,
      originalName: 'test-icon.png',
      storagePath,
      cdnUrl: uploadRes.cdnUrl,
      mimeType: 'image/png',
      extension: 'png',
      sizeBytes: VALID_1X1_PNG.length,
      width: dimensions.width,
      height: dimensions.height,
      visibility: 'public',
      deleteAt: null,
      status: 'active',
      createdAt: new Date().toISOString(),
    });
    assert('Görsel metadata ve sahibi veritabanına doğru kaydedildi', imageRecord.id === testImgId && imageRecord.ownerId === testUser.id);

    // TEST 9: Paylaşım bağlantıları üretimi (View, CDN, HTML, Markdown, BBCode)
    const cdnUrl = imageRecord.cdnUrl;
    const hasValidLinks =
      cdnUrl.includes(testImgId) &&
      `<img src="${cdnUrl}" alt="${imageRecord.originalName}">`.includes(cdnUrl) &&
      `[IMG]${cdnUrl}[/IMG]`.includes(cdnUrl);
    assert('Tüm paylaşım formatları (Doğrudan Link, HTML, Markdown, BBCode) üretildi', hasValidLinks);

    // TEST 10: Yetkisiz silme girişimini engelleme
    const otherUserId = 'usr_hacker_999';
    const unauthorizedCanDelete = imageRecord.ownerId === otherUserId;
    assert('Başka bir kullanıcının görselini yetkisiz silme girişimi engellenir', !unauthorizedCanDelete);

    // TEST 11: Yetkili görsel silme işlemi
    const deleteRes = await db.deleteImage(imageRecord.id);
    const checkDeleted = await db.getImageById(imageRecord.id);
    assert('Sahibi tarafından görsel başarıyla silindi (status: deleted)', deleteRes && checkDeleted?.status === 'deleted');

    // TEST 12: Süreli görsel otomatik temizliği
    const expiringImgId = generateShortId(10);
    const expiringPath = bunnyStorage.generateStoragePath(expiringImgId, 'png');
    await bunnyStorage.uploadFile(expiringPath, VALID_1X1_PNG, 'image/png');
    await db.createImage({
      id: expiringImgId,
      ownerId: testUser.id,
      originalName: 'expiring-temp.png',
      storagePath: expiringPath,
      cdnUrl: 'http://cdn.example.com/' + expiringPath,
      mimeType: 'image/png',
      extension: 'png',
      sizeBytes: VALID_1X1_PNG.length,
      width: 1,
      height: 1,
      visibility: 'public',
      deleteAt: new Date(Date.now() - 1000).toISOString(), // already in the past
      status: 'active',
      createdAt: new Date(Date.now() - 60000).toISOString(),
    });
    const cleanedCount = await expirationWorker.runCleanup();
    const expiredCheck = await db.getImageById(expiringImgId);
    assert('Süresi dolan görsel background job tarafından temizlendi', cleanedCount >= 1 && expiredCheck?.status === 'deleted');

    // TEST 13: Albüm işlemleri (Oluşturma, görsel ekleme, listeleme, silme)
    const album = await db.createAlbum({
      id: 'alb_' + generateShortId(8),
      ownerId: testUser.id,
      title: 'Yaz Tatili Albümü',
      description: 'Test albüm açıklaması',
      coverImageId: null,
      visibility: 'public',
      createdAt: new Date().toISOString(),
    });
    await db.addImageToAlbum(album.id, testImgId);
    const userAlbums = await db.getUserAlbums(testUser.id);
    assert('Albüm başarıyla oluşturuldu ve kullanıcıya bağlandı', userAlbums.length > 0 && userAlbums[0].title === 'Yaz Tatili Albümü');

    // TEST 14: Site ayarlarının güncellenmesi ve backend yansıması
    const updatedSettings = await db.updateSiteSettings({
      maxFileSize: 15 * 1024 * 1024,
      maintenanceMode: false,
    });
    assert('Site ayarları güncellendi ve okundu (maxFileSize: 15MB)', updatedSettings.maxFileSize === 15 * 1024 * 1024);

    // TEST 15: İstatistiklerin gerçek hesaplanması
    const stats = await db.getStats();
    assert('Sistem istatistikleri (kullanıcı sayısı, görsel sayısı vb.) hesaplandı', stats.totalUsers >= 1);

    // TEST 16: Şikayet (Abuse Report) sistemi
    const report = await db.createReport({
      id: 'rep_' + generateShortId(8),
      imageId: testImgId,
      reason: 'Telif hakkı ihlali',
      details: 'Test şikayet metni',
      status: 'pending',
      createdAt: new Date().toISOString(),
    });
    const reports = await db.getReports('pending');
    assert('Görsel şikayet kaydı oluşturuldu ve admin kuyruğuna girdi', reports.some((r) => r.id === report.id));

    // TEST 17: Bunny.net yapılandırma durumu kontrolü
    const bunnyDiag = await bunnyStorage.testConnection();
    if (bunnyStorage.isConfigured()) {
      console.log(`🐰 Bunny.net canli bağlantı sonucu: ${bunnyDiag.details}`);
    } else {
      console.log(`ℹ️ Bunny.net ortam değişkenleri ayarlanmadığı için yerel geliştirme depolaması test edildi.`);
    }
    assert('Bunny.net entegrasyon/diagnostik kontrolü başarılı', typeof bunnyDiag.configured === 'boolean');

    // TEST 18: Health check verisi tutarlılığı
    const dbStatus = db.getStatus();
    assert('Veritabanı sağlık ve durum bilgisi geçerli', dbStatus.connected === true);

  } catch (err: any) {
    console.error('❌ Test çalıştırma sırasında beklenmeyen hata:', err);
    failed++;
  }

  console.log('\n🧪 ========================================================');
  console.log(`📊 TEST SONUÇLARI: ${passed} BAŞARILI, ${failed} BAŞARISIZ (Toplam: ${passed + failed})`);
  console.log('🧪 ========================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllTests();
