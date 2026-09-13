import type React from 'react';
import { FileItem, DriveInfo, KnownFolder, UserPreferences } from '../types';

// Check if running inside native Tauri runtime
export function isTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

// In-memory directory handles cache for Web File System Access API
const dirHandleRegistry = new Map<string, FileSystemDirectoryHandle>();
let activeRootHandle: FileSystemDirectoryHandle | null = null;
let activeRootName = '';

// Global drag state tracking for bulletproof cross-component drag-and-drop
let globalDragItems: FileItem[] = [];

export function setGlobalDragItems(items: FileItem[]): void {
  globalDragItems = items;
}

export function getGlobalDragItems(): FileItem[] {
  return globalDragItems;
}

export function clearGlobalDragItems(): void {
  globalDragItems = [];
}

// =========================================================================
// VIRTUAL FILE SYSTEM (Seamless fallback for browser preview & web testing)
// =========================================================================
interface VirtualItem {
  id: string;
  name: string;
  path: string;
  parentPath: string;
  isDir: boolean;
  size: number;
  modifiedMs: number;
  extension?: string;
  isHidden?: boolean;
}

function normalizeVirtualPath(p: string): string {
  if (!p) return '';
  return p.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase() || '/';
}

function getInitialVirtualItems(): VirtualItem[] {
  const now = Date.now();
  const H = 3600 * 1000;

  return [
    // Known folders
    { id: 'C:\\Users\\Admin\\Downloads', name: 'Downloads', path: 'C:\\Users\\Admin\\Downloads', parentPath: 'C:\\Users\\Admin', isDir: true, size: 0, modifiedMs: now - 10 * H },
    { id: 'C:\\Users\\Admin\\Documents', name: 'Documents', path: 'C:\\Users\\Admin\\Documents', parentPath: 'C:\\Users\\Admin', isDir: true, size: 0, modifiedMs: now - 20 * H },
    { id: 'C:\\Users\\Admin\\Desktop', name: 'Desktop', path: 'C:\\Users\\Admin\\Desktop', parentPath: 'C:\\Users\\Admin', isDir: true, size: 0, modifiedMs: now - 30 * H },
    { id: 'C:\\Users\\Admin\\Pictures', name: 'Pictures', path: 'C:\\Users\\Admin\\Pictures', parentPath: 'C:\\Users\\Admin', isDir: true, size: 0, modifiedMs: now - 40 * H },
    { id: 'C:\\Users\\Admin\\Music', name: 'Music', path: 'C:\\Users\\Admin\\Music', parentPath: 'C:\\Users\\Admin', isDir: true, size: 0, modifiedMs: now - 50 * H },
    { id: 'C:\\Users\\Admin\\Videos', name: 'Videos', path: 'C:\\Users\\Admin\\Videos', parentPath: 'C:\\Users\\Admin', isDir: true, size: 0, modifiedMs: now - 60 * H },

    // Subfolders in Downloads for immediate drag-and-drop convenience
    {
      id: 'C:\\Users\\Admin\\Downloads\\Projects & Workspace',
      name: 'Projects & Workspace',
      path: 'C:\\Users\\Admin\\Downloads\\Projects & Workspace',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: true,
      size: 0,
      modifiedMs: now - 1 * H,
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Software & Tools',
      name: 'Software & Tools',
      path: 'C:\\Users\\Admin\\Downloads\\Software & Tools',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: true,
      size: 0,
      modifiedMs: now - 3 * H,
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Archived Media',
      name: 'Archived Media',
      path: 'C:\\Users\\Admin\\Downloads\\Archived Media',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: true,
      size: 0,
      modifiedMs: now - 5 * H,
    },

    // Subfolder in Documents
    {
      id: 'C:\\Users\\Admin\\Documents\\Reports 2026',
      name: 'Reports 2026',
      path: 'C:\\Users\\Admin\\Documents\\Reports 2026',
      parentPath: 'C:\\Users\\Admin\\Documents',
      isDir: true,
      size: 0,
      modifiedMs: now - 8 * H,
    },

    // Files in Downloads (Categorized nicely by Smart Zones!)
    {
      id: 'C:\\Users\\Admin\\Downloads\\Setup_Installer_v2.4.exe',
      name: 'Setup_Installer_v2.4.exe',
      path: 'C:\\Users\\Admin\\Downloads\\Setup_Installer_v2.4.exe',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 48234496,
      modifiedMs: now - 2 * H,
      extension: 'exe',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\project_architecture_assets.zip',
      name: 'project_architecture_assets.zip',
      path: 'C:\\Users\\Admin\\Downloads\\project_architecture_assets.zip',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 14892000,
      modifiedMs: now - 4 * H,
      extension: 'zip',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Bao_Cao_Tai_Chinh_Q3_2026.xlsx',
      name: 'Bao_Cao_Tai_Chinh_Q3_2026.xlsx',
      path: 'C:\\Users\\Admin\\Downloads\\Bao_Cao_Tai_Chinh_Q3_2026.xlsx',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 1245184,
      modifiedMs: now - 6 * H,
      extension: 'xlsx',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Hop_Dong_Dich_Vu_Cong_Nghe.docx',
      name: 'Hop_Dong_Dich_Vu_Cong_Nghe.docx',
      path: 'C:\\Users\\Admin\\Downloads\\Hop_Dong_Dich_Vu_Cong_Nghe.docx',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 540200,
      modifiedMs: now - 8 * H,
      extension: 'docx',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Tai_Lieu_Huong_Dan_Su_Dung.pdf',
      name: 'Tai_Lieu_Huong_Dan_Su_Dung.pdf',
      path: 'C:\\Users\\Admin\\Downloads\\Tai_Lieu_Huong_Dan_Su_Dung.pdf',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 3420110,
      modifiedMs: now - 12 * H,
      extension: 'pdf',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\system_wireframe_dashboard.png',
      name: 'system_wireframe_dashboard.png',
      path: 'C:\\Users\\Admin\\Downloads\\system_wireframe_dashboard.png',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 2150400,
      modifiedMs: now - 16 * H,
      extension: 'png',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Meeting_Notes_And_Action_Items.txt',
      name: 'Meeting_Notes_And_Action_Items.txt',
      path: 'C:\\Users\\Admin\\Downloads\\Meeting_Notes_And_Action_Items.txt',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 14200,
      modifiedMs: now - 20 * H,
      extension: 'txt',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Slide_Thuyet_Trinh_San_Pham.pptx',
      name: 'Slide_Thuyet_Trinh_San_Pham.pptx',
      path: 'C:\\Users\\Admin\\Downloads\\Slide_Thuyet_Trinh_San_Pham.pptx',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 8920400,
      modifiedMs: now - 23 * H,
      extension: 'pptx',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Backup_Database_Production.rar',
      name: 'Backup_Database_Production.rar',
      path: 'C:\\Users\\Admin\\Downloads\\Backup_Database_Production.rar',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 38190000,
      modifiedMs: now - 48 * H,
      extension: 'rar',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Video_Demo_Tinh_Nang.mp4',
      name: 'Video_Demo_Tinh_Nang.mp4',
      path: 'C:\\Users\\Admin\\Downloads\\Video_Demo_Tinh_Nang.mp4',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: false,
      size: 45600000,
      modifiedMs: now - 36 * H,
      extension: 'mp4',
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Thu_Muc_Du_An_Mau',
      name: 'Thu_Muc_Du_An_Mau',
      path: 'C:\\Users\\Admin\\Downloads\\Thu_Muc_Du_An_Mau',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: true,
      size: 0,
      modifiedMs: now - 50 * H,
    },
    {
      id: 'C:\\Users\\Admin\\Downloads\\Tep_Tin_Luu_Tru',
      name: 'Tep_Tin_Luu_Tru',
      path: 'C:\\Users\\Admin\\Downloads\\Tep_Tin_Luu_Tru',
      parentPath: 'C:\\Users\\Admin\\Downloads',
      isDir: true,
      size: 0,
      modifiedMs: now - 72 * H,
    },

    // Files in Documents
    {
      id: 'C:\\Users\\Admin\\Documents\\Hop_Dong_Lao_Dong.docx',
      name: 'Hop_Dong_Lao_Dong.docx',
      path: 'C:\\Users\\Admin\\Documents\\Hop_Dong_Lao_Dong.docx',
      parentPath: 'C:\\Users\\Admin\\Documents',
      isDir: false,
      size: 612000,
      modifiedMs: now - 24 * H,
      extension: 'docx',
    },
    {
      id: 'C:\\Users\\Admin\\Documents\\Bang_Luong_Nhan_Vien.xlsx',
      name: 'Bang_Luong_Nhan_Vien.xlsx',
      path: 'C:\\Users\\Admin\\Documents\\Bang_Luong_Nhan_Vien.xlsx',
      parentPath: 'C:\\Users\\Admin\\Documents',
      isDir: false,
      size: 1840000,
      modifiedMs: now - 48 * H,
      extension: 'xlsx',
    },
    {
      id: 'C:\\Users\\Admin\\Documents\\Ke_Hoach_Nam_2026.pdf',
      name: 'Ke_Hoach_Nam_2026.pdf',
      path: 'C:\\Users\\Admin\\Documents\\Ke_Hoach_Nam_2026.pdf',
      parentPath: 'C:\\Users\\Admin\\Documents',
      isDir: false,
      size: 4120000,
      modifiedMs: now - 72 * H,
      extension: 'pdf',
    },
    {
      id: 'C:\\Users\\Admin\\Documents\\Notes_Cuoc_Hop.txt',
      name: 'Notes_Cuoc_Hop.txt',
      path: 'C:\\Users\\Admin\\Documents\\Notes_Cuoc_Hop.txt',
      parentPath: 'C:\\Users\\Admin\\Documents',
      isDir: false,
      size: 24000,
      modifiedMs: now - 12 * H,
      extension: 'txt',
    },

    // Files in Pictures
    {
      id: 'C:\\Users\\Admin\\Pictures\\Hinh_Nen_Thien_Nhien_4K.jpg',
      name: 'Hinh_Nen_Thien_Nhien_4K.jpg',
      path: 'C:\\Users\\Admin\\Pictures\\Hinh_Nen_Thien_Nhien_4K.jpg',
      parentPath: 'C:\\Users\\Admin\\Pictures',
      isDir: false,
      size: 4520000,
      modifiedMs: now - 80 * H,
      extension: 'jpg',
    },
    {
      id: 'C:\\Users\\Admin\\Pictures\\Avatar_Dai_Dien.png',
      name: 'Avatar_Dai_Dien.png',
      path: 'C:\\Users\\Admin\\Pictures\\Avatar_Dai_Dien.png',
      parentPath: 'C:\\Users\\Admin\\Pictures',
      isDir: false,
      size: 312000,
      modifiedMs: now - 90 * H,
      extension: 'png',
    },

    // Files in Desktop
    {
      id: 'C:\\Users\\Admin\\Desktop\\Ghi_Chu_Cong_Viec.txt',
      name: 'Ghi_Chu_Cong_Viec.txt',
      path: 'C:\\Users\\Admin\\Desktop\\Ghi_Chu_Cong_Viec.txt',
      parentPath: 'C:\\Users\\Admin\\Desktop',
      isDir: false,
      size: 8200,
      modifiedMs: now - 5 * H,
      extension: 'txt',
    },
  ];
}

