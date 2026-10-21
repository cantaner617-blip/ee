import React, { useState, useEffect } from 'react';
import {
  Download,
  Share2,
  Copy,
  Check,
  Maximize2,
  Minimize2,
  Flag,
  Trash2,
  ArrowLeft,
  Calendar,
  Layers,
  FileCheck,
  HardDrive,
  Eye,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ImageItem } from '../types.ts';

interface ImageViewerProps {
  imageId: string;
  onBack: () => void;
  onDeleted?: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ imageId, onBack, onDeleted }) => {
  const { user } = useAuth();
  const [image, setImage] = useState<ImageItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Report modal state
  const [isReportOpen, setIsReportOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Uygunsuz İçerik');
  const [reportDetails, setReportDetails] = useState('');
  const [reportSent, setReportSent] = useState(false);
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    setError(null);

    api.getImage(imageId)
      .then((data) => {
        if (isMounted) {
          setImage(data);
          setIsLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Görsel yüklenemedi.');
          setIsLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [imageId]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDelete = async () => {
    if (!window.confirm('Bu görseli silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteImage(imageId);
      if (onDeleted) onDeleted();
      else onBack();
    } catch (err: any) {
      alert('Silme hatası: ' + err.message);
    }
  };

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingReport(true);
    try {
      await api.reportImage(imageId, reportReason, reportDetails);
      setReportSent(true);
      setTimeout(() => {
        setIsReportOpen(false);
        setReportSent(false);
        setReportDetails('');
      }, 2000);
    } catch (err: any) {
      alert('Şikayet gönderilemedi: ' + err.message);
    } finally {
      setIsSubmittingReport(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-5xl mx-auto py-16 px-4 flex flex-col items-center justify-center space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
        <p className="text-sm text-slate-500 dark:text-slate-400">Görsel yükleniyor...</p>
      </div>
    );
  }

  if (error || !image) {
    return (
      <div className="max-w-xl mx-auto py-16 px-4 text-center space-y-5">
        <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 flex items-center justify-center">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Görsel Bulunamadı
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {error || 'Aradığınız görsel silinmiş, süresi dolmuş veya bağlantı hatalı olabilir.'}
          </p>
        </div>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 rounded-xl transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Ana Sayfaya Dön
        </button>
      </div>
    );
  }

  const uploadDate = new Date(image.createdAt).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const canDelete = image.canDelete || (user && (user.id === image.ownerId || user.role === 'admin'));

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-8 animate-in fade-in-50 duration-200">
      {/* Top action row */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-cyan-600 dark:hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Geri Dön</span>
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsReportOpen(true)}
            className="p-2 text-slate-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30 rounded-lg transition-colors text-xs flex items-center gap-1.5"
            title="İçeriği Bildir"
          >
            <Flag className="w-4 h-4" />
            <span className="hidden sm:inline">Şikayet Et</span>
          </button>

          {canDelete && (
            <button
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition-colors text-xs flex items-center gap-1.5"
              title="Görseli Sil"
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Görseli Sil</span>
            </button>
          )}

          <a
            href={`/api/images/${image.id}/download`}
            download={image.originalName}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-sm transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Orijinalini İndir</span>
          </a>
        </div>
      </div>

      {/* Main Image Display Stage */}
      <div className="relative rounded-2xl bg-slate-900 border border-slate-800 overflow-hidden shadow-lg flex items-center justify-center min-h-[360px] max-h-[700px] group">
        <img
          src={image.cdnUrl}
          alt={image.originalName}
          className={`transition-all duration-200 ${
            isZoomed
              ? 'max-h-none w-auto max-w-none cursor-zoom-out'
              : 'max-h-[680px] w-auto max-w-full object-contain cursor-zoom-in'
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />

        {/* Floating Zoom Switcher */}
        <button
          onClick={() => setIsZoomed(!isZoomed)}
          className="absolute bottom-4 right-4 p-2.5 rounded-xl bg-slate-950/80 text-white hover:bg-slate-900 border border-slate-700/60 shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
          title={isZoomed ? 'Küçült' : 'Büyüt'}
        >
          {isZoomed ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
        </button>
      </div>

      {/* Details & Share Codes Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left Column: Metadata Details */}
        <div className="lg:col-span-1 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 shadow-xs">
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white break-words">
              {image.originalName}
            </h1>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
              Kimlik: {image.id}
            </p>
          </div>

          <div className="space-y-3.5 text-xs border-t border-slate-100 dark:border-slate-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Layers className="w-4 h-4 text-slate-400" /> Çözünürlük
              </span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                {image.width} × {image.height} px
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-slate-400" /> Dosya Boyutu
              </span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 tabular-nums">
                {(image.sizeBytes / (1024 * 1024)).toFixed(2)} MB
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-slate-400" /> Format / MIME
              </span>
              <span className="font-mono font-medium text-slate-800 dark:text-slate-200 uppercase">
                {image.extension} ({image.mimeType})
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Eye className="w-4 h-4 text-slate-400" /> Görünürlük
              </span>
              <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">
                {image.visibility === 'public'
                  ? 'Herkese Açık'
                  : image.visibility === 'unlisted'
                  ? 'Gizli Bağlantı'
                  : 'Özel'}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-slate-400" /> Yüklenme Tarihi
              </span>
              <span className="text-slate-800 dark:text-slate-200">
                {uploadDate}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Share Links and Embed Codes */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 shadow-xs">
          <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Share2 className="w-4 h-4 text-cyan-500" />
            Paylaşım ve Yerleştirme Kodları
          </h2>

          <div className="space-y-4 text-xs">
            {/* 1. Görsel Sayfası */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Görsel Sayfası (Kullanıcı Görüntüleme)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={image.links.viewUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-800 dark:text-slate-200 select-all"
                />
                <button
                  onClick={() => copyToClipboard(image.links.viewUrl, 'view')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedKey === 'view' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'view' ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* 2. Doğrudan CDN Bağlantısı */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Doğrudan CDN Görsel Bağlantısı
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={image.links.directCdnUrl}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-800 dark:text-slate-200 select-all"
                />
                <button
                  onClick={() => copyToClipboard(image.links.directCdnUrl, 'cdn')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedKey === 'cdn' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'cdn' ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* 3. HTML Embed */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                HTML Embed Kodu (Web Siteleri ve Bloglar İçin)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={image.links.htmlEmbed}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-800 dark:text-slate-200 select-all"
                />
                <button
                  onClick={() => copyToClipboard(image.links.htmlEmbed, 'html')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedKey === 'html' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'html' ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* 4. Markdown Embed */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Markdown Kodu (GitHub, Reddit, Notion İçin)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={image.links.markdownEmbed}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-800 dark:text-slate-200 select-all"
                />
                <button
                  onClick={() => copyToClipboard(image.links.markdownEmbed, 'md')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedKey === 'md' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'md' ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>

            {/* 5. Forum BBCode */}
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Forum BBCode Kodu (DonanımHaber, R10 vb. Forumlar İçin)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={image.links.bbCodeEmbed}
                  className="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-800 dark:text-slate-200 select-all"
                />
                <button
                  onClick={() => copyToClipboard(image.links.bbCodeEmbed, 'bb')}
                  className="px-3.5 py-2 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedKey === 'bb' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedKey === 'bb' ? 'Kopyalandı' : 'Kopyala'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Report Modal */}
      {isReportOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-md w-full p-6 space-y-4 border border-slate-200 dark:border-slate-800 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Flag className="w-5 h-5 text-amber-500" />
              İçeriği Şikayet Et
            </h3>

            {reportSent ? (
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl text-center text-sm font-medium">
                Şikâyetiniz incelenmek üzere iletildi. Teşekkür ederiz.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Şikayet Nedeni
                  </label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
                  >
                    <option value="Telif Hakkı / DMCA">Telif Hakkı İhlali (DMCA)</option>
                    <option value="Kişisel Gizlilik / İfşa">Kişisel Gizlilik / Rızasız Paylaşım</option>
                    <option value="Yasa Dışı / Zararlı İçerik">Yasa Dışı / Zararlı İçerik</option>
                    <option value="Spam / Dolandırıcılık">Spam veya Dolandırıcılık</option>
                    <option value="Diğer">Diğer</option>
                  </select>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Açıklama veya Kanıt Bağlantısı (İsteğe bağlı)
                  </label>
                  <textarea
                    rows={3}
                    value={reportDetails}
                    onChange={(e) => setReportDetails(e.target.value)}
                    placeholder="Şikayetinizi detaylandırın..."
                    className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsReportOpen(false)}
                    className="px-4 py-2 rounded-lg font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    İptal
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingReport}
                    className="px-4 py-2 rounded-lg font-medium text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50"
                  >
                    {isSubmittingReport ? 'Gönderiliyor...' : 'Şikayeti Gönder'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
