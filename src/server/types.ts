export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'banned';
export type ImageVisibility = 'public' | 'unlisted' | 'private';
export type ImageStatus = 'active' | 'deleted';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface UserPublicProfile {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface ImageRecord {
  id: string;
  ownerId: string | null;
  originalName: string;
  storagePath: string;
  cdnUrl: string;
  mimeType: string;
  extension: string;
  sizeBytes: number;
  width: number;
  height: number;
  visibility: ImageVisibility;
  deleteAt: string | null;
  status: ImageStatus;
  createdAt: string;
}

export interface AlbumRecord {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  coverImageId: string | null;
  visibility: ImageVisibility;
  createdAt: string;
}

export interface AlbumImageRecord {
  albumId: string;
  imageId: string;
  sortOrder: number;
}

export interface SiteSettings {
  maxFileSize: number; // in bytes, default 10MB (10485760)
  allowedFormats: string[]; // ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  allowGuestUpload: boolean;
  allowRegistration: boolean;
  maintenanceMode: boolean;
  defaultVisibility: ImageVisibility;
  siteName: string;
  siteDescription: string;
}

export interface ReportRecord {
  id: string;
  imageId: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
}

export interface BunnyConfig {
  storageZone: string;
  storagePassword: string;
  storageRegion: string;
  cdnBaseUrl: string;
  apiKey?: string;
}