let virtualStore: VirtualItem[] | null = null;

function getVirtualStore(): VirtualItem[] {
  if (virtualStore) return virtualStore;
  try {
    const raw = localStorage.getItem('explorer_virtual_fs_items_v3');
    if (raw) {
      virtualStore = JSON.parse(raw);
      if (Array.isArray(virtualStore) && virtualStore.length > 0) {
        return virtualStore;
      }
    }
  } catch {
    // Ignore error
  }

  virtualStore = getInitialVirtualItems();
  saveVirtualStore();
  return virtualStore;
}

function saveVirtualStore(): void {
  if (!virtualStore) return;
  try {
    localStorage.setItem('explorer_virtual_fs_items_v3', JSON.stringify(virtualStore));
  } catch {
    // Ignore error
  }
}

// Load user preferences (stored separately from installation directory)
export async function loadUserPreferences(): Promise<UserPreferences> {
  const defaultPrefs: UserPreferences = {
    pinnedFolders: [],
    smartZones: [
      {
        id: 'zone_recent_downloads',
        name: 'Mới Tải Về & Cập Nhật (24h)',
        color: 'blue',
        width: 'col-1',
        displayStyle: 'compact',
        collapsed: false,
        rule: { ruleType: 'recent', recentHours: 24 },
      },
      {
        id: 'zone_archives_setup',
        name: 'File Nén & Giải Nén (Zip, Rar, Exe)',
        color: 'purple',
        width: 'col-1',
        displayStyle: 'icons',
        collapsed: false,
        rule: { ruleType: 'category', category: 'archives' },
      },
      {
        id: 'zone_documents',
        name: 'Tài Liệu & Báo Cáo',
        color: 'emerald',
        width: 'col-1',
        displayStyle: 'details',
        collapsed: false,
        rule: { ruleType: 'category', category: 'documents' },
      },
    ],
    theme: 'light',
    viewMode: 'details',
    showHiddenFiles: false,
    sortBy: 'name',
    sortOrder: 'asc',
  };

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const prefs = await invoke<UserPreferences>('get_user_settings');
      return {
        ...defaultPrefs,
        ...prefs,
        smartZones: Array.isArray(prefs.smartZones) && prefs.smartZones.length > 0 ? prefs.smartZones : defaultPrefs.smartZones,
        folderSmartZones: prefs.folderSmartZones || {},
      };
    } catch {
      // Fallback to localStorage if Tauri command unavailable
    }
  }

  try {
    const raw = localStorage.getItem('explorer_app_user_preferences');
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...defaultPrefs,
        ...parsed,
        smartZones: Array.isArray(parsed.smartZones) && parsed.smartZones.length > 0 ? parsed.smartZones : defaultPrefs.smartZones,
        folderSmartZones: parsed.folderSmartZones || {},
      };
    }
  } catch {
    // Ignore error
  }

  return defaultPrefs;
}

