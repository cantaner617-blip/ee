import React, { useState, useEffect } from 'react';
import { api } from '../lib/api.ts';
import { ImageItem } from '../types.ts';
import { Copy, Check, ExternalLink, Image as ImageIcon } from 'lucide-react';

interface RecentUploadsProps {
  onViewImage: (id: string) => void;
}

export const RecentUploads: React.FC<RecentUploadsProps> = ({ onViewImage }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    api.getPublicImages(12)
      .then(setImages)
      .catch((err) => console.error('Son yüklenenler alınamadı:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const copyLink = (e: React.MouseEvent, url: string, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return (
      <div className="py-12 text-center text-xs text-slate-400">
        <div className="w-6 h-6 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-2"></div>
        Son yüklenen görseller getiriliyor...
      </div>
    );
  }

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">
            Son Yüklenen Görseller
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Topluluk tarafından herkese açık olarak paylaşılan son görseller
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
        {images.map((img) => (
          <div
            key={img.id}
            onClick={() => onViewImage(img.id)}
            className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-cyan-400 dark:hover:border-cyan-600 transition-all cursor-pointer"
          >
            <div className="aspect-square bg-slate-100 dark:bg-slate-800 overflow-hidden flex items-center justify-center relative">
              <img
                src={img.cdnUrl}
                alt={img.originalName}
                loading="lazy"
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                <span className="text-[10px] text-white font-mono">
                  {img.width}x{img.height}
                </span>
                <button
                  type="button"
                  onClick={(e) => copyLink(e, img.links.viewUrl, img.id)}
                  className="p-1 rounded-md bg-white/20 hover:bg-white/40 text-white backdrop-blur-xs transition-colors"
                  title="Link Kopyala"
                >
                  {copiedId === img.id ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            <div className="p-2 text-xs">
              <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={img.originalName}>
                {img.originalName}
              </p>
              <span className="text-[10px] text-slate-400 uppercase font-mono">
                {img.mimeType.split('/')[1]}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
