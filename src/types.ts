export type ViewMode = 'details' | 'grid' | 'tiles' | 'zones';

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

// Smart Zones / Dynamic Box View Types
export type ZoneColor = 'blue' | 'purple' | 'emerald' | 'amber' | 'rose' | 'indigo' | 'cyan' | 'slate';
export type ZoneWidth = 'col-1' | 'col-2' | 'col-3' | 'full';
export type ZoneDisplayStyle = 'compact' | 'icons' | 'details' | 'cards';

export type ZoneRuleType =
  | 'recent'       // Mới tải về / mới cập nhật gần đây
  | 'category'     // Phân loại: Tài liệu, Ảnh, Media, Nén/Bộ cài, Thư mục, Code
  | 'keyword'      // Theo tên / từ khóa (ví dụ: "unzip", "project", "final")
  | 'size'         // Theo dung lượng (>50MB, v.v.)
  | 'manual';      // Tự phân bộ kéo thả thủ công (như Playlist)

export interface ZoneRuleConfig {
  ruleType: ZoneRuleType;
  recentHours?: number;         // 24 (1 ngày), 72 (3 ngày), 168 (7 ngày)
  category?: 'documents' | 'images' | 'media' | 'archives' | 'folders' | 'code';
  keyword?: string;
  minSizeBytes?: number;
  manualItemPaths?: string[];   // Lưu đường dẫn các file đã được phân bộ vào hộp này
}

export interface SmartZone {
  id: string;
  name: string;
  color: ZoneColor;
  width: ZoneWidth;
  displayStyle: ZoneDisplayStyle;
  collapsed: boolean;
  rule: ZoneRuleConfig;
}

export interface UserPreferences {
  pinnedFolders: string[];
  smartZones: SmartZone[];
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
