import React, { useState } from 'react';
import {
  Shield,
  Mail,
  FileText,
  AlertTriangle,
  Lock,
  Globe,
  CheckCircle2,
  Trash2,
  KeyRound,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { api } from '../lib/api.ts';

// 1. HAKKIMIZDA
export const AboutPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-12 space-y-8 animate-in fade-in-50">
    <div className="space-y-3">
      <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
        Hakkımızda
      </h1>
      <p className="text-base text-slate-600 dark:text-slate-300">
        ResimPaylaş, Türkiye ve küresel ölçekteki kullanıcılar için en hızlı, güvenilir ve modern görsel barındırma altyapısını sunmak amacıyla tasarlanmıştır.
      </p>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
          ⚡
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Bunny.net Global CDN</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Dünyanın 100+ noktasında yer alan yüksek hızlı PoP noktaları ile görselleriniz milisaniyeler içinde açılır.
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
          🔒
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Katı Güvenlik ve Gizlilik</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Magic-byte doğrulaması, SVG stored-XSS engellemesi ve gizli link seçenekleriyle tam kontrol elinizde.
        </p>
      </div>

      <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2">
        <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center font-bold">
          ⏱️
        </div>
        <h3 className="font-bold text-slate-900 dark:text-white text-sm">Süreli ve Otomatik Silme</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          10 dakikadan 7 güne kadar otomatik silinme seçenekleri ile geçici dosyalarınızı güvenle paylaşın.
        </p>
      </div>
    </div>
  </div>
);

// 2. İLETİŞİM
export const ContactPage: React.FC = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSent(true);
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8 animate-in fade-in-50">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
          İletişim
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Platform hakkında soru, öneri veya iş ortaklığı talepleriniz için bize ulaşın.
        </p>
      </div>

      {sent ? (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-base">Mesajınız Alındı</h3>
          <p className="text-xs">En kısa sürede e-posta adresiniz üzerinden sizinle iletişime geçeceğiz.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Adınız Soyadınız</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">E-posta Adresiniz</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">Mesajınız</label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            />
          </div>
          <button
            type="submit"
            className="w-full py-2.5 bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 text-white font-semibold rounded-xl transition-colors"
          >
            Mesajı Gönder
          </button>
        </form>
      )}
    </div>
  );
};

// 3. GİZLİLİK POLİTİKASI
export const PrivacyPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed animate-in fade-in-50">
    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Gizlilik Politikası
    </h1>
    <p className="text-xs text-slate-400">Son güncelleme: 21 Ekim 2026</p>

    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Toplanan Veriler</h2>
      <p>
        ResimPaylaş, kayıtlı kullanıcılar için kullanıcı adı ve şifrelenmiş parola özetini (bcrypt) saklar. Yüklenen görseller, kullanıcı tarafından belirlenen gizlilik derecesine (Herkese Açık, Gizli Bağlantı veya Özel) göre saklanır.
      </p>

      <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Görsellerin Saklanması ve CDN Dağıtımı</h2>
      <p>
        Görselleriniz güvenli Bunny.net Storage altyapısında barındırılmakta olup, hızlı dağıtım amacıyla Bunny.net Pull Zone CDN önbellek mekanizması üzerinden sunulur. Süresi dolan dosyalar Bunny.net Storage üzerinden kalıcı olarak silinir.
      </p>

      <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Özel Görseller</h2>
      <p>
        "Özel / Sadece Ben" seçeneğiyle yüklenen görseller herkese açık CDN üzerinde yayınlanmaz ve yalnızca hesap sahibinin aktif oturumu ile erişilebilir.
      </p>
    </div>
  </div>
);

