import React, { useState, useEffect, useCallback } from 'react';
import {
  Grid,
  List,
  Search,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  FolderPlus,
  Lock,
  Globe,
  Link as LinkIcon,
  Filter,
  Layers,
  HardDrive,
  Calendar,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { ImageItem, ImageVisibility, AlbumItem } from '../types.ts';

interface UserGalleryProps {
  onViewImage: (id: string) => void;
}

export const UserGallery: React.FC<UserGalleryProps> = ({ onViewImage }) => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & display
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [search, setSearch] = useState('');
  const [mimeType, setMimeType] = useState('');
  const [visibility, setVisibility] = useState<string>('');

  // Multi-select & Batch Actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [albums, setAlbums] = useState<AlbumItem[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchImages = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await api.getUserImages({
        page,
        limit: 18,
        search: search || undefined,
        mimeType: mimeType || undefined,
        visibility: (visibility as ImageVisibility) || undefined,
      });
      setImages(res.images);
      setTotal(res.total);
      setTotalPages(res.totalPages || 1);
    } catch (err: any) {
      console.error('Görseller yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  }, [page, search, mimeType, visibility]);

  useEffect(() => {
    fetchImages();
  }, [fetchImages]);

  // Load user's albums for "Add to Album" action
  useEffect(() => {
    api.getUserAlbums().then(setAlbums).catch(() => {});
  }, []);

  const toggleSelectImage = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedIds.length === images.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(images.map((i) => i.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Seçili ${selectedIds.length} adet görseli silmek istediğinize emin misiniz?`)) return;

    try {
      await api.batchDeleteImages(selectedIds);
      setSelectedIds([]);
      fetchImages();
    } catch (err: any) {
      alert('Toplu silme hatası: ' + err.message);
    }
  };

  const handleAddToAlbum = async () => {
    if (!selectedAlbumId || selectedIds.length === 0) return;
    try {
      await api.addImagesToAlbum(selectedAlbumId, selectedIds);
      alert(`${selectedIds.length} görsel albüme eklendi.`);
      setSelectedIds([]);
      setSelectedAlbumId('');
    } catch (err: any) {
      alert('Albüme ekleme hatası: ' + err.message);
    }
  };

  const copyLink = (url: string, key: string) => {
    navigator.clipboard.writeText(url);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title & Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Görsel Galerim
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Yüklediğiniz tüm görselleri yönetin, filtreleyin ve albümlere ayırın ({total} görsel)
          </p>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-2">
          <div className="flex items-center p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              title="Grid Görünümü"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}
              title="Liste Görünümü"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Dosya adına göre ara..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Format */}
          <select
            value={mimeType}
            onChange={(e) => { setMimeType(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
          >
            <option value="">Tüm Formatlar</option>
            <option value="image/jpeg">JPEG / JPG</option>
            <option value="image/png">PNG</option>
            <option value="image/webp">WEBP</option>
            <option value="image/gif">GIF</option>
          </select>

          {/* Visibility */}
          <select
            value={visibility}
            onChange={(e) => { setVisibility(e.target.value); setPage(1); }}
            className="px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-700 dark:text-slate-300"
          >
            <option value="">Tüm Gizlilikler</option>
            <option value="public">Herkese Açık</option>
            <option value="unlisted">Gizli Link</option>
            <option value="private">Özel</option>
          </select>
        </div>
      </div>

      {/* Batch Action Bar (Visible when items selected) */}
      {selectedIds.length > 0 && (
        <div className="p-3 bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs animate-in fade-in-50">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-cyan-800 dark:text-cyan-200">
              {selectedIds.length} görsel seçildi
            </span>
            <button
              onClick={selectAll}
              className="text-cyan-600 dark:text-cyan-400 hover:underline"
            >
              {selectedIds.length === images.length ? 'Seçimi Kaldır' : 'Tümünü Seç'}
            </button>
          </div>

          <div className="flex items-center gap-2">
            {albums.length > 0 && (
              <div className="flex items-center gap-1.5">
                <select
                  value={selectedAlbumId}
                  onChange={(e) => setSelectedAlbumId(e.target.value)}
                  className="px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-cyan-300 dark:border-cyan-700 rounded-lg text-slate-800 dark:text-slate-200"
                >
                  <option value="">Albüme Ekle...</option>
                  {albums.map((alb) => (
                    <option key={alb.id} value={alb.id}>
                      {alb.title}
                    </option>
                  ))}
                </select>
                <button
                  onClick={handleAddToAlbum}
                  disabled={!selectedAlbumId}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg font-medium flex items-center gap-1"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  Ekle
                </button>
              </div>
            )}

            <button
              onClick={handleBatchDelete}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Seçilenleri Sil
            </button>
          </div>
        </div>
      )}

      {/* Loading state */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
          <p className="text-xs text-slate-400">Görseller getiriliyor...</p>
        </div>
      ) : images.length === 0 ? (
        <div className="py-20 text-center space-y-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-8">
          <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
            <Filter className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
            Görsel Bulunamadı
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Arama kriterlerinize uyan görsel bulunmuyor veya henüz hiç görsel yüklemediniz.
          </p>
        </div>
      ) : viewMode === 'grid' ? (
        /* Grid View */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {images.map((img) => {
            const isSelected = selectedIds.includes(img.id);
            return (
              <div
                key={img.id}
                className={`group relative rounded-xl border overflow-hidden bg-white dark:bg-slate-900 transition-all ${
                  isSelected
                    ? 'border-cyan-500 ring-2 ring-cyan-500/30'
                    : 'border-slate-200 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-600 shadow-xs'
                }`}
              >
                {/* Checkbox trigger */}
                <button
                  type="button"
                  onClick={() => toggleSelectImage(img.id)}
                  className={`absolute top-2 left-2 z-10 w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-cyan-600 border-cyan-600 text-white'
                      : 'bg-black/40 border-white/60 text-transparent opacity-0 group-hover:opacity-100'
                  }`}
                >
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </button>

                {/* Privacy Badge icon */}
                <div className="absolute top-2 right-2 z-10 p-1 rounded-md bg-black/60 text-white backdrop-blur-xs">
                  {img.visibility === 'public' && <Globe className="w-3 h-3 text-cyan-300" />}
                  {img.visibility === 'unlisted' && <LinkIcon className="w-3 h-3 text-amber-300" />}
                  {img.visibility === 'private' && <Lock className="w-3 h-3 text-slate-300" />}
                </div>

                {/* Image Media Container */}
                <div
                  onClick={() => onViewImage(img.id)}
                  className="aspect-square bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden flex items-center justify-center relative"
                >
                  <img
                    src={img.cdnUrl}
                    alt={img.originalName}
                    loading="lazy"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  />
                </div>

                {/* Footer details */}
                <div className="p-2.5 text-xs space-y-1">
                  <p className="font-medium text-slate-800 dark:text-slate-200 truncate" title={img.originalName}>
                    {img.originalName}
                  </p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>{(img.sizeBytes / (1024 * 1024)).toFixed(1)} MB</span>
                    <button
                      onClick={() => copyLink(img.links.viewUrl, img.id)}
                      className="hover:text-cyan-600 dark:hover:text-cyan-400 p-0.5"
                      title="Sayfa linkini kopyala"
                    >
                      {copiedKey === img.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* List View */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800 font-medium">
              <tr>
                <th className="p-3 w-8">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === images.length && images.length > 0}
                    onChange={selectAll}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                </th>
                <th className="p-3">Görsel</th>
                <th className="p-3">Dosya Adı</th>
                <th className="p-3">Çözünürlük</th>
                <th className="p-3">Boyut</th>
                <th className="p-3">Format</th>
                <th className="p-3">Gizlilik</th>
                <th className="p-3 text-right">İşlemler</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {images.map((img) => {
                const isSelected = selectedIds.includes(img.id);
                return (
                  <tr key={img.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50 transition-colors">
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectImage(img.id)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                    </td>
                    <td className="p-3">
                      <div
                        onClick={() => onViewImage(img.id)}
                        className="w-10 h-10 rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-800 cursor-pointer border border-slate-200 dark:border-slate-700"
                      >
                        <img src={img.cdnUrl} alt={img.originalName} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white truncate max-w-xs">
                      {img.originalName}
                    </td>
                    <td className="p-3 font-mono tabular-nums text-slate-500">
                      {img.width}x{img.height}
                    </td>
                    <td className="p-3 font-mono tabular-nums text-slate-500">
                      {(img.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="p-3 uppercase font-mono text-slate-500">
                      {img.extension}
                    </td>
                    <td className="p-3">
                      <span className="capitalize text-slate-700 dark:text-slate-300">
                        {img.visibility === 'public' ? 'Açık' : img.visibility === 'unlisted' ? 'Gizli' : 'Özel'}
                      </span>
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => copyLink(img.links.viewUrl, img.id)}
                        className="p-1 text-slate-500 hover:text-cyan-600 transition-colors"
                        title="Link Kopyala"
                      >
                        {copiedKey === img.id ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => onViewImage(img.id)}
                        className="p-1 text-slate-500 hover:text-cyan-600 transition-colors"
                        title="Görüntüle"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200 dark:border-slate-800">
          <span>Sayfa {page} / {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Önceki
            </button>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 disabled:opacity-40 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              Sonraki
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
