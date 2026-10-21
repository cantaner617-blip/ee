import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import {
  UploadCloud,
  Moon,
  Sun,
  Shield,
  FolderOpen,
  Image as ImageIcon,
  User,
  LogOut,
  Menu,
  X,
  Compass,
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAuth: (mode: 'login' | 'register') => void;
  isDark: boolean;
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAuth,
  isDark,
  onToggleTheme,
}) => {
  const { user, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const handleNavClick = (tab: string) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-white/90 dark:bg-slate-950/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-8 h-16">
          {/* Zone 1: Brand Wordmark */}
          <button
            onClick={() => handleNavClick('upload')}
            className="flex items-center gap-2.5 text-left group shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-md"
          >
            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-sm shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <UploadCloud className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight text-slate-900 dark:text-white whitespace-nowrap">
                Resim<span className="text-cyan-600 dark:text-cyan-400">Paylaş</span>
              </span>
            </div>
          </button>

          {/* Zone 2: Navigation Links (Single line, quiet text links) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <button
              onClick={() => handleNavClick('upload')}
              className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentTab === 'upload' ? 'text-cyan-600 dark:text-cyan-400 font-semibold border-b-2 border-cyan-500' : ''
              }`}
            >
              Görsel Yükle
            </button>
            <button
              onClick={() => handleNavClick('recent')}
              className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentTab === 'recent' ? 'text-cyan-600 dark:text-cyan-400 font-semibold border-b-2 border-cyan-500' : ''
              }`}
            >
              Son Yüklenenler
            </button>
            {user && (
              <>
                <button
                  onClick={() => handleNavClick('gallery')}
                  className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                    currentTab === 'gallery' ? 'text-cyan-600 dark:text-cyan-400 font-semibold border-b-2 border-cyan-500' : ''
                  }`}
                >
                  Galerim
                </button>
                <button
                  onClick={() => handleNavClick('albums')}
                  className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                    currentTab === 'albums' ? 'text-cyan-600 dark:text-cyan-400 font-semibold border-b-2 border-cyan-500' : ''
                  }`}
                >
                  Albümler
                </button>
              </>
            )}
            <button
              onClick={() => handleNavClick('about')}
              className={`hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                currentTab === 'about' ? 'text-cyan-600 dark:text-cyan-400 font-semibold border-b-2 border-cyan-500' : ''
              }`}
            >
              Hakkımızda
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => handleNavClick('admin')}
                className={`flex items-center gap-1.5 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap shrink-0 py-1 ${
                  currentTab === 'admin' ? 'text-cyan-600 dark:text-cyan-400 font-semibold border-b-2 border-cyan-500' : 'text-amber-600 dark:text-amber-400 font-medium'
                }`}
              >
                <Shield className="w-4 h-4" />
                <span>Yönetim</span>
              </button>
            )}
          </nav>

          {/* Zone 3: Actions (Theme Toggle & Auth) */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Theme Toggle Button */}
            <button
              onClick={onToggleTheme}
              aria-label={isDark ? 'Açık temaya geç' : 'Koyu temaya geç'}
              className="p-2 rounded-lg text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-850 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500"
            >
              {isDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5 text-slate-700" />}
            </button>

            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-sm font-medium transition-all"
                >
                  <div className="w-6 h-6 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 flex items-center justify-center font-bold text-xs uppercase">
                    {user.username.charAt(0)}
                  </div>
                  <span className="truncate max-w-[100px]">{user.username}</span>
                </button>

                {profileDropdownOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-900 rounded-xl shadow-xl border border-slate-200 dark:border-slate-800 py-1.5 z-50 text-sm animate-in fade-in-50 zoom-in-95">
                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{user.username}</p>
                      <p className="truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); handleNavClick('gallery'); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <ImageIcon className="w-4 h-4 text-slate-400" />
                      Görsellerim
                    </button>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); handleNavClick('albums'); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <FolderOpen className="w-4 h-4 text-slate-400" />
                      Albümlerim
                    </button>
                    {user.role === 'admin' && (
                      <button
                        onClick={() => { setProfileDropdownOpen(false); handleNavClick('admin'); }}
                        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-amber-600 dark:text-amber-400"
                      >
                        <Shield className="w-4 h-4" />
                        Yönetim Paneli
                      </button>
                    )}
                    <button
                      onClick={() => { setProfileDropdownOpen(false); handleNavClick('account-settings'); }}
                      className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center gap-2 text-slate-700 dark:text-slate-300"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      Hesap Ayarları
                    </button>
                    <div className="border-t border-slate-100 dark:border-slate-800 my-1"></div>
                    <button
                      onClick={() => { setProfileDropdownOpen(false); logout(); }}
                      className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Çıkış Yap
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenAuth('login')}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors whitespace-nowrap"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => onOpenAuth('register')}
                  className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
                >
                  Kayıt Ol
                </button>
              </div>
            )}

            {/* Mobile menu hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              aria-label="Menüyü aç"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 pt-2 pb-6 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 space-y-2">
          <button
            onClick={() => handleNavClick('upload')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
              currentTab === 'upload' ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Görsel Yükle
          </button>
          <button
            onClick={() => handleNavClick('recent')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
              currentTab === 'recent' ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Son Yüklenenler
          </button>
          {user && (
            <>
              <button
                onClick={() => handleNavClick('gallery')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  currentTab === 'gallery' ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Galerim
              </button>
              <button
                onClick={() => handleNavClick('albums')}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
                  currentTab === 'albums' ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'
                }`}
              >
                Albümlerim
              </button>
            </>
          )}
          <button
            onClick={() => handleNavClick('about')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium ${
              currentTab === 'about' ? 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400' : 'text-slate-700 dark:text-slate-300'
            }`}
          >
            Hakkımızda
          </button>
          {user?.role === 'admin' && (
            <button
              onClick={() => handleNavClick('admin')}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-amber-600 dark:text-amber-400 flex items-center gap-2`}
            >
              <Shield className="w-4 h-4" />
              Yönetim Paneli
            </button>
          )}
          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex gap-2">
            {!user ? (
              <>
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth('login'); }}
                  className="flex-1 py-2 text-center text-sm font-semibold rounded-lg border border-slate-200 dark:border-slate-700"
                >
                  Giriş Yap
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth('register'); }}
                  className="flex-1 py-2 text-center text-sm font-semibold text-white bg-cyan-600 rounded-lg"
                >
                  Kayıt Ol
                </button>
              </>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); logout(); }}
                className="w-full py-2 text-center text-sm font-semibold text-red-600 rounded-lg border border-red-200 dark:border-red-900/50"
              >
                Çıkış Yap
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