// Save user preferences (isolated in %APPDATA%\ExplorerApp on Windows)
export async function saveUserPreferences(prefs: UserPreferences): Promise<void> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      await invoke('save_user_settings', { preferences: prefs });
      return;
    } catch {
      // Fallback
    }
  }

  try {
    localStorage.setItem('explorer_app_user_preferences', JSON.stringify(prefs));
  } catch {
    // Ignore error
  }
}

// Get system drives
export async function getSystemDrives(): Promise<DriveInfo[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<DriveInfo[]>('get_drives');
    } catch {
      // Return empty if failed
    }
  }

  if (activeRootName) {
    return [
      {
        name: `${activeRootName} (Mounted)`,
        path: activeRootName,
        driveType: 'fixed',
      },
    ];
  }

  return [
    {
      name: 'Local Disk (C:)',
      path: 'C:\\',
      driveType: 'fixed',
      totalSpace: 512 * 1024 * 1024 * 1024,
      freeSpace: 248 * 1024 * 1024 * 1024,
    },
  ];
}

// Get standard Windows Known Folders
export async function getKnownFolders(): Promise<KnownFolder[]> {
  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<KnownFolder[]>('get_known_folders');
    } catch {
      // Fallback
    }
  }

  return [
    { id: 'downloads', name: 'Downloads', path: 'C:\\Users\\Admin\\Downloads' },
    { id: 'documents', name: 'Documents', path: 'C:\\Users\\Admin\\Documents' },
    { id: 'desktop', name: 'Desktop', path: 'C:\\Users\\Admin\\Desktop' },
    { id: 'pictures', name: 'Pictures', path: 'C:\\Users\\Admin\\Pictures' },
    { id: 'music', name: 'Music', path: 'C:\\Users\\Admin\\Music' },
    { id: 'videos', name: 'Videos', path: 'C:\\Users\\Admin\\Videos' },
  ];
}

// Open folder using browser native File System Access API
export async function promptOpenFolder(): Promise<{ path: string; name: string } | null> {
  const win = window as unknown as {
    showDirectoryPicker?: (options?: { mode?: string }) => Promise<FileSystemDirectoryHandle>;
  };

  if (typeof win.showDirectoryPicker !== 'function') {
    throw new Error('Your browser does not support the File System Access API. Please use Edge, Chrome, or run the native Windows desktop app.');
  }

  try {
    const handle = await win.showDirectoryPicker({
      mode: 'readwrite',
    });
    activeRootHandle = handle;
    activeRootName = handle.name;
    dirHandleRegistry.clear();
    dirHandleRegistry.set(handle.name, handle);

    return {
      path: handle.name,
      name: handle.name,
    };
  } catch (err: unknown) {
    if ((err as Error).name === 'AbortError') {
      return null;
    }
    throw err;
  }
}

// Read real directory items
export async function readDirectoryItems(
  currentPath: string,
  showHidden: boolean = false
): Promise<FileItem[]> {
  if (!currentPath) {
    return [];
  }

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      interface TauriFileItem {
        name: string;
        path: string;
        is_dir: boolean;
        size: number;
        modified_ms: number;
        extension?: string;
        is_hidden: boolean;
      }
      const raw = await invoke<TauriFileItem[]>('read_directory', {
        path: currentPath,
        showHidden,
      });

      return raw.map((item) => ({
        id: item.path,
        name: item.name,
        path: item.path,
        isDir: item.is_dir,
        size: item.size,
        modifiedMs: item.modified_ms,
        extension: item.extension,
        isHidden: item.is_hidden,
      }));
    } catch (err) {
      throw new Error(`Failed to read directory: ${err}`);
    }
  }

  // Web File System Access API
  if (!activeRootHandle) {
    const store = getVirtualStore();
    const normalizedTarget = normalizeVirtualPath(currentPath);
    return store
      .filter((it) => {
        if (!showHidden && it.isHidden) return false;
        return normalizeVirtualPath(it.parentPath) === normalizedTarget;
      })
      .map((it) => ({
        id: it.id,
        name: it.name,
        path: it.path,
        isDir: it.isDir,
        size: it.size,
        modifiedMs: it.modifiedMs,
        extension: it.extension,
        isHidden: !!it.isHidden,
      }));
  }

  let targetHandle: FileSystemDirectoryHandle | null = null;

  if (currentPath === activeRootName) {
    targetHandle = activeRootHandle;
  } else if (dirHandleRegistry.has(currentPath)) {
    targetHandle = dirHandleRegistry.get(currentPath)!;
  } else {
    // Resolve relative path from active root
    const segments = currentPath.replace(activeRootName, '').split('/').filter(Boolean);
    let current = activeRootHandle;
    for (const seg of segments) {
      current = await current.getDirectoryHandle(seg);
    }
    targetHandle = current;
    dirHandleRegistry.set(currentPath, targetHandle);
  }

  if (!targetHandle) {
    return [];
  }

  const items: FileItem[] = [];

  // @ts-expect-error - FileSystemDirectoryHandle async iterable
  for await (const [name, handle] of targetHandle.entries()) {
    const isHidden = name.startsWith('.');
    if (!showHidden && isHidden) {
      continue;
    }

    const itemPath = `${currentPath}/${name}`;
    const isDir = handle.kind === 'directory';

    if (isDir) {
      dirHandleRegistry.set(itemPath, handle as FileSystemDirectoryHandle);
      items.push({
        id: itemPath,
        name,
        path: itemPath,
        isDir: true,
        size: 0,
        modifiedMs: Date.now(),
        isHidden,
        handle,
      });
    } else {
      let size = 0;
      let modifiedMs = Date.now();
      try {
        const file = await (handle as FileSystemFileHandle).getFile();
        size = file.size;
        modifiedMs = file.lastModified;
      } catch {
        // Permission or lock
      }

      const dotIdx = name.lastIndexOf('.');
      const ext = dotIdx > 0 ? name.substring(dotIdx + 1).toLowerCase() : undefined;

      items.push({
        id: itemPath,
        name,
        path: itemPath,
        isDir: false,
        size,
        modifiedMs,
        extension: ext,
        isHidden,
        handle,
      });
    }
  }

  return items;
}

