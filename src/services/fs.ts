import { FileItem, DriveInfo, KnownFolder, UserPreferences } from '../types';

// Check if running inside native Tauri runtime
export function isTauri(): boolean {
  return typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);
}

// In-memory directory handles cache for Web File System Access API
const dirHandleRegistry = new Map<string, FileSystemDirectoryHandle>();
let activeRootHandle: FileSystemDirectoryHandle | null = null;
let activeRootName = '';

// Load user preferences (stored separately from installation directory)
export async function loadUserPreferences(): Promise<UserPreferences> {
  const defaultPrefs: UserPreferences = {
    pinnedFolders: [],
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
      return { ...defaultPrefs, ...prefs };
    } catch {
      // Fallback to localStorage if Tauri command unavailable
    }
  }

  try {
    const raw = localStorage.getItem('explorer_app_user_preferences');
    if (raw) {
      return { ...defaultPrefs, ...JSON.parse(raw) };
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

  return [];
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

  return [];
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
    return [];
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

  const parentHandle = dirHandleRegistry.get(parentPath) || activeRootHandle;
  if (!parentHandle) {
    throw new Error('Parent folder handle not accessible');
  }

  await parentHandle.getDirectoryHandle(folderName, { create: true });
}

// Delete real file or directory
export async function deleteRealItem(path: string, item: FileItem): Promise<void> {
  if (isTauri()) {
    const { invoke } = await import('@tauri-apps/api/core');
    await invoke('delete_item', { path });
    return;
  }

  // Extract parent path and item name
  const parentPath = path.substring(0, path.lastIndexOf('/'));
  const parentHandle = dirHandleRegistry.get(parentPath) || activeRootHandle;

  if (!parentHandle) {
    throw new Error('Parent folder handle not found for deletion');
  }

  await parentHandle.removeEntry(item.name, { recursive: item.isDir });
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