// 4. KULLANIM ŞARTLARI
export const TermsPage: React.FC = () => (
  <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed animate-in fade-in-50">
    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      Kullanım Şartları
    </h1>
    <p className="text-xs text-slate-400">Son güncelleme: 21 Ekim 2026</p>

    <div className="space-y-4">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">1. Genel Koşullar</h2>
      <p>
        ResimPaylaş servisini kullanarak yürürlükteki tüm yerel ve uluslararası yasalara uymayı kabul etmiş sayılırsınız.
      </p>

      <h2 className="text-lg font-bold text-slate-900 dark:text-white">2. Yasaklanan İçerikler</h2>
      <p>
        Yasa dışı, telif hakkı ihlali barındıran, müstehcen, nefret söylemi içeren, kişisel verileri rızasız ifşa eden veya zararlı yazılım içeren dosyaların yüklenmesi kesinlikle yasaktır. Bu tür içerikler derhal silinir ve yükleyen hesap engellenir.
      </p>

      <h2 className="text-lg font-bold text-slate-900 dark:text-white">3. Hizmet Sorumluluğu</h2>
      <p>
        ResimPaylaş, sunucu arızaları veya üçüncü taraf hizmet kesintilerinden doğabilecek geçici veri kayıplarından sorumlu tutulamaz. Kritik verilerinizin yedeklerini kendi ortamınızda tutmanız önerilir.
      </p>
    </div>
  </div>
);

// 5. DMCA / TELİF HAKKI
export const DmcaPage: React.FC<{ onNavigateReport: () => void }> = ({ onNavigateReport }) => (
  <div className="max-w-4xl mx-auto px-4 py-12 space-y-6 text-slate-700 dark:text-slate-300 text-sm leading-relaxed animate-in fade-in-50">
    <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
      DMCA ve Telif Hakkı Bildirimi
    </h1>

    <p>
      ResimPaylaş, 5651 sayılı kanun ve Dijital Binyıl Telif Hakkı Yasası (DMCA) kapsamında "Yer Sağlayıcı" olarak faaliyet göstermektedir. Kullanıcılar tarafından yüklenen içeriklerin telif hakları yükleyen kullanıcılara aittir.
    </p>

    <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-2 text-xs">
      <h3 className="font-bold text-amber-800 dark:text-amber-300 text-sm">Telif Hakkı İhlal Bildirimi Yapma</h3>
      <p className="text-amber-700 dark:text-amber-200">
        Telif hakkı sahibi olduğunuz bir görselin platformumuzda izinsiz paylaşıldığını düşünüyorsanız, lütfen ihlal bildirim formunu doldurun veya dmca@resimpaylas.com adresine kanıt bağlantılarıyla birlikte yazın.
      </p>
      <button
        onClick={onNavigateReport}
        className="mt-2 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-lg"
      >
        İhlal Bildirim Formunu Aç
      </button>
    </div>
  </div>
);