// Alias for readDirectoryItems
export const readDirectory = readDirectoryItems;

// Search directory for real files
export async function searchRealFiles(
  currentPath: string,
  query: string
): Promise<FileItem[]> {
  if (!query.trim() || !currentPath) {
    return [];
  }

  const queryLower = query.toLowerCase();

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      interface TauriFileItem {
        name: string;
        path: string;
        is_dir: boolean;
        size: number;
        modified_ms: number;
        extension?: string;
        is_hidden: boolean;
      }
      const raw = await invoke<TauriFileItem[]>('search_directory', {
        path: currentPath,
        query,
        maxResults: 200,
      });

      return raw.map((item) => ({
        id: item.path,
        name: item.name,
        path: item.path,
        isDir: item.is_dir,
        size: item.size,
        modifiedMs: item.modified_ms,
        extension: item.extension,
        isHidden: item.is_hidden,
      }));
    } catch {
      return [];
    }
  }

  // Web API recursion
  const allItems = await readDirectoryItems(currentPath, true);
  const matched = allItems.filter((i) => i.name.toLowerCase().includes(queryLower));
  return matched;
}

// Create real folder
export async function createRealFolder(parentPath: string, folderName: string): Promise<void> {
  if (!folderName.trim()) return;

  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('create_new_folder', {
      parentPath,
      name: folderName,
    });
    return;
  }

  if (!activeRootHandle) {
    const store = getVirtualStore();
    const isWin = parentPath.includes('\\');
    const sep = isWin ? '\\' : '/';
    const cleanParent = parentPath.replace(/[/\\]+$/, '');
    const newPath = `${cleanParent}${sep}${folderName}`;
    store.push({
      id: newPath,
      name: folderName,
      path: newPath,
      parentPath: cleanParent,
      isDir: true,
      size: 0,
      modifiedMs: Date.now(),
    });
    saveVirtualStore();
    return;
  }

  const parentHandle = dirHandleRegistry.get(parentPath) || activeRootHandle;
  if (!parentHandle) {
    throw new Error('Parent folder handle not accessible');
  }

  await parentHandle.getDirectoryHandle(folderName, { create: true });
}

// Rename real file or directory
export async function renameRealItem(oldPath: string, newPath: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('rename_file_or_dir', { oldPath, newPath });
    return;
  }

  if (!activeRootHandle) {
    const store = getVirtualStore();
    const normOld = normalizeVirtualPath(oldPath);
    const item = store.find((it) => normalizeVirtualPath(it.path) === normOld);
    if (item) {
      const newName = newPath.split(/[/\\]/).filter(Boolean).pop() || item.name;
      item.name = newName;
      item.path = newPath;
      item.id = newPath;
      if (!item.isDir) {
        const dotIdx = newName.lastIndexOf('.');
        item.extension = dotIdx > 0 ? newName.substring(dotIdx + 1).toLowerCase() : '';
      }
      item.modifiedMs = Date.now();

      if (item.isDir) {
        const sep = newPath.includes('\\') ? '\\' : '/';
        const children = store.filter((it) => {
          const childNorm = normalizeVirtualPath(it.path);
          return childNorm.startsWith(normOld + '/') || childNorm.startsWith(normOld + '\\');
        });
        for (const child of children) {
          const childNorm = normalizeVirtualPath(child.path);
          const rel = childNorm.substring(normOld.length).replace(/^[/\\]+/, '');
          const childNewPath = `${newPath}${sep}${rel.replace(/\//g, sep)}`;
          const childParentNorm = normalizeVirtualPath(child.parentPath);
          const relParent = childParentNorm.substring(normOld.length).replace(/^[/\\]+/, '');
          const childNewParent = relParent ? `${newPath}${sep}${relParent.replace(/\//g, sep)}` : newPath;
          child.path = childNewPath;
          child.id = childNewPath;
          child.parentPath = childNewParent;
        }
      }
      saveVirtualStore();
    }
  }
}

// Delete real file or directory
export async function deleteRealItem(path: string, itemOrIsDir: FileItem | boolean): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('delete_item', { path });
    return;
  }

  if (!activeRootHandle) {
    const store = getVirtualStore();
    const norm = normalizeVirtualPath(path);
    virtualStore = store.filter((it) => {
      const itNorm = normalizeVirtualPath(it.path);
      return itNorm !== norm && !itNorm.startsWith(norm + '/');
    });
    saveVirtualStore();
    return;
  }

  // Extract parent path and item name
  const isDir = typeof itemOrIsDir === 'boolean' ? itemOrIsDir : itemOrIsDir.isDir;
  const name = typeof itemOrIsDir === 'boolean' ? (path.split(/[/\\]/).filter(Boolean).pop() || '') : itemOrIsDir.name;
  const parentPath = path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
  const parentHandle = dirHandleRegistry.get(parentPath) || activeRootHandle;

  if (!parentHandle) {
    throw new Error('Parent folder handle not found for deletion');
  }

  await parentHandle.removeEntry(name, { recursive: isDir });
}

