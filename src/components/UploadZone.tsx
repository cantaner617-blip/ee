import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  UploadCloud,
  FileImage,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  ExternalLink,
  X,
  Lock,
  Globe,
  Link as LinkIcon,
  Clock,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { useAuth } from '../context/AuthContext.tsx';
import { ImageItem, ImageVisibility, UploadQueueItem } from '../types.ts';

interface UploadZoneProps {
  onImageUploaded?: (image: ImageItem) => void;
  onViewImage?: (id: string) => void;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onImageUploaded, onViewImage }) => {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [visibility, setVisibility] = useState<ImageVisibility>('public');
  const [expirationMinutes, setExpirationMinutes] = useState<number>(0); // 0 = permanent
  const [copiedLinkMap, setCopiedLinkMap] = useState<Record<string, boolean>>({});
  const [isUploadingGlobal, setIsUploadingGlobal] = useState(false);
  const [clipboardBanner, setClipboardBanner] = useState(false);

  // Global paste handler (Ctrl+V anywhere on window)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const imageFiles: File[] = [];
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith('image/')) {
          const file = items[i].getAsFile();
          if (file) {
            imageFiles.push(file);
          }
        }
      }

      if (imageFiles.length > 0) {
        e.preventDefault();
        setClipboardBanner(true);
        setTimeout(() => setClipboardBanner(false), 3000);
        addFilesToQueue(imageFiles);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  const addFilesToQueue = (files: File[]) => {
    const newItems: UploadQueueItem[] = files.map((file) => ({
      id: Math.random().toString(36).substring(2, 9),
      file,
      previewUrl: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
      abortController: new AbortController(),
    }));

    setQueue((prev) => [...prev, ...newItems]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const validFiles: File[] = [];
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          validFiles.push(file);
        }
      }
      if (validFiles.length > 0) {
        addFilesToQueue(validFiles);
      }
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFilesToQueue(Array.from(e.target.files));
      e.target.value = ''; // Reset input
    }
  };

  const handleCancelItem = (id: string) => {
    setQueue((prev) => {
      const item = prev.find((q) => q.id === id);
      if (item?.abortController) {
        item.abortController.abort();
      }
      return prev.filter((q) => q.id !== id);
    });
  };

  // Process queue sequentially or with max concurrency
  const processQueue = useCallback(async () => {
    const pendingItems = queue.filter((item) => item.status === 'pending');
    if (pendingItems.length === 0 || isUploadingGlobal) return;

    setIsUploadingGlobal(true);

    for (const item of pendingItems) {
      // Mark as uploading
      setQueue((prev) =>
        prev.map((q) => (q.id === item.id ? { ...q, status: 'uploading' } : q))
      );

      try {
        const result = await api.uploadImageWithProgress(item.file, {
          visibility,
          expirationMinutes,
          onProgress: (percent) => {
            setQueue((prev) =>
              prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q))
            );
          },
          abortSignal: item.abortController?.signal,
        });

        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'completed', progress: 100, result } : q
          )
        );

        if (onImageUploaded) {
          onImageUploaded(result);
        }
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q) =>
            q.id === item.id ? { ...q, status: 'error', errorMessage: err.message } : q
          )
        );
      }
    }

    setIsUploadingGlobal(false);
  }, [queue, isUploadingGlobal, visibility, expirationMinutes, onImageUploaded]);

  useEffect(() => {
    const hasPending = queue.some((item) => item.status === 'pending');
    if (hasPending && !isUploadingGlobal) {
      processQueue();
    }
  }, [queue, isUploadingGlobal, processQueue]);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedLinkMap((prev) => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedLinkMap((prev) => ({ ...prev, [key]: false }));
    }, 2000);
  };

  const completedItems = queue.filter((item) => item.status === 'completed' && item.result);

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {/* Clipboard Toast Banner */}
      {clipboardBanner && (
        <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 text-cyan-700 dark:text-cyan-300 rounded-xl text-xs font-medium flex items-center justify-between animate-in fade-in slide-in-from-top-2">
          <span className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            Panodan görsel yakalandı ve yükleme kuyruğuna eklendi!
          </span>
          <span className="font-mono text-[11px] text-cyan-600/70 dark:text-cyan-400/70">Ctrl+V</span>
        </div>
      )}

      {/* Main Drag-and-Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-8 md:p-12 text-center transition-all group ${
          isDragging
            ? 'border-cyan-500 bg-cyan-50/50 dark:bg-cyan-950/20 scale-[1.01]'
            : 'border-slate-300 dark:border-slate-800 hover:border-cyan-400 dark:hover:border-cyan-600 bg-white/70 dark:bg-slate-900/70 hover:bg-slate-50/50 dark:hover:bg-slate-850/50'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFileInputChange}
        />

        <div className="flex flex-col items-center justify-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-cyan-50 dark:bg-cyan-950/50 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-110 transition-transform shadow-inner">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div className="space-y-1.5">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              Görsellerinizi buraya sürükleyip bırakın
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              veya dosya yöneticisinden seçmek için <span className="text-cyan-600 dark:text-cyan-400 font-medium underline underline-offset-4">tıklayın</span>
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-slate-400 dark:text-slate-500 pt-2">
            <span>JPEG, PNG, WEBP, GIF</span>
            <span aria-hidden="true">·</span>
            <span>Maksimum 10 MB</span>
            <span aria-hidden="true">·</span>
            <span>Doğrudan Pano Yapıştırma (Ctrl+V)</span>
          </div>
        </div>
      </div>

      {/* Upload Settings Toolbar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Privacy Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
            Gizlilik:
          </label>
          <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-xs font-medium w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setVisibility('public')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                visibility === 'public'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Herkese Açık</span>
            </button>
            <button
              type="button"
              onClick={() => setVisibility('unlisted')}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                visibility === 'unlisted'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LinkIcon className="w-3.5 h-3.5" />
              <span>Gizli Link</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  alert('Özel görsel yüklemek için önce giriş yapmalısınız.');
                  return;
                }
                setVisibility('private');
              }}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md transition-colors ${
                visibility === 'private'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              <span>Sadece Ben</span>
            </button>
          </div>
        </div>

        {/* Expiration Selector */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            Saklama Süresi:
          </label>
          <select
            value={expirationMinutes}
            onChange={(e) => setExpirationMinutes(parseInt(e.target.value, 10))}
            className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-none rounded-lg text-xs font-medium focus:ring-2 focus:ring-cyan-500"
          >
            <option value="0">Kalıcı (Süresiz)</option>
            <option value="10">10 Dakika Sonra Sil</option>
            <option value="60">1 Saat Sonra Sil</option>
            <option value="1440">24 Saat Sonra Sil</option>
            <option value="10080">7 Gün Sonra Sil</option>
          </select>
        </div>
      </div>

      {/* Upload Progress Queue */}
      {queue.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
            <span className="font-semibold uppercase tracking-wider">Yükleme Kuyruğu ({queue.length})</span>
            {completedItems.length > 0 && (
              <button
                onClick={() => setQueue([])}
                className="text-cyan-600 dark:text-cyan-400 hover:underline"
              >
                Kuyruğu Temizle
              </button>
            )}
          </div>

          <div className="space-y-2">
            {queue.map((item) => (
              <div
                key={item.id}
                className="p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex items-center gap-3.5"
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0 border border-slate-200 dark:border-slate-700">
                  <img
                    src={item.previewUrl}
                    alt={item.file.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info & Progress */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-slate-800 dark:text-slate-200 truncate pr-2">
                      {item.file.name}
                    </span>
                    <span className="font-mono text-slate-400 shrink-0">
                      {(item.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>

                  {item.status === 'uploading' && (
                    <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-cyan-500 h-full rounded-full transition-all duration-150"
                        style={{ width: `${item.progress}%` }}
                      ></div>
                    </div>
                  )}

                  {item.status === 'completed' && (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Yüklendi (CDN hazır)</span>
                    </div>
                  )}

                  {item.status === 'error' && (
                    <div className="flex items-center gap-1.5 text-xs text-red-600 dark:text-red-400 font-medium">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span className="truncate">{item.errorMessage || 'Yüklenemedi'}</span>
                    </div>
                  )}

                  {item.status === 'pending' && (
                    <span className="text-xs text-slate-400">Beklemede...</span>
                  )}
                </div>

                {/* Action button */}
                <div className="shrink-0">
                  {item.status !== 'completed' ? (
                    <button
                      onClick={() => handleCancelItem(item.id)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      title="İptal Et"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onViewImage && item.result && onViewImage(item.result.id)}
                      className="p-1.5 rounded-lg text-cyan-600 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 transition-colors"
                      title="Görüntüle"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Uploads Share Links Cards */}
      {completedItems.length > 0 && (
        <div className="space-y-4 pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            <h4 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
              Paylaşım Bağlantıları
            </h4>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              {completedItems.length} görsel yüklendi
            </span>
          </div>

          <div className="space-y-4">
            {completedItems.map((item) => {
              const res = item.result!;
              return (
                <div
                  key={res.id}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm space-y-4"
                >
                  {/* Header info */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-lg bg-slate-100 dark:bg-slate-800 overflow-hidden border border-slate-200 dark:border-slate-700 shrink-0">
                        <img
                          src={res.cdnUrl}
                          alt={res.originalName}
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <div>
                        <h5 className="text-sm font-semibold text-slate-900 dark:text-white truncate max-w-sm">
                          {res.originalName}
                        </h5>
                        <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          <span>{res.width}x{res.height} px</span>
                          <span aria-hidden="true">·</span>
                          <span>{(res.sizeBytes / (1024 * 1024)).toFixed(2)} MB</span>
                          <span aria-hidden="true">·</span>
                          <span className="uppercase">{res.extension}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => onViewImage && onViewImage(res.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:bg-cyan-50 dark:hover:bg-cyan-950/30 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Sayfayı Aç
                    </button>
                  </div>

                  {/* Share Links Form */}
                  <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
                    {/* 1. Görsel Sayfası */}
                    <div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
                        <span className="font-medium">1. Görsel Görüntüleme Sayfası</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={res.links.viewUrl}
                          className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-700 dark:text-slate-300 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(res.links.viewUrl, `${res.id}_view`)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                        >
                          {copiedLinkMap[`${res.id}_view`] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 2. Doğrudan CDN Linki */}
                    <div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
                        <span className="font-medium">2. Doğrudan Görsel CDN Bağlantısı</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={res.links.directCdnUrl}
                          className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-700 dark:text-slate-300 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(res.links.directCdnUrl, `${res.id}_cdn`)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                        >
                          {copiedLinkMap[`${res.id}_cdn`] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 3. HTML Embed */}
                    <div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
                        <span className="font-medium">3. HTML Embed Kodu</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={res.links.htmlEmbed}
                          className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-700 dark:text-slate-300 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(res.links.htmlEmbed, `${res.id}_html`)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                        >
                          {copiedLinkMap[`${res.id}_html`] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 4. Markdown Embed */}
                    <div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
                        <span className="font-medium">4. Markdown Kodu</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={res.links.markdownEmbed}
                          className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-700 dark:text-slate-300 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(res.links.markdownEmbed, `${res.id}_md`)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                        >
                          {copiedLinkMap[`${res.id}_md`] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* 5. Forum BBCode */}
                    <div>
                      <div className="flex items-center justify-between text-slate-600 dark:text-slate-400 mb-1">
                        <span className="font-medium">5. Forum BBCode Kodu</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          readOnly
                          value={res.links.bbCodeEmbed}
                          className="flex-1 px-3 py-1.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg font-mono text-slate-700 dark:text-slate-300 select-all"
                        />
                        <button
                          type="button"
                          onClick={() => copyToClipboard(res.links.bbCodeEmbed, `${res.id}_bb`)}
                          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white rounded-lg font-medium flex items-center gap-1.5 shrink-0 transition-colors"
                        >
                          {copiedLinkMap[`${res.id}_bb`] ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Kopyalandı</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Kopyala</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
