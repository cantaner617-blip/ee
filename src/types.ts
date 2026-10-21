export type UserRole = 'user' | 'admin';
export type UserStatus = 'active' | 'banned';
export type ImageVisibility = 'public' | 'unlisted' | 'private';
export type ImageStatus = 'active' | 'deleted';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  createdAt: string;
}

export interface ShareLinks {
  viewUrl: string;
  directCdnUrl: string;
  htmlEmbed: string;
  markdownEmbed: string;
  bbCodeEmbed: string;
}

export interface ImageItem {
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
  links: ShareLinks;
  canDelete?: boolean;
  isBunny?: boolean;
}

export interface AlbumItem {
  id: string;
  ownerId: string;
  title: string;
  description: string;
  coverImageId: string | null;
  visibility: ImageVisibility;
  createdAt: string;
  images?: ImageItem[];
  isOwner?: boolean;
}

export interface SitePublicSettings {
  siteName: string;
  siteDescription: string;
  maxFileSize: number;
  allowedFormats: string[];
  allowGuestUpload: boolean;
  allowRegistration: boolean;
  maintenanceMode: boolean;
  defaultVisibility: ImageVisibility;
  storageStatus: {
    isBunnyConfigured: boolean;
    region: string;
    hasCdnUrl: boolean;
  };
}

export interface ReportItem {
  id: string;
  imageId: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
}

export interface UploadQueueItem {
  id: string;
  file: File;
  previewUrl: string;
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  errorMessage?: string;
  result?: ImageItem;
  abortController?: AbortController;
}