// Helper to get MIME type from file extension
export function getMimeType(ext: string): string {
  const cleanExt = (ext || '').toLowerCase().replace(/^\./, '');
  const map: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/typescript',
    json: 'application/json',
    zip: 'application/zip',
    rar: 'application/x-rar-compressed',
    '7z': 'application/x-7z-compressed',
    tar: 'application/x-tar',
    gz: 'application/gzip',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    gif: 'image/gif',
    bmp: 'image/bmp',
    ico: 'image/x-icon',
    mp4: 'video/mp4',
    webm: 'video/webm',
    mkv: 'video/x-matroska',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  };
  return map[cleanExt] || 'application/octet-stream';
}

async function copyWebDirRecursive(
  srcDir: FileSystemDirectoryHandle,
  destDir: FileSystemDirectoryHandle
): Promise<void> {
  // @ts-expect-error async iterator in browser File System Access API
  for await (const [name, entry] of srcDir.entries()) {
    if (entry.kind === 'file') {
      const file = await (entry as FileSystemFileHandle).getFile();
      const targetFile = await destDir.getFileHandle(name, { create: true });
      const writable = await (targetFile as unknown as { createWritable: () => Promise<{ write: (b: ArrayBuffer) => Promise<void>; close: () => Promise<void> }> }).createWritable();
      await writable.write(await file.arrayBuffer());
      await writable.close();
    } else if (entry.kind === 'directory') {
      const targetSub = await destDir.getDirectoryHandle(name, { create: true });
      await copyWebDirRecursive(entry as FileSystemDirectoryHandle, targetSub);
    }
  }
}

async function webEntryExists(handle: FileSystemDirectoryHandle, name: string): Promise<boolean> {
  try {
    await handle.getFileHandle(name);
    return true;
  } catch {
    try {
      await handle.getDirectoryHandle(name);
      return true;
    } catch {
      return false;
    }
  }
}

