import React, { useState, useEffect } from 'react';
import {
  Folder,
  FolderPlus,
  Trash2,
  ExternalLink,
  Plus,
  ArrowLeft,
  Share2,
  Copy,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { AlbumItem, ImageVisibility } from '../types.ts';

interface AlbumsViewProps {
  onViewImage: (id: string) => void;
}

export const AlbumsView: React.FC<AlbumsViewProps> = ({ onViewImage }) => {
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [activeAlbum, setActiveAlbum] = useState<AlbumItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // New album form
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [visibility, setVisibility] = useState<ImageVisibility>('public');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const loadAlbums = async () => {
    setIsLoading(true);
    try {
      const data = await api.getUserAlbums();
      setAlbums(data);
    } catch (err: any) {
      console.error('Albümler yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAlbums();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      await api.createAlbum(title.trim(), description.trim(), visibility);
      setTitle('');
      setDescription('');
      setIsCreateOpen(false);
      loadAlbums();
    } catch (err: any) {
      alert('Albüm oluşturulamadı: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAlbum = async (id: string) => {
    setIsLoading(true);
    try {
      const data = await api.getAlbum(id);
      setActiveAlbum(data);
    } catch (err: any) {
      alert('Albüm açılamadı: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAlbum = async (id: string) => {
    if (!window.confirm('Bu albümü silmek istediğinize emin misiniz? (Görselleriniz silinmez)')) return;
    try {
      await api.deleteAlbum(id);
      setActiveAlbum(null);
      loadAlbums();
    } catch (err: any) {
      alert('Albüm silinirken hata: ' + err.message);
    }
  };

  const handleRemoveImageFromAlbum = async (imageId: string) => {
    if (!activeAlbum) return;
    try {
      await api.removeImageFromAlbum(activeAlbum.id, imageId);
      // Reload current album
      openAlbum(activeAlbum.id);
    } catch (err: any) {
      alert('Görsel çıkarılamadı: ' + err.message);
    }
  };

  const copyAlbumLink = () => {
    if (!activeAlbum) return;
    const url = `${window.location.origin}/#album-${activeAlbum.id}`;
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  if (activeAlbum) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-in fade-in-50">
        <div className="flex items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
          <button
            onClick={() => setActiveAlbum(null)}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-cyan-600"
          >
            <ArrowLeft className="w-4 h-4" />
            Albümlere Dön
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={copyAlbumLink}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-850 text-xs font-medium flex items-center gap-1.5"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Kopyalandı' : 'Albüm Linki'}</span>
            </button>
            {activeAlbum.isOwner && (
              <button
                onClick={() => handleDeleteAlbum(activeAlbum.id)}
                className="px-3 py-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Albümü Sil
              </button>
            )}
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Folder className="w-6 h-6 text-cyan-500" />
            {activeAlbum.title}
          </h1>
          {activeAlbum.description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
              {activeAlbum.description}
            </p>
          )}
        </div>

        {/* Album Images Grid */}
        {(!activeAlbum.images || activeAlbum.images.length === 0) ? (
          <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
            <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <ImageIcon className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Bu albüm henüz boş
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Görsel Galerim sekmesinden görselleri seçip bu albüme ekleyebilirsiniz.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {activeAlbum.images.map((img) => (
              <div
                key={img.id}
                className="group relative rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-xs hover:border-cyan-400"
              >
                <div
                  onClick={() => onViewImage(img.id)}
                  className="aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden flex items-center justify-center"
                >
                  <img
                    src={img.cdnUrl}
                    alt={img.originalName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                  />
                </div>

                <div className="p-2 text-xs flex items-center justify-between">
                  <span className="truncate max-w-[100px] text-slate-700 dark:text-slate-300 font-medium">
                    {img.originalName}
                  </span>
                  {activeAlbum.isOwner && (
                    <button
                      onClick={() => handleRemoveImageFromAlbum(img.id)}
                      className="text-slate-400 hover:text-red-500 p-0.5"
                      title="Albümden Çıkar"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Albümlerim
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Görsellerinizi tematik veya projeye özel albümlerde organize edin
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 rounded-lg shadow-sm transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Albüm</span>
        </button>
      </div>

      {/* New Album Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <FolderPlus className="w-5 h-5 text-cyan-600" />
              Yeni Albüm Oluştur
            </h3>

            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Albüm Başlığı
                </label>
                <input
                  type="text"
                  required
                  placeholder="Örn: Tatil Fotoğrafları, Tasarım Referansları"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Açıklama (İsteğe bağlı)
                </label>
                <textarea
                  rows={2}
                  placeholder="Albüm içeriği hakkında kısa bilgi..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Gizlilik Durumu
                </label>
                <select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value as ImageVisibility)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="public">Herkese Açık</option>
                  <option value="unlisted">Gizli Bağlantı</option>
                  <option value="private">Özel (Sadece Ben)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  İptal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-lg font-medium text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50"
                >
                  {isSubmitting ? 'Oluşturuluyor...' : 'Oluştur'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Albums List */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Albümler yükleniyor...</p>
        </div>
      ) : albums.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Folder className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Henüz Albümünüz Yok
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Görsellerinizi düzenlemek ve topluca paylaşmak için yukarıdaki "Yeni Albüm" butonunu kullanabilirsiniz.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {albums.map((alb) => (
            <div
              key={alb.id}
              onClick={() => openAlbum(alb.id)}
              className="group p-5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-600 shadow-xs cursor-pointer transition-all space-y-3"
            >
              <div className="w-10 h-10 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Folder className="w-5 h-5" />
              </div>

              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                  {alb.title}
                </h4>
                <p className="text-xs text-slate-400 line-clamp-2 mt-0.5">
                  {alb.description || 'Açıklama belirtilmemiş.'}
                </p>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="capitalize">{alb.visibility === 'public' ? 'Herkese Açık' : alb.visibility === 'unlisted' ? 'Gizli Link' : 'Özel'}</span>
                <span className="text-cyan-600 dark:text-cyan-400 font-medium group-hover:underline">Görüntüle →</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
