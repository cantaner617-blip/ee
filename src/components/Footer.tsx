import React from 'react';
import { UploadCloud } from 'lucide-react';

interface FooterProps {
  onSelectTab: (tab: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onSelectTab }) => {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 text-xs py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-cyan-600 flex items-center justify-center text-white">
              <UploadCloud className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-slate-900 dark:text-white">
              Resim<span className="text-cyan-600 dark:text-cyan-400">Paylaş</span>
            </span>
            <span className="text-slate-400">· Bunny.net CDN Altyapısı</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 font-medium">
            <button onClick={() => onSelectTab('about')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Hakkımızda
            </button>
            <button onClick={() => onSelectTab('contact')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              İletişim
            </button>
            <button onClick={() => onSelectTab('privacy')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Gizlilik Politikası
            </button>
            <button onClick={() => onSelectTab('terms')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Kullanım Şartları
            </button>
            <button onClick={() => onSelectTab('dmca')} className="hover:text-slate-900 dark:hover:text-white transition-colors">
              DMCA / Telif
            </button>
            <button onClick={() => onSelectTab('report')} className="hover:text-amber-500 transition-colors">
              Şikayet Bildir
            </button>
            <a href="/sitemap.xml" target="_blank" rel="noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors">
              Sitemap.xml
            </a>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400 text-[11px] pt-4 border-t border-slate-100 dark:border-slate-850">
          <p>© 2026 ResimPaylaş. Tüm hakları saklıdır.</p>
          <p className="flex items-center gap-2">
            <span>Yüksek Hızlı Görsel Barındırma</span>
            <span>·</span>
            <span>Ölçeklenebilir CDN</span>
          </p>
        </div>
      </div>
    </footer>
  );
};