// Move or copy files across directories
export async function moveOrCopyRealItems(
  sourcePaths: string[],
  destinationDir: string,
  isCopy: boolean = false
): Promise<FileItem[]> {
  if (sourcePaths.length === 0 || !destinationDir) return [];

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      const res = await invoke<FileItem[]>('move_or_copy_items', {
        sourcePaths,
        destinationDir,
        isCopy,
      });
      return res || [];
    } catch (err: unknown) {
      console.warn('Tauri move_or_copy_items fallback:', err);
    }
  }

  // Fallback: Virtual Filesystem (or when activeRootHandle is not set)
  if (!activeRootHandle) {
    const store = getVirtualStore();
    const normDest = normalizeVirtualPath(destinationDir).toLowerCase();
    const isWin = destinationDir.includes('\\') || /^[a-zA-Z]:/.test(destinationDir);
    const sep = isWin ? '\\' : '/';
    const cleanDest = destinationDir.replace(/[/\\]+$/, '');
    const isDriveRoot = !cleanDest || cleanDest.endsWith(':');
    const effectiveParent = isDriveRoot ? (cleanDest ? `${cleanDest}\\` : '/') : cleanDest;
    const resultItems: FileItem[] = [];

    for (const srcPath of sourcePaths) {
      const normSrc = normalizeVirtualPath(srcPath).toLowerCase();
      let srcItem = store.find((it) => normalizeVirtualPath(it.path).toLowerCase() === normSrc);
      if (!srcItem) {
        srcItem = store.find((it) => it.id === srcPath || it.path === srcPath);
      }
      if (!srcItem) {
        const srcName = srcPath.split(/[/\\]/).filter(Boolean).pop();
        if (srcName) {
          srcItem = store.find((it) => it.name.toLowerCase() === srcName.toLowerCase());
        }
      }
      if (!srcItem) continue;

      const isSameFolder = normalizeVirtualPath(srcItem.parentPath).toLowerCase() === normDest;

      if (isCopy) {
        let targetName = srcItem.name;
        const dotIdx = srcItem.isDir ? -1 : srcItem.name.lastIndexOf('.');
        const stem = dotIdx > 0 ? srcItem.name.substring(0, dotIdx) : srcItem.name;
        const ext = dotIdx > 0 ? srcItem.name.substring(dotIdx) : '';

        if (isSameFolder) {
          let candidate = `${stem} - Copy${ext}`;
          let counter = 2;
          while (store.some((it) => normalizeVirtualPath(it.parentPath).toLowerCase() === normDest && it.name.toLowerCase() === candidate.toLowerCase())) {
            candidate = `${stem} - Copy (${counter})${ext}`;
            counter++;
          }
          targetName = candidate;
        } else {
          // If copying to another folder, check if a file with same name already exists
          let candidate = srcItem.name;
          let counter = 2;
          while (store.some((it) => normalizeVirtualPath(it.parentPath).toLowerCase() === normDest && it.name.toLowerCase() === candidate.toLowerCase())) {
            candidate = `${stem} - Copy (${counter})${ext}`;
            counter++;
          }
          targetName = candidate;
        }

        const newPath = isDriveRoot ? `${effectiveParent}${targetName}` : `${effectiveParent}${sep}${targetName}`;
        const newItem: VirtualItem = {
          id: newPath,
          name: targetName,
          path: newPath,
          parentPath: effectiveParent,
          isDir: srcItem.isDir,
          size: srcItem.size,
          modifiedMs: Date.now(),
          extension: srcItem.extension,
        };
        store.push(newItem);

        resultItems.push({
          id: newItem.id,
          name: newItem.name,
          path: newItem.path,
          isDir: newItem.isDir,
          size: newItem.size,
          modifiedMs: newItem.modifiedMs,
          extension: newItem.extension,
          isHidden: false,
        });

        if (srcItem.isDir) {
          const children = store.filter((it) => {
            const childNorm = normalizeVirtualPath(it.path).toLowerCase();
            return childNorm.startsWith(normSrc + '/') || childNorm.startsWith(normSrc + '\\');
          });
          for (const child of children) {
            const childNorm = normalizeVirtualPath(child.path).toLowerCase();
            const rel = childNorm.substring(normSrc.length).replace(/^[/\\]+/, '');
            const childNewPath = `${newPath}${sep}${rel.replace(/\//g, sep)}`;
            const childParentNorm = normalizeVirtualPath(child.parentPath).toLowerCase();
            const relParent = childParentNorm.substring(normSrc.length).replace(/^[/\\]+/, '');
            const childNewParent = relParent ? `${newPath}${sep}${relParent.replace(/\//g, sep)}` : newPath;
            store.push({
              ...child,
              id: childNewPath,
              path: childNewPath,
              parentPath: childNewParent,
              modifiedMs: Date.now(),
            });
          }
        }
      } else {
        // Cut / Move
        if (isSameFolder) {
          resultItems.push({
            id: srcItem.id,
            name: srcItem.name,
            path: srcItem.path,
            isDir: srcItem.isDir,
            size: srcItem.size,
            modifiedMs: srcItem.modifiedMs,
            extension: srcItem.extension,
            isHidden: !!srcItem.isHidden,
          });
          continue;
        }

        let targetName = srcItem.name;
        const dotIdx = srcItem.isDir ? -1 : srcItem.name.lastIndexOf('.');
        const stem = dotIdx > 0 ? srcItem.name.substring(0, dotIdx) : srcItem.name;
        const ext = dotIdx > 0 ? srcItem.name.substring(dotIdx) : '';
        let counter = 2;
        while (store.some((it) => it !== srcItem && normalizeVirtualPath(it.parentPath).toLowerCase() === normDest && it.name.toLowerCase() === targetName.toLowerCase())) {
          targetName = `${stem} (${counter})${ext}`;
          counter++;
        }

        const newPath = isDriveRoot ? `${effectiveParent}${targetName}` : `${effectiveParent}${sep}${targetName}`;
        srcItem.name = targetName;
        srcItem.path = newPath;
        srcItem.id = newPath;
        srcItem.parentPath = effectiveParent;
        srcItem.modifiedMs = Date.now();

        resultItems.push({
          id: srcItem.id,
          name: srcItem.name,
          path: srcItem.path,
          isDir: srcItem.isDir,
          size: srcItem.size,
          modifiedMs: srcItem.modifiedMs,
          extension: srcItem.extension,
          isHidden: !!srcItem.isHidden,
        });

        if (srcItem.isDir) {
          const children = store.filter((it) => {
            const childNorm = normalizeVirtualPath(it.path).toLowerCase();
            return childNorm.startsWith(normSrc + '/') || childNorm.startsWith(normSrc + '\\');
          });
          for (const child of children) {
            const childNorm = normalizeVirtualPath(child.path).toLowerCase();
            const rel = childNorm.substring(normSrc.length).replace(/^[/\\]+/, '');
            const childNewPath = `${newPath}${sep}${rel.replace(/\//g, sep)}`;
            const childParentNorm = normalizeVirtualPath(child.parentPath).toLowerCase();
            const relParent = childParentNorm.substring(normSrc.length).replace(/^[/\\]+/, '');
            const childNewParent = relParent ? `${newPath}${sep}${relParent.replace(/\//g, sep)}` : newPath;
            child.path = childNewPath;
            child.id = childNewPath;
            child.parentPath = childNewParent;
          }
        }
      }
    }

    saveVirtualStore();
    return resultItems;
  }

  // Web File System Access API
  try {
    const resolveHandle = async (p: string): Promise<FileSystemDirectoryHandle | null> => {
      if (dirHandleRegistry.has(p)) return dirHandleRegistry.get(p)!;
      if (!activeRootHandle) return null;
      const cleanRoot = activeRootName.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
      const cleanP = p.replace(/^[/\\]+/, '').replace(/[/\\]+$/, '');
      if (cleanP === cleanRoot || !cleanP) return activeRootHandle;

      let rel = cleanP;
      if (cleanP.startsWith(cleanRoot)) {
        rel = cleanP.substring(cleanRoot.length).replace(/^[/\\]+/, '');
      }
      const parts = rel.split(/[/\\]/).filter(Boolean);
      let cur = activeRootHandle;
      try {
        for (const part of parts) {
          cur = await cur.getDirectoryHandle(part);
        }
        dirHandleRegistry.set(p, cur);
        return cur;
      } catch {
        return activeRootHandle;
      }
    };

    const destHandle = (await resolveHandle(destinationDir)) || activeRootHandle;
    if (!destHandle) {
      throw new Error('Destination folder handle not accessible');
    }
    const resultItems: FileItem[] = [];

    for (const srcPath of sourcePaths) {
      const srcName = srcPath.split(/[/\\]/).filter(Boolean).pop() || '';
      const srcParentPath = srcPath.substring(0, Math.max(srcPath.lastIndexOf('/'), srcPath.lastIndexOf('\\')));
      const srcParentHandle = (await resolveHandle(srcParentPath)) || activeRootHandle;

      if (!srcParentHandle || !srcName) continue;

      let isDir = false;
      let fileHandle: FileSystemFileHandle | null = null;
      let dirHandle: FileSystemDirectoryHandle | null = null;

      try {
        fileHandle = await srcParentHandle.getFileHandle(srcName);
      } catch {
        try {
          dirHandle = await srcParentHandle.getDirectoryHandle(srcName);
          isDir = true;
        } catch {
          console.warn('Cannot find source item:', srcName);
          continue;
        }
      }

      const isSameFolder = normalizeVirtualPath(srcParentPath) === normalizeVirtualPath(destinationDir);

      let targetName = srcName;
      const dotIdx = isDir ? -1 : srcName.lastIndexOf('.');
      const stem = dotIdx > 0 ? srcName.substring(0, dotIdx) : srcName;
      const ext = dotIdx > 0 ? srcName.substring(dotIdx) : '';

      if (isCopy) {
        if (isSameFolder || (await webEntryExists(destHandle, targetName))) {
          let candidate = `${stem} - Copy${ext}`;
          let counter = 2;
          while (await webEntryExists(destHandle, candidate)) {
            candidate = `${stem} - Copy (${counter})${ext}`;
            counter++;
          }
          targetName = candidate;
        }
      } else {
        if (isSameFolder) {
          continue;
        }
        let candidate = targetName;
        let counter = 2;
        while (await webEntryExists(destHandle, candidate)) {
          candidate = `${stem} (${counter})${ext}`;
          counter++;
        }
        targetName = candidate;
      }

      try {
        if (isDir && dirHandle) {
          const newDirHandle = await destHandle.getDirectoryHandle(targetName, { create: true });
          await copyWebDirRecursive(dirHandle, newDirHandle);
          if (!isCopy) {
            await srcParentHandle.removeEntry(srcName, { recursive: true });
          }
          const newPath = `${destinationDir.replace(/[/\\]+$/, '')}/${targetName}`;
          dirHandleRegistry.set(newPath, newDirHandle);
          resultItems.push({
            id: newPath,
            name: targetName,
            path: newPath,
            isDir: true,
            size: 0,
            modifiedMs: Date.now(),
            extension: undefined,
            isHidden: false,
            handle: newDirHandle,
          });
        } else if (fileHandle) {
          const file = await fileHandle.getFile();
          const targetFileHandle = await destHandle.getFileHandle(targetName, { create: true });
          const writable = await (targetFileHandle as unknown as { createWritable: () => Promise<{ write: (b: ArrayBuffer) => Promise<void>; close: () => Promise<void> }> }).createWritable();
          await writable.write(await file.arrayBuffer());
          await writable.close();

          if (!isCopy) {
            await srcParentHandle.removeEntry(srcName);
          }

          const newPath = `${destinationDir.replace(/[/\\]+$/, '')}/${targetName}`;
          resultItems.push({
            id: newPath,
            name: targetName,
            path: newPath,
            isDir: false,
            size: file.size,
            modifiedMs: Date.now(),
            extension: ext ? ext.replace('.', '').toLowerCase() : undefined,
            isHidden: false,
            handle: targetFileHandle,
          });
        }
      } catch (innerErr) {
        console.warn('Could not copy/move Web FS handle:', innerErr);
      }
    }
    return resultItems;
  } catch (err) {
    console.warn('Web FS move/copy fallback error:', err);
    return [];
  }
}

