import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { UploadZone } from './components/UploadZone.tsx';
import { ImageViewer } from './components/ImageViewer.tsx';
import { UserGallery } from './components/UserGallery.tsx';
import { AlbumsView } from './components/AlbumsView.tsx';
import { AdminPanel } from './components/AdminPanel.tsx';
import { RecentUploads } from './components/RecentUploads.tsx';
import { Footer } from './components/Footer.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import {
  AboutPage,
  ContactPage,
  PrivacyPage,
  TermsPage,
  DmcaPage,
  ReportPage,
  AccountSettingsPage,
} from './components/InfoPages.tsx';
import { ImageItem } from './types.ts';
import { Zap, ShieldCheck, Share2, Globe, Clock, Layers } from 'lucide-react';

function AppContent() {
  const { user } = useAuth();

  // Tab & navigation state
  const [currentTab, setCurrentTab] = useState<string>('upload');
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Theme state (Dark by default or from localStorage)
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Auth modal
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Sync theme with html class
  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDark]);

  // Handle URL route synchronization on load and popstate
  useEffect(() => {
    const parseLocation = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;

      if (path.startsWith('/i/')) {
        const id = path.replace('/i/', '').trim();
        if (id) {
          setSelectedImageId(id);
          setCurrentTab('image-view');
          return;
        }
      }

      if (hash.startsWith('#i-')) {
        const id = hash.replace('#i-', '').trim();
        if (id) {
          setSelectedImageId(id);
          setCurrentTab('image-view');
          return;
        }
      }

      if (path === '/galerim' || hash === '#gallery') {
        setCurrentTab('gallery');
        return;
      }

      if (path === '/albumler' || hash === '#albums') {
        setCurrentTab('albums');
        return;
      }

      if (path === '/admin' || hash === '#admin') {
        setCurrentTab('admin');
        return;
      }

      if (path === '/hakkimizda' || hash === '#about') {
        setCurrentTab('about');
        return;
      }

      if (path === '/iletisim' || hash === '#contact') {
        setCurrentTab('contact');
        return;
      }

      if (path === '/gizlilik' || hash === '#privacy') {
        setCurrentTab('privacy');
        return;
      }

      if (path === '/kullanim-sartlari' || hash === '#terms') {
        setCurrentTab('terms');
        return;
      }

      if (path === '/dmca' || hash === '#dmca') {
        setCurrentTab('dmca');
        return;
      }

      if (path === '/sikayet' || hash === '#report') {
        setCurrentTab('report');
        return;
      }
    };

    parseLocation();
    window.addEventListener('popstate', parseLocation);
    return () => window.removeEventListener('popstate', parseLocation);
  }, []);

  const navigateToTab = (tab: string, pushHistory = true) => {
    setCurrentTab(tab);
    setSelectedImageId(null);

    if (pushHistory) {
      const url = tab === 'upload' ? '/' : `/#${tab}`;
      window.history.pushState(null, '', url);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewImage = (id: string, pushHistory = true) => {
    setSelectedImageId(id);
    setCurrentTab('image-view');
    if (pushHistory) {
      window.history.pushState(null, '', `/i/${id}`);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openAuth = (mode: 'login' | 'register') => {
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Top Navbar Contract */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={navigateToTab}
        onOpenAuth={openAuth}
        isDark={isDark}
        onToggleTheme={() => setIsDark(!isDark)}
      />

      {/* Main Content Area */}
      <main className="flex-1">
        {/* TAB 1: UPLOAD & HOMEPAGE */}
        {currentTab === 'upload' && (
          <div className="space-y-12 pb-16">
            {/* Hero Section */}
            <section className="pt-12 sm:pt-16 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto text-center space-y-4">
              <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white max-w-4xl mx-auto leading-tight" style={{ textWrap: 'balance' }}>
                Hızlı, Güvenli ve Kalıcı <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 dark:from-cyan-400 dark:via-blue-400 dark:to-indigo-400">
                  Görsel Paylaşım Platformu
                </span>
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
                Bunny.net Storage ve küresel CDN altyapısıyla görsellerinizi doğrudan yükleyin; anında doğrudan bağlantı, HTML, Markdown ve BBCode kodlarını alın.
              </p>
            </section>

            {/* Interactive Upload Box */}
            <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <UploadZone
                onViewImage={(id) => handleViewImage(id)}
              />
            </section>

            {/* Recent Public Uploads Strip */}
            <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
              <RecentUploads
                onViewImage={(id) => handleViewImage(id)}
              />
            </section>

            {/* How It Works (Nasıl Çalışır?) */}
            <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-10">
              <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-8 sm:p-12 shadow-xs space-y-8">
                <div className="text-center space-y-2 max-w-xl mx-auto">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
                    Nasıl Çalışır?
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Saniyeler içinde görsel yükleyin ve dilediğiniz her yerde paylaşın
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="space-y-3">
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm">01.</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Görsel Seçin veya Sürükleyin</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Dosyalarınızı yükleme alanına bırakın veya panodan (Ctrl+V) doğrudan yapıştırın. Çoklu yükleme desteklenir.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm">02.</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Bunny.net Storage & CDN</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Dosyalarınız güvenlik kontrollerinden geçirilir ve Bunny.net'in dünya çapındaki yüksek hızlı CDN noktalarına aktarılır.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm">03.</span>
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">Anında Bağlantınızı Paylaşın</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      Doğrudan görsel linki, web siteleri için HTML, forumlar için BBCode veya Reddit/GitHub için Markdown formatında kopyalayın.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Platform Features Grid */}
            <section className="px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto pt-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Işık Hızında CDN Dağıtımı</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Tüm dosyalar Bunny.net Pull Zone üzerinden dünya çapında önbelleğe alınarak ultra düşük gecikmeyle sunulur.
                  </p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Magic-Byte Güvenliği</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Yüklenen tüm görseller başlık seviyesinde doğrulanır; SVG XSS açıklarına ve sahte dosyalara karşı korunur.
                  </p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Otomatik Süreli Silme</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    10 dakika, 1 saat, 24 saat veya 7 gün sonra sunucudan kalıcı olarak silinen tek kullanımlık görseller oluşturun.
                  </p>
                </div>

                <div className="p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-2.5">
                  <div className="w-8 h-8 rounded-lg bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">Çoklu Paylaşım Formatları</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Forum BBCode, Markdown, HTML img tag veya doğrudan CDN bağlantısı arasından dilediğinizi tek tıkla kopyalayın.
                  </p>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* TAB: RECENT PUBLIC UPLOADS PAGE */}
        {currentTab === 'recent' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in-50">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Son Yüklenen Görseller
            </h1>
            <RecentUploads onViewImage={handleViewImage} />
          </div>
        )}

        {/* TAB: DEDICATED IMAGE VIEWER */}
        {currentTab === 'image-view' && selectedImageId && (
          <ImageViewer
            imageId={selectedImageId}
            onBack={() => navigateToTab('upload')}
            onDeleted={() => navigateToTab(user ? 'gallery' : 'upload')}
          />
        )}

        {/* TAB: USER GALLERY */}
        {currentTab === 'gallery' && (
          <UserGallery onViewImage={handleViewImage} />
        )}

        {/* TAB: USER ALBUMS */}
        {currentTab === 'albums' && (
          <AlbumsView onViewImage={handleViewImage} />
        )}

        {/* TAB: ADMIN PANEL */}
        {currentTab === 'admin' && (
          <AdminPanel onViewImage={handleViewImage} />
        )}

        {/* TAB: INFORMATIVE & POLICY PAGES */}
        {currentTab === 'about' && <AboutPage />}
        {currentTab === 'contact' && <ContactPage />}
        {currentTab === 'privacy' && <PrivacyPage />}
        {currentTab === 'terms' && <TermsPage />}
        {currentTab === 'dmca' && <DmcaPage onNavigateReport={() => navigateToTab('report')} />}
        {currentTab === 'report' && <ReportPage />}
        {currentTab === 'account-settings' && <AccountSettingsPage />}
      </main>

      {/* Footer */}
      <Footer onSelectTab={navigateToTab} />

      {/* Auth Modal */}
      <AuthModal
        isOpen={authModalOpen}
        initialMode={authMode}
        onClose={() => setAuthModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
