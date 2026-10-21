import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Image as ImageIcon,
  HardDrive,
  AlertOctagon,
  Settings,
  CheckCircle2,
  AlertTriangle,
  Search,
  Trash2,
  ExternalLink,
  Ban,
  Check,
  RefreshCw,
  Activity,
  Radio,
  FileCheck,
} from 'lucide-react';
import { api } from '../lib/api.ts';
import { User, ImageItem, ReportItem, SitePublicSettings, UserRole, UserStatus, ReportStatus } from '../types.ts';

export const AdminPanel: React.FC<{ onViewImage: (id: string) => void }> = ({ onViewImage }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'images' | 'reports' | 'settings'>('overview');
  const [isLoading, setIsLoading] = useState(true);

  // Stats
  const [stats, setStats] = useState<any>(null);
  const [bunnyTestResult, setBunnyTestResult] = useState<any>(null);
  const [isTestingBunny, setIsTestingBunny] = useState(false);

  // Users tab
  const [users, setUsers] = useState<User[]>([]);
  const [userSearch, setUserSearch] = useState('');

  // Images tab
  const [images, setImages] = useState<ImageItem[]>([]);
  const [imageTotal, setImageTotal] = useState(0);
  const [imagePage, setImagePage] = useState(1);
  const [imageSearch, setImageSearch] = useState('');

  // Reports tab
  const [reports, setReports] = useState<ReportItem[]>([]);

  // Settings tab
  const [settings, setSettings] = useState<SitePublicSettings | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Form states for settings
  const [maxFileMb, setMaxFileMb] = useState<number>(10);
  const [allowGuestUpload, setAllowGuestUpload] = useState<boolean>(true);
  const [allowRegistration, setAllowRegistration] = useState<boolean>(true);
  const [maintenanceMode, setMaintenanceMode] = useState<boolean>(false);
  const [siteName, setSiteName] = useState<string>('');
  const [siteDescription, setSiteDescription] = useState<string>('');

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [statsData, settingsData] = await Promise.all([
        api.getAdminStats(),
        api.getPublicSettings(),
      ]);
      setStats(statsData);
      setSettings(settingsData);
      setMaxFileMb(Math.round(settingsData.maxFileSize / (1024 * 1024)));
      setAllowGuestUpload(settingsData.allowGuestUpload);
      setAllowRegistration(settingsData.allowRegistration);
      setMaintenanceMode(settingsData.maintenanceMode);
      setSiteName(settingsData.siteName);
      setSiteDescription(settingsData.siteDescription);
    } catch (err: any) {
      console.error('Admin paneli yüklenemedi:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadUsers = async () => {
    try {
      const data = await api.getAdminUsers();
      setUsers(data);
    } catch (err: any) {
      alert('Kullanıcılar yüklenemedi: ' + err.message);
    }
  };

  const loadImages = async () => {
    try {
      const data = await api.getAdminImages(imagePage, 20, imageSearch);
      setImages(data.images);
      setImageTotal(data.total);
    } catch (err: any) {
      alert('Görseller yüklenemedi: ' + err.message);
    }
  };

  const loadReports = async () => {
    try {
      const data = await api.getAdminReports();
      setReports(data);
    } catch (err: any) {
      alert('Şikayetler yüklenemedi: ' + err.message);
    }
  };

  useEffect(() => {
    if (activeTab === 'users') loadUsers();
    if (activeTab === 'images') loadImages();
    if (activeTab === 'reports') loadReports();
  }, [activeTab, imagePage, imageSearch]);

  const handleTestBunny = async () => {
    setIsTestingBunny(true);
    try {
      const result = await api.testBunny();
      setBunnyTestResult(result);
    } catch (err: any) {
      setBunnyTestResult({
        configured: false,
        storageAccessible: false,
        cdnAccessible: false,
        details: 'Bağlantı test hatası: ' + err.message,
      });
    } finally {
      setIsTestingBunny(false);
    }
  };

  const handleToggleUserBan = async (user: User) => {
    const newStatus: UserStatus = user.status === 'active' ? 'banned' : 'active';
    try {
      await api.updateUserStatus(user.id, newStatus);
      loadUsers();
    } catch (err: any) {
      alert('Durum güncellenemedi: ' + err.message);
    }
  };

  const handleToggleUserRole = async (user: User) => {
    const newRole: UserRole = user.role === 'admin' ? 'user' : 'admin';
    if (!window.confirm(`${user.username} kullanıcısının rolünü ${newRole} yapmak istediğinize emin misiniz?`)) return;
    try {
      await api.updateUserRole(user.id, newRole);
      loadUsers();
    } catch (err: any) {
      alert('Rol güncellenemedi: ' + err.message);
    }
  };

  const handleDeleteImage = async (id: string) => {
    if (!window.confirm('Bu görseli kalıcı olarak silmek istediğinize emin misiniz?')) return;
    try {
      await api.deleteAdminImage(id);
      loadImages();
      api.getAdminStats().then(setStats);
    } catch (err: any) {
      alert('Görsel silinemedi: ' + err.message);
    }
  };

  const handleUpdateReport = async (id: string, status: ReportStatus) => {
    try {
      await api.updateReportStatus(id, status);
      loadReports();
      api.getAdminStats().then(setStats);
    } catch (err: any) {
      alert('Şikayet güncellenemedi: ' + err.message);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSaveSuccess(false);

    try {
      await api.updateAdminSettings({
        maxFileSize: maxFileMb * 1024 * 1024,
        allowGuestUpload,
        allowRegistration,
        maintenanceMode,
        siteName,
        siteDescription,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('Ayarlar kaydedilemedi: ' + err.message);
    } finally {
      setIsSavingSettings(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center">
        <div className="w-8 h-8 border-3 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mx-auto mb-3"></div>
        <p className="text-xs text-slate-400">Yönetim verileri yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-amber-500" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              Sistem Yönetim Paneli
            </h1>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Görseller, kullanıcılar, Bunny.net CDN altyapısı ve platform ayarlarını yönetin
          </p>
        </div>

        {/* Tab navigation buttons */}
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl text-xs font-medium overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'overview' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Genel Bakış
          </button>
          <button
            onClick={() => setActiveTab('images')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'images' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Görseller ({stats?.totalImages ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('users')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'users' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Kullanıcılar ({stats?.totalUsers ?? 0})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 ${
              activeTab === 'reports' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            <span>Şikayetler</span>
            {stats?.pendingReports > 0 && (
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
              activeTab === 'settings' ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-xs font-semibold' : 'text-slate-600 dark:text-slate-400'
            }`}
          >
            Ayarlar
          </button>
        </div>
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-400">Toplam Kullanıcı</span>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {stats?.totalUsers ?? 0}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-400">Toplam Görsel</span>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {stats?.totalImages ?? 0}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-400">Bugünkü Yüklemeler</span>
              <p className="text-2xl font-bold font-mono text-cyan-600 dark:text-cyan-400 mt-1 tabular-nums">
                {stats?.todayUploads ?? 0}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-400">Aktif Depolama</span>
              <p className="text-2xl font-bold font-mono text-slate-900 dark:text-white mt-1 tabular-nums">
                {stats?.storageFormatted ?? '0 MB'}
              </p>
            </div>
            <div className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs">
              <span className="text-xs font-medium text-slate-400">Bekleyen Şikayet</span>
              <p className="text-2xl font-bold font-mono text-amber-500 mt-1 tabular-nums">
                {stats?.pendingReports ?? 0}
              </p>
            </div>
          </div>

          {/* Bunny.net Real Diagnostics Card */}
          <div className="p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 flex items-center justify-center font-bold text-sm">
                  🐰
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    Bunny.net Storage & CDN Canlı Durumu
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bölge: <span className="font-mono uppercase">{stats?.bunnyConfig?.storageRegion || 'de'}</span> · Zone: <span className="font-mono">{stats?.bunnyConfig?.storageZone || 'Belirtilmedi'}</span>
                  </p>
                </div>
              </div>

              <button
                onClick={handleTestBunny}
                disabled={isTestingBunny}
                className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 rounded-xl flex items-center gap-1.5 transition-colors self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingBunny ? 'animate-spin' : ''}`} />
                <span>{isTestingBunny ? 'Test Ediliyor...' : 'Bağlantıyı Canlı Test Et'}</span>
              </button>
            </div>

            {bunnyTestResult ? (
              <div className={`p-4 rounded-xl border text-xs font-medium space-y-2 ${
                bunnyTestResult.storageAccessible
                  ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}>
                <div className="flex items-center gap-2 font-bold">
                  {bunnyTestResult.storageAccessible ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                  )}
                  <span>Test Sonucu:</span>
                </div>
                <p>{bunnyTestResult.details}</p>
                {bunnyTestResult.latencyMs && (
                  <p className="font-mono text-[11px]">API Gecikme Süresi: {bunnyTestResult.latencyMs}ms</p>
                )}
              </div>
            ) : (
              <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 space-y-1">
                <p>
                  Durum: <span className="font-semibold">{stats?.bunnyConfig?.isConfigured ? 'Yapılandırıldı' : 'Geliştirme / Yerel Depolama Modu'}</span>
                </p>
                <p className="text-slate-400">
                  CDN Base URL: <span className="font-mono">{stats?.bunnyConfig?.cdnBaseUrl || 'Belirtilmedi'}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* IMAGES TAB */}
      {activeTab === 'images' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div className="relative w-72">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Görsel veya ID ara..."
                value={imageSearch}
                onChange={(e) => setImageSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg"
              />
            </div>
            <span className="text-xs text-slate-400">Toplam {imageTotal} görsel</span>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Görsel</th>
                  <th className="p-3">ID</th>
                  <th className="p-3">Dosya Adı</th>
                  <th className="p-3">Boyut</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Yüklenme</th>
                  <th className="p-3 text-right">İşlem</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {images.map((img) => (
                  <tr key={img.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                    <td className="p-3">
                      <div
                        onClick={() => onViewImage(img.id)}
                        className="w-9 h-9 rounded-md bg-slate-100 overflow-hidden cursor-pointer"
                      >
                        <img src={img.cdnUrl} alt={img.originalName} className="w-full h-full object-cover" />
                      </div>
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">{img.id}</td>
                    <td className="p-3 font-medium text-slate-900 dark:text-white truncate max-w-xs">
                      {img.originalName}
                    </td>
                    <td className="p-3 font-mono tabular-nums">
                      {(img.sizeBytes / (1024 * 1024)).toFixed(2)} MB
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        img.status === 'active' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-red-50 text-red-700'
                      }`}>
                        {img.status === 'active' ? 'Aktif' : 'Silinmiş'}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {img.createdAt.split('T')[0]}
                    </td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => onViewImage(img.id)}
                        className="p-1 text-slate-400 hover:text-cyan-600"
                        title="Sayfada Aç"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteImage(img.id)}
                        className="p-1 text-slate-400 hover:text-red-600"
                        title="Kalıcı Sil"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">Kullanıcı</th>
                  <th className="p-3">E-posta</th>
                  <th className="p-3">Rol</th>
                  <th className="p-3">Durum</th>
                  <th className="p-3">Kayıt Tarihi</th>
                  <th className="p-3 text-right">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-850/50">
                    <td className="p-3 font-semibold text-slate-900 dark:text-white">
                      {u.username}
                    </td>
                    <td className="p-3 font-mono text-[11px] text-slate-400">
                      {u.email}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleToggleUserRole(u)}
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          u.role === 'admin'
                            ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                        }`}
                      >
                        {u.role}
                      </button>
                    </td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        u.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300'
                          : 'bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300'
                      }`}>
                        {u.status}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 text-[11px]">
                      {u.createdAt.split('T')[0]}
                    </td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() => handleToggleUserBan(u)}
                        className={`p-1.5 rounded-lg text-xs font-medium transition-colors ${
                          u.status === 'active'
                            ? 'text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30'
                            : 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30'
                        }`}
                      >
                        {u.status === 'active' ? 'Askıya Al' : 'Aktifleştir'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          {reports.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-xs text-slate-400">
              Henüz bildirilen herhangi bir içerik şikâyeti yok.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((rep) => (
                <div
                  key={rep.id}
                  className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-amber-600 dark:text-amber-400">
                        {rep.reason}
                      </span>
                      <span className="text-slate-400 font-mono">
                        Görsel ID: {rep.imageId}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300">
                      {rep.details || 'Açıklama belirtilmemiş.'}
                    </p>
                    <span className="text-[11px] text-slate-400">
                      Tarih: {rep.createdAt.split('T')[0]} · Durum: <span className="font-semibold uppercase">{rep.status}</span>
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => onViewImage(rep.imageId)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
                    >
                      Görseli İncele
                    </button>
                    <button
                      onClick={() => handleDeleteImage(rep.imageId)}
                      className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-500 font-medium"
                    >
                      Görseli Sil
                    </button>
                    <button
                      onClick={() => handleUpdateReport(rep.id, 'resolved')}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-500 font-medium"
                    >
                      Çözüldü İşaretle
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SETTINGS TAB */}
      {activeTab === 'settings' && (
        <form onSubmit={handleSaveSettings} className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-6 shadow-xs max-w-2xl text-xs">
          <div className="space-y-1 border-b border-slate-100 dark:border-slate-800 pb-4">
            <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Settings className="w-5 h-5 text-cyan-600" />
              Sistem ve Güvenlik Ayarları
            </h3>
            <p className="text-slate-500">
              Platform kısıtlamalarını ve çalışma modlarını backend seviyesinde yapılandırın
            </p>
          </div>

          {saveSuccess && (
            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4" />
              Ayarlar başarıyla veritabanına kaydedildi ve uygulandı.
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Site Başlığı
              </label>
              <input
                type="text"
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Site Açıklaması
              </label>
              <textarea
                rows={2}
                value={siteDescription}
                onChange={(e) => setSiteDescription(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 dark:text-slate-300 mb-1">
                Maksimum Dosya Boyutu (MB)
              </label>
              <input
                type="number"
                min={1}
                max={50}
                value={maxFileMb}
                onChange={(e) => setMaxFileMb(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowGuestUpload}
                  onChange={(e) => setAllowGuestUpload(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Misafir Yüklemelerine İzin Ver</span>
                  <span className="text-slate-400 text-[11px]">Kapatılırsa yalnızca giriş yapmış üyeler görsel yükleyebilir.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowRegistration}
                  onChange={(e) => setAllowRegistration(e.target.checked)}
                  className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-slate-800 dark:text-slate-200 block">Yeni Üye Kayıtlarına İzin Ver</span>
                  <span className="text-slate-400 text-[11px]">Kapatılırsa dışarıdan yeni kayıt alınmaz.</span>
                </div>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={maintenanceMode}
                  onChange={(e) => setMaintenanceMode(e.target.checked)}
                  className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 w-4 h-4"
                />
                <div>
                  <span className="font-semibold text-amber-700 dark:text-amber-400 block">Bakım Modu</span>
                  <span className="text-slate-400 text-[11px]">Etkinleştirilirse sadece adminler görsel yükleyebilir.</span>
                </div>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-slate-900 dark:bg-cyan-600 hover:bg-slate-800 dark:hover:bg-cyan-500 rounded-xl transition-colors disabled:opacity-50"
            >
              {isSavingSettings ? 'Kaydediliyor...' : 'Ayarları Kaydet'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