// Read text file for preview
export async function readFileContent(item: FileItem): Promise<{ type: 'text' | 'image' | 'binary'; content: string }> {
  if (item.isDir) {
    throw new Error('Cannot preview folder as file');
  }

  if (item.handle && item.handle.kind === 'file') {
    const file = await (item.handle as FileSystemFileHandle).getFile();
    const isImage = file.type.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp|ico)$/i.test(item.name);

    if (isImage) {
      const url = URL.createObjectURL(file);
      return { type: 'image', content: url };
    }

    // Attempt text read
    if (file.size > 2 * 1024 * 1024) {
      return { type: 'text', content: `[File size is ${(file.size / 1024 / 1024).toFixed(2)} MB. Large file preview is limited for performance.]` };
    }

    try {
      const text = await file.text();
      return { type: 'text', content: text };
    } catch {
      return { type: 'binary', content: '[Binary file content cannot be displayed as plain text]' };
    }
  }

  return { type: 'text', content: `File path: ${item.path}\nSize: ${formatFileSize(item.size)}` };
}

// Helper: Format bytes
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Helper: Format modified date to Windows 11 style
export function formatWindowsDate(timestampMs: number): string {
  if (!timestampMs) return '';
  const date = new Date(timestampMs);
  return date.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Launch Command Prompt (cmd.exe) at folder
export async function launchTerminal(dirPath: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_in_terminal', { dirPath });
  } else {
    // In web preview, display guidance
    console.info(`[Native Action] CMD would open at: ${dirPath}`);
    alert(`Đã yêu cầu mở Command Prompt tại: ${dirPath} (Kích hoạt khi chạy native desktop app)`);
  }
}

// Launch PowerShell at folder
export async function launchPowerShell(dirPath: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_in_powershell', { dirPath });
  } else {
    console.info(`[Native Action] PowerShell would open at: ${dirPath}`);
    alert(`Đã yêu cầu mở PowerShell tại: ${dirPath} (Kích hoạt khi chạy native desktop app)`);
  }
}

// Extract archive (zip, rar, 7z, tar, gz)
export async function extractArchiveItem(archivePath: string, destFolder?: string): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string>('extract_archive', {
      archivePath,
      destinationFolder: destFolder || null,
    });
  } else {
    if (!activeRootHandle) {
      const store = getVirtualStore();
      const isWin = archivePath.includes('\\');
      const sep = isWin ? '\\' : '/';
      const lastSep = Math.max(archivePath.lastIndexOf('/'), archivePath.lastIndexOf('\\'));
      const parentDir = destFolder || (lastSep > 0 ? archivePath.substring(0, lastSep) : 'C:\\Users\\Admin\\Downloads');
      const archiveName = archivePath.split(/[/\\]/).filter(Boolean).pop() || 'extracted';
      const folderName = archiveName.replace(/\.(zip|rar|7z|tar|gz)$/i, '');
      const folderPath = `${parentDir.replace(/[/\\]+$/, '')}${sep}${folderName}`;

      // Create extracted folder
      if (!store.some((it) => normalizeVirtualPath(it.path) === normalizeVirtualPath(folderPath))) {
        store.push({
          id: folderPath,
          name: folderName,
          path: folderPath,
          parentPath: parentDir.replace(/[/\\]+$/, ''),
          isDir: true,
          size: 0,
          modifiedMs: Date.now(),
        });
      }

      // Add sample extracted contents
      const extractedFile1 = `${folderPath}${sep}Readme_Instructions.txt`;
      store.push({
        id: extractedFile1,
        name: 'Readme_Instructions.txt',
        path: extractedFile1,
        parentPath: folderPath,
        isDir: false,
        size: 2048,
        modifiedMs: Date.now(),
        extension: 'txt',
      });

      const extractedFile2 = `${folderPath}${sep}Extracted_Data.xlsx`;
      store.push({
        id: extractedFile2,
        name: 'Extracted_Data.xlsx',
        path: extractedFile2,
        parentPath: folderPath,
        isDir: false,
        size: 512000,
        modifiedMs: Date.now(),
        extension: 'xlsx',
      });

      saveVirtualStore();
      return folderPath;
    }
    alert(`Đã yêu cầu giải nén: ${archivePath} (Kích hoạt tự động qua tar/powershell trong native desktop app)`);
    return archivePath;
  }
}

