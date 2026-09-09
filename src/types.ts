export type ViewMode = 'details' | 'grid' | 'tiles' | 'list';

export type SortField = 'name' | 'modified' | 'type' | 'size';
export type SortOrder = 'asc' | 'desc';

export interface FileItem {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedMs: number;
  extension?: string;
  isHidden: boolean;
  handle?: FileSystemHandle; // For Web File System Access API
}

export interface DriveInfo {
  name: string;
  path: string;
  driveType: string;
  totalSpace?: number;
  freeSpace?: number;
}

export interface KnownFolder {
  id: string;
  name: string;
  path: string;
  iconName?: string;
}

export interface UserPreferences {
  pinnedFolders: string[];
  theme: 'system' | 'dark' | 'light';
  viewMode: ViewMode;
  showHiddenFiles: boolean;
  sortBy: SortField;
  sortOrder: SortOrder;
  lastVisitedPath?: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem | null;
  isOpen: boolean;
}
