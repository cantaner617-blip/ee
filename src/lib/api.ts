import {
  User,
  ImageItem,
  AlbumItem,
  SitePublicSettings,
  ReportItem,
  ImageVisibility,
  UserRole,
  UserStatus,
  ReportStatus,
} from '../types.ts';

const TOKEN_KEY = 'resimpaylas_auth_token';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredToken(token: string | null): void {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`/api${endpoint}`, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any;
  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = typeof data === 'object' && data?.error ? data.error : `İşlem başarısız: HTTP ${response.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Public settings
  async getPublicSettings(): Promise<SitePublicSettings> {
    return request<SitePublicSettings>('/settings/public');
  },

  // Auth
  async register(username: string, email: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async login(login: string, password: string): Promise<{ token: string; user: User }> {
    const res = await request<{ token: string; user: User }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ login, password }),
    });
    setStoredToken(res.token);
    return res;
  },

  async logout(): Promise<void> {
    try {
      await request('/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  async getMe(): Promise<User> {
    return request<User>('/auth/me');
  },

  async updatePassword(currentPassword: string, newPassword: string): Promise<{ message: string }> {
    return request('/auth/password', {
      method: 'PATCH',
      body: JSON.stringify({ currentPassword, newPassword }),
    });
  },

  async deleteAccount(confirmPassword: string): Promise<{ message: string }> {
    const res = await request<{ message: string }>('/auth/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmPassword }),
    });
    setStoredToken(null);
    return res;
  },

  // Images
  uploadImageWithProgress(
    file: File,
    options: {
      visibility: ImageVisibility;
      expirationMinutes: number;
      onProgress: (percent: number) => void;
      abortSignal?: AbortSignal;
    }
  ): Promise<ImageItem> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('images', file);
      formData.append('visibility', options.visibility);
      formData.append('expirationMinutes', String(options.expirationMinutes));

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          options.onProgress(percent);
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const data = JSON.parse(xhr.responseText);
            if (data.uploaded && data.uploaded.length > 0) {
              resolve(data.uploaded[0]);
            } else {
              reject(new Error(data.error || 'Yükleme başarısız.'));
            }
          } catch (e) {
            reject(new Error('Yanıt çözümlenemedi.'));
          }
        } else {
          try {
            const data = JSON.parse(xhr.responseText);
            reject(new Error(data.error || `Yükleme hatası: ${xhr.status}`));
          } catch {
            reject(new Error(`Yükleme hatası: ${xhr.statusText || xhr.status}`));
          }
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Ağ hatası oluştu.'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Yükleme iptal edildi.'));
      });

      if (options.abortSignal) {
        options.abortSignal.addEventListener('abort', () => {
          xhr.abort();
        });
      }

      xhr.open('POST', '/api/images/upload');
      const token = getStoredToken();
      if (token) {
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      }
      xhr.send(formData);
    });
  },

  async getImage(id: string): Promise<ImageItem> {
    return request<ImageItem>(`/images/${id}`);
  },

  async deleteImage(id: string): Promise<{ message: string }> {
    return request(`/images/${id}`, { method: 'DELETE' });
  },

  async batchDeleteImages(imageIds: string[]): Promise<{ message: string }> {
    return request('/images/batch-delete', {
      method: 'POST',
      body: JSON.stringify({ imageIds }),
    });
  },

  async reportImage(id: string, reason: string, details: string): Promise<{ message: string }> {
    return request(`/images/${id}/report`, {
      method: 'POST',
      body: JSON.stringify({ reason, details }),
    });
  },

  async getUserImages(params: {
    page?: number;
    limit?: number;
    search?: string;
    mimeType?: string;
    visibility?: ImageVisibility;
  } = {}): Promise<{ images: ImageItem[]; total: number; page: number; totalPages: number }> {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.mimeType) query.set('mimeType', params.mimeType);
    if (params.visibility) query.set('visibility', params.visibility);
    return request(`/images?${query.toString()}`);
  },

  async getPublicImages(limit = 12): Promise<ImageItem[]> {
    return request<ImageItem[]>(`/public-images?limit=${limit}`);
  },

  // Albums
  async getUserAlbums(): Promise<AlbumItem[]> {
    return request<AlbumItem[]>('/albums');
  },

  async createAlbum(title: string, description: string, visibility: ImageVisibility): Promise<AlbumItem> {
    return request<AlbumItem>('/albums', {
      method: 'POST',
      body: JSON.stringify({ title, description, visibility }),
    });
  },

  async getAlbum(id: string): Promise<AlbumItem> {
    return request<AlbumItem>(`/albums/${id}`);
  },

  async deleteAlbum(id: string): Promise<{ message: string }> {
    return request(`/albums/${id}`, { method: 'DELETE' });
  },

  async addImagesToAlbum(albumId: string, imageIds: string[]): Promise<{ message: string }> {
    return request(`/albums/${albumId}/add-images`, {
      method: 'POST',
      body: JSON.stringify({ imageIds }),
    });
  },

  async removeImageFromAlbum(albumId: string, imageId: string): Promise<{ message: string }> {
    return request(`/albums/${albumId}/remove-image`, {
      method: 'DELETE',
      body: JSON.stringify({ imageId }),
    });
  },

  // Admin
  async getAdminStats(): Promise<{
    totalUsers: number;
    totalImages: number;
    activeImages: number;
    todayUploads: number;
    totalSizeBytes: number;
    storageFormatted: string;
    pendingReports: number;
    bunnyConfig: {
      storageZone: string;
      storageRegion: string;
      cdnBaseUrl: string;
      hasPassword: boolean;
      hasApiKey: boolean;
      isConfigured: boolean;
    };
  }> {
    return request('/admin/stats');
  },

  async testBunny(): Promise<{
    configured: boolean;
    storageAccessible: boolean;
    cdnAccessible: boolean;
    details: string;
    latencyMs?: number;
  }> {
    return request('/admin/test-bunny', { method: 'POST' });
  },

  async getAdminUsers(): Promise<User[]> {
    return request<User[]>('/admin/users');
  },

  async updateUserRole(id: string, role: UserRole): Promise<{ message: string }> {
    return request(`/admin/users/${id}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    });
  },

  async updateUserStatus(id: string, status: UserStatus): Promise<{ message: string }> {
    return request(`/admin/users/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async getAdminImages(page = 1, limit = 20, search?: string): Promise<{ images: ImageItem[]; total: number; page: number }> {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) });
    if (search) query.set('search', search);
    return request(`/admin/images?${query.toString()}`);
  },

  async deleteAdminImage(id: string): Promise<{ message: string }> {
    return request(`/admin/images/${id}`, { method: 'DELETE' });
  },

  async getAdminReports(status?: ReportStatus): Promise<ReportItem[]> {
    const query = status ? `?status=${status}` : '';
    return request<ReportItem[]>(`/admin/reports${query}`);
  },

  async updateReportStatus(id: string, status: ReportStatus): Promise<{ message: string }> {
    return request(`/admin/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  async updateAdminSettings(settings: Partial<SitePublicSettings>): Promise<{ message: string; settings: any }> {
    return request('/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings),
    });
  },
};