// Open real application / executable / document using Windows shell
export async function openRealItem(itemPath: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_item', { path: itemPath });
  } else {
    console.info(`[Native Action] Opening: ${itemPath}`);
  }
}

// Open file or directory in Visual Studio Code
export async function openWithCode(targetPath: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('open_with_code', { path: targetPath });
  } else {
    console.info(`[Native Action] Open with Code: ${targetPath}`);
    alert(`Đã yêu cầu mở với Visual Studio Code: ${targetPath}`);
  }
}

// Run executable or script as Administrator
export async function runAsAdmin(targetPath: string): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('run_as_admin', { path: targetPath });
  } else {
    console.info(`[Native Action] Run as admin: ${targetPath}`);
    alert(`Đã yêu cầu Run as Administrator: ${targetPath}`);
  }
}

// Create new file with specific template or extension
export async function createNewTemplateFile(dirPath: string, fileName: string, content: string = ''): Promise<string> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    return await invoke<string>('create_template_file', {
      dirPath,
      fileName,
      content,
    });
  } else {
    if (!activeRootHandle) {
      const store = getVirtualStore();
      const isWin = dirPath.includes('\\');
      const sep = isWin ? '\\' : '/';
      const cleanDir = dirPath.replace(/[/\\]+$/, '');
      const newPath = `${cleanDir}${sep}${fileName}`;
      const dotIdx = fileName.lastIndexOf('.');
      const ext = dotIdx > 0 ? fileName.substring(dotIdx + 1).toLowerCase() : undefined;
      store.push({
        id: newPath,
        name: fileName,
        path: newPath,
        parentPath: cleanDir,
        isDir: false,
        size: content.length || 0,
        modifiedMs: Date.now(),
        extension: ext,
      });
      saveVirtualStore();
      return newPath;
    }

    const rootDirHandle = (window as unknown as { _currentDirectoryHandle?: FileSystemDirectoryHandle })._currentDirectoryHandle || activeRootHandle;
    if (rootDirHandle) {
      const fileHandle = await rootDirHandle.getFileHandle(fileName, { create: true });
      if (content && 'createWritable' in fileHandle) {
        const writable = await (fileHandle as unknown as { createWritable: () => Promise<{ write: (c: string) => Promise<void>; close: () => Promise<void> }> }).createWritable();
        await writable.write(content);
        await writable.close();
      }
    }
    return `${dirPath}/${fileName}`;
  }
}

// Configures dataTransfer with multiple OS & browser compatible formats (text/plain, text/uri-list, DownloadURL, application/json)
export function setupExternalFileDragData(e: React.DragEvent, itemsToDrag: FileItem[]): void {
  if (itemsToDrag.length === 0) return;

  const paths = itemsToDrag.map((i) => i.path);
  const primaryItem = itemsToDrag[0];

  // 1. Text plain: Raw paths separated by newlines (pasting into terminal, notes, Discord, Zalo text input)
  e.dataTransfer.setData('text/plain', paths.join('\n'));

  // 2. Application JSON: Clean array of paths for internal zones / folders
  e.dataTransfer.setData('application/json', JSON.stringify(paths));
  e.dataTransfer.setData('application/x-explorer-paths', JSON.stringify(paths));

  // 3. RFC 2483 URI List: file:/// URLs (recognized by Chrome tabs, Google Drive web, external drop targets)
  const uriList = itemsToDrag
    .map((item) => {
      let clean = item.path.replace(/\\/g, '/');
      if (!clean.startsWith('/')) clean = '/' + clean;
      return `file://${encodeURI(clean)}`;
    })
    .join('\r\n');
  e.dataTransfer.setData('text/uri-list', uriList);

  // 4. DownloadURL (Chromium format for dragging files out of the webview/browser into desktop, Google Drive or another window)
  if (!primaryItem.isDir) {
    const ext = primaryItem.extension || 'bin';
    const mime = getMimeType(ext);
    const downloadUrl = `${window.location.origin}/api/download?path=${encodeURIComponent(primaryItem.path)}`;
    try {
      e.dataTransfer.setData('DownloadURL', `${mime}:${primaryItem.name}:${downloadUrl}`);
    } catch {
      // Ignored if browser restricts DownloadURL
    }
  }

  e.dataTransfer.effectAllowed = 'copyMove';

  // 6. Custom clean drag badge
  try {
    const badge = document.createElement('div');
    badge.className =
      'fixed -left-[9999px] top-0 flex items-center gap-2 bg-neutral-900/95 text-white text-xs px-3 py-1.5 rounded-md shadow-xl border border-neutral-700 pointer-events-none z-[99999]';
    badge.innerHTML = `
      <span style="display:inline-block; font-size:12px;">📁</span>
      <span style="font-weight:500; color:#fff;">${
        itemsToDrag.length === 1 ? primaryItem.name : `${itemsToDrag.length} mục đã chọn`
      }</span>
    `;
    document.body.appendChild(badge);
    e.dataTransfer.setDragImage(badge, 15, 15);
    setTimeout(() => {
      if (document.body.contains(badge)) {
        document.body.removeChild(badge);
      }
    }, 500);
  } catch {
    // Ignored
  }
}

// Check whether a target path is a directory or a file
export async function checkIsDirectory(targetPath: string): Promise<boolean> {
  if (!targetPath) return true;

  if (isTauri()) {
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return await invoke<boolean>('is_directory', { path: targetPath });
    } catch {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        await invoke('read_directory', { path: targetPath, showHidden: true });
        return true;
      } catch {
        return false;
      }
    }
  }

  // Web Virtual / Handle fallback
  const store = getVirtualStore();
  const norm = normalizeVirtualPath(targetPath);
  const found = store.find((it) => normalizeVirtualPath(it.path) === norm);
  if (found) return found.isDir;
  if (dirHandleRegistry.has(targetPath)) return true;

  // Heuristic based on file extension
  const fileName = targetPath.split(/[/\\]/).filter(Boolean).pop() || '';
  const dotIdx = fileName.lastIndexOf('.');
  if (dotIdx > 0 && dotIdx < fileName.length - 1) {
    return false;
  }
  return true;
}
