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

export type SpaceColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate';
export type SpaceIcon = 'sparkles' | 'folder' | 'briefcase' | 'star' | 'bookmark' | 'layers' | 'palette' | 'code' | 'zap' | 'box';

export interface CustomSpaceItem {
  id: string;
  name: string;
  path: string;
  isDir: boolean;
  size: number;
  modifiedMs: number;
  extension?: string;
  addedAt: number;
  note?: string;
  tag?: string;
  handle?: FileSystemHandle;
}

export interface CustomSpace {
  id: string;
  name: string;
  color: SpaceColor;
  icon: SpaceIcon;
  description?: string;
  createdAt: number;
  items: CustomSpaceItem[];
}

export interface UserPreferences {
  pinnedFolders: string[];
  customSpaces: CustomSpace[];
  theme: 'system' | 'dark' | 'light';
  viewMode: ViewMode;
  showHiddenFiles: boolean;
  sortBy: SortField;
  sortOrder: SortOrder;
  lastVisitedPath?: string;
  activeSpaceId?: string | null;
}

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem | null;
  isOpen: boolean;
}