// 6. GENEL ŞİKAYET SAYFASI
export const ReportPage: React.FC = () => {
  const [imageId, setImageId] = useState('');
  const [reason, setReason] = useState('Telif Hakkı / DMCA');
  const [details, setDetails] = useState('');
  const [sent, setSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!imageId.trim()) {
      alert('Lütfen şikayet konusu görselin ID veya bağlantısını giriniz.');
      return;
    }

    const cleanId = imageId.trim().replace(/^.*\/i\//, '').replace(/^.*images\//, '').split('.')[0];
    setIsSubmitting(true);
    try {
      await api.reportImage(cleanId, reason, details);
      setSent(true);
    } catch (err: any) {
      alert('Şikayet iletilemedi: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-6 animate-in fade-in-50">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          <AlertTriangle className="w-6 h-6 text-amber-500" />
          İçerik İhlal ve Şikâyet Bildirimi
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Yasalara, telif haklarına veya platform kurallarına aykırı görselleri incelememiz için bildirin.
        </p>
      </div>

      {sent ? (
        <div className="p-6 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 rounded-2xl border border-emerald-200 dark:border-emerald-800 text-center space-y-2">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
          <h3 className="font-bold text-base">Şikâyetiniz İletildi</h3>
          <p className="text-xs">Ekibimiz içeriği en kısa sürede inceleyecek ve gerekli işlemleri yapacaktır.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs text-xs">
          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Görsel ID veya Bağlantı Adresi
            </label>
            <input
              type="text"
              required
              placeholder="Örn: 9zK8d2s veya https://.../i/9zK8d2s"
              value={imageId}
              onChange={(e) => setImageId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Şikâyet Sebebi
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            >
              <option value="Telif Hakkı / DMCA">Telif Hakkı İhlali (DMCA)</option>
              <option value="Kişisel Gizlilik / İfşa">Kişisel Gizlilik / Rızasız İfşa</option>
              <option value="Yasa Dışı / Zararlı">Yasa Dışı veya Zararlı İçerik</option>
              <option value="Spam / Kimlik Avı">Spam veya Kimlik Avı</option>
              <option value="Diğer">Diğer</option>
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
              Detaylı Açıklama ve Kanıtlar
            </label>
            <textarea
              rows={4}
              required
              placeholder="Görselin neden kaldırılması gerektiğini ve hak sahipliği kanıtlarınızı açıklayın..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 bg-amber-600 hover:bg-amber-500 text-white font-semibold rounded-xl transition-colors disabled:opacity-50"
          >
            {isSubmitting ? 'Gönderiliyor...' : 'Şikâyeti Gönder'}
          </button>
        </form>
      )}
    </div>
  );
};

// 7. HESAP AYARLARI
export const AccountSettingsPage: React.FC = () => {
  const { user, updatePassword, deleteAccount } = useAuth();
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [passSuccess, setPassSuccess] = useState(false);

  const [delPass, setDelPass] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updatePassword(currentPass, newPass);
      setPassSuccess(true);
      setCurrentPass('');
      setNewPass('');
      setTimeout(() => setPassSuccess(false), 3000);
    } catch (err: any) {
      alert('Hata: ' + err.message);
    }
  };

  const handleDeleteAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!window.confirm('Hesabınızı ve tüm görsellerinizi kalıcı olarak silmek istediğinize emin misiniz?')) return;
    setIsDeleting(true);
    try {
      await deleteAccount(delPass);
    } catch (err: any) {
      alert('Hesap silinemedi: ' + err.message);
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 space-y-8 animate-in fade-in-50 text-xs">
      <div className="border-b border-slate-200 dark:border-slate-800 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Hesap Ayarları
        </h1>
        <p className="text-slate-400 mt-1">
          Kullanıcı profilinizi ve güvenlik tercihlerinizi yönetin
        </p>
      </div>

      {/* Profile info */}
      <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white">Profil Bilgileri</h3>
        <div className="space-y-2 text-slate-600 dark:text-slate-300">
          <div><span className="font-semibold">Kullanıcı Adı:</span> {user.username}</div>
          <div><span className="font-semibold">E-posta:</span> {user.email}</div>
          <div><span className="font-semibold">Hesap Rolü:</span> <span className="uppercase font-mono">{user.role}</span></div>
        </div>
      </div>

      {/* Password change */}
      <form onSubmit={handlePasswordChange} className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-cyan-500" />
          Şifre Değiştir
        </h3>

        {passSuccess && (
          <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-lg">
            Şifreniz başarıyla güncellendi.
          </div>
        )}

        <div>
          <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">Mevcut Şifre</label>
          <input
            type="password"
            required
            value={currentPass}
            onChange={(e) => setCurrentPass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
          />
        </div>

        <div>
          <label className="block font-medium mb-1 text-slate-700 dark:text-slate-300">Yeni Şifre (En az 6 karakter)</label>
          <input
            type="password"
            required
            minLength={6}
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 text-white font-medium rounded-lg"
        >
          Şifreyi Güncelle
        </button>
      </form>

      {/* Delete account */}
      <form onSubmit={handleDeleteAccount} className="p-5 bg-red-50/50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/40 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-2">
          <Trash2 className="w-4 h-4" />
          Hesabı Sil
        </h3>
        <p className="text-red-600/80 dark:text-red-300/80">
          Hesabınızı sildiğinizde profiliniz kalıcı olarak kaldırılır. Bu işlem geri alınamaz.
        </p>

        <div>
          <label className="block font-medium mb-1 text-red-800 dark:text-red-200">Onaylamak için şifrenizi girin</label>
          <input
            type="password"
            required
            value={delPass}
            onChange={(e) => setDelPass(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-950 border border-red-300 dark:border-red-800 rounded-lg text-slate-800 dark:text-slate-200"
          />
        </div>

        <button
          type="submit"
          disabled={isDeleting}
          className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-lg disabled:opacity-50"
        >
          {isDeleting ? 'Siliniyor...' : 'Hesabımı Kalıcı Olarak Sil'}
        </button>
      </form>
    </div>
  );
};
