import React, { useState, useEffect } from 'react';
import {
  HardDrive,
  Folder,
  Pin,
  PinOff,
  FolderInput,
  FolderOpen,
  Monitor,
  FileText,
  Download,
  Image as ImageIcon,
  Music,
  Video,
  Plus,
  Archive,
  File,
  Code2,
} from 'lucide-react';
import { DriveInfo, KnownFolder } from '../types';
import {
  getGlobalDragItems,
  clearGlobalDragItems,
  checkIsDirectory,
  openRealItem,
} from '../services/fs';

interface SidebarProps {
  currentPath: string;
  pinnedFolders: string[];
  drives: DriveInfo[];
  knownFolders: KnownFolder[];
  onNavigateToPath: (path: string) => void;
  onOpenFile?: (path: string) => void;
  onLocateItem?: (path: string) => void;
  onPinFolder?: (path: string) => void;
  onUnpinFolder: (path: string) => void;
  onOpenFolderPicker: () => void;
  onMoveItemsToFolder?: (sourcePaths: string[], targetFolderPath: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  pinnedFolders,
  drives,
  knownFolders,
  onNavigateToPath,
  onOpenFile,
  onLocateItem,
  onPinFolder,
  onUnpinFolder,
  onOpenFolderPicker,
  onMoveItemsToFolder,
}) => {
  const [dragOverPath, setDragOverPath] = useState<string | null>(null);
  const [isQuickAccessDragOver, setIsQuickAccessDragOver] = useState(false);
  const [pathTypeMap, setPathTypeMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let isMounted = true;
    pinnedFolders.forEach(async (p) => {
      if (pathTypeMap[p] === undefined) {
        const isDir = await checkIsDirectory(p);
        if (isMounted) {
          setPathTypeMap((prev) => ({ ...prev, [p]: isDir }));
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [pinnedFolders]);

  const getKnownFolderIcon = (id: string) => {
    switch (id) {
      case 'desktop':
        return <Monitor className="w-4 h-4 text-blue-500" />;
      case 'documents':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'downloads':
        return <Download className="w-4 h-4 text-emerald-500" />;
      case 'pictures':
        return <ImageIcon className="w-4 h-4 text-purple-500" />;
      case 'music':
        return <Music className="w-4 h-4 text-rose-500" />;
      case 'videos':
        return <Video className="w-4 h-4 text-indigo-500" />;
      default:
        return <Folder className="w-4 h-4 text-amber-500" />;
    }
  };

  const getPinnedItemIcon = (path: string, isDir: boolean) => {
    if (isDir) {
      return <Folder className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" />;
    }
    const dotIdx = path.lastIndexOf('.');
    const ext = dotIdx > 0 ? path.substring(dotIdx + 1).toLowerCase() : '';
    if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico'].includes(ext)) {
      return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
    }
    if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
      return <Video className="w-4 h-4 text-purple-500 shrink-0" />;
    }
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
      return <Music className="w-4 h-4 text-pink-500 shrink-0" />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <Archive className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'html', 'css', 'rs', 'cpp'].includes(ext)) {
      return <Code2 className="w-4 h-4 text-cyan-600 shrink-0" />;
    }
    if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'xlsx', 'pptx'].includes(ext)) {
      return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
    }
    return <File className="w-4 h-4 text-neutral-500 shrink-0" />;
  };

  const extractPaths = (e: React.DragEvent): string[] => {
    try {
      const json = e.dataTransfer.getData('application/json');
      if (json) {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    const text = e.dataTransfer.getData('text/plain');
    if (text) {
      try {
        const parsed = JSON.parse(text);
        if (Array.isArray(parsed)) return parsed;
      } catch {
        return text.split('\n').filter(Boolean);
      }
    }
    return [];
  };

  const handleDropOnTargetFolder = (e: React.DragEvent, targetPath: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverPath(null);

    // 1. Check synchronous internal drag items first
    const globalItems = getGlobalDragItems();
    if (globalItems.length > 0 && onMoveItemsToFolder) {
      const valid = globalItems.map((i) => i.path).filter((p) => p !== targetPath);
      clearGlobalDragItems();
      if (valid.length > 0) {
        onMoveItemsToFolder(valid, targetPath);
        return;
      }
    }

    // 2. Fallback to payload extraction
    const paths = extractPaths(e);
    if (paths.length > 0 && onMoveItemsToFolder) {
      const valid = paths.filter((p) => p !== targetPath);
      if (valid.length > 0) {
        onMoveItemsToFolder(valid, targetPath);
      }
    }
  };

  const handleDropOnQuickAccess = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsQuickAccessDragOver(false);

    // 1. Check synchronous internal drag items first (supports both files and folders!)
    const globalItems = getGlobalDragItems();
    if (globalItems.length > 0 && onPinFolder) {
      globalItems.forEach((i) => {
        setPathTypeMap((prev) => ({ ...prev, [i.path]: i.isDir }));
        onPinFolder(i.path);
      });
      clearGlobalDragItems();
      return;
    }

    // 2. Fallback to payload extraction
    const paths = extractPaths(e);
    if (paths.length > 0 && onPinFolder) {
      paths.forEach(async (p) => {
        const isDir = await checkIsDirectory(p);
        setPathTypeMap((prev) => ({ ...prev, [p]: isDir }));
        onPinFolder(p);
      });
    }
  };

  const isCurrentPinned = currentPath && pinnedFolders.includes(currentPath);

  return (
    <aside
      id="explorer-sidebar"
      className="w-60 bg-neutral-100/70 border-r border-neutral-200 flex flex-col justify-between select-none text-xs text-neutral-700 shrink-0"
    >
      <div className="overflow-y-auto p-2 space-y-4">
        {/* 1. PINNED / QUICK ACCESS */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            if (!isQuickAccessDragOver) setIsQuickAccessDragOver(true);
          }}
          onDragLeave={(e) => {
            if (e.currentTarget.contains(e.relatedTarget as Node)) return;
            setIsQuickAccessDragOver(false);
          }}
          onDrop={handleDropOnQuickAccess}
          className={`rounded-lg transition-colors p-1.5 ${
            isQuickAccessDragOver ? 'bg-amber-100/80 ring-2 ring-amber-400' : 'bg-transparent'
          }`}
        >
          <div className="px-1 py-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Pin className="w-3 h-3 text-amber-500" />
              <span>Truy Cập Nhanh</span>
            </div>

            {currentPath && onPinFolder && (
              <button
                onClick={() => {
                  if (isCurrentPinned) {
                    onUnpinFolder(currentPath);
                  } else {
                    onPinFolder(currentPath);
                  }
                }}
                className={`p-1 rounded transition-colors ${
                  isCurrentPinned
                    ? 'text-amber-600 hover:bg-amber-100'
                    : 'text-neutral-400 hover:text-neutral-700 hover:bg-neutral-200'
                }`}
                title={isCurrentPinned ? 'Bỏ ghim thư mục này' : 'Ghim thư mục hiện tại vào Truy cập nhanh'}
              >
                {isCurrentPinned ? <PinOff className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
              </button>
            )}
          </div>

          <div className="mt-1 space-y-0.5">
            {pinnedFolders.map((path) => {
              const name = path.split(/[/\\]/).filter(Boolean).pop() || path;
              const isSelected = currentPath === path;
              const isDragOver = dragOverPath === path;
              const isDir =
                pathTypeMap[path] !== undefined
                  ? pathTypeMap[path]
                  : !(/\.[a-zA-Z0-9]{1,8}$/.test(name));

              const handleItemClick = () => {
                if (isDir) {
                  onNavigateToPath(path);
                } else {
                  if (onOpenFile) {
                    onOpenFile(path);
                  } else {
                    openRealItem(path);
                  }
                }
              };

              const handleLocate = (e: React.MouseEvent) => {
                e.stopPropagation();
                if (onLocateItem) {
                  onLocateItem(path);
                } else {
                  const parent = path.substring(0, Math.max(path.lastIndexOf('/'), path.lastIndexOf('\\')));
                  if (parent) onNavigateToPath(parent);
                }
              };

              return (
                <div
                  key={path}
                  onClick={handleItemClick}
                  onDoubleClick={handleItemClick}
                  onDragOver={(e) => {
                    // Only allow dropping files into folders, not into files!
                    if (isDir) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      if (dragOverPath !== path) setDragOverPath(path);
                    }
                  }}
                  onDragLeave={() => {
                    if (dragOverPath === path) setDragOverPath(null);
                  }}
                  onDrop={(e) => {
                    if (isDir) {
                      handleDropOnTargetFolder(e, path);
                    }
                  }}
                  className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isDragOver
                      ? 'bg-blue-200 text-blue-900 ring-2 ring-blue-500 font-semibold'
                      : isSelected
                      ? 'bg-blue-100/80 text-blue-900 font-medium'
                      : 'hover:bg-neutral-200/60 text-neutral-800'
                  }`}
                  title={
                    isDir
                      ? `Thư mục: ${path} (Click để mở)`
                      : `Tệp: ${path} (Click để mở tệp)`
                  }
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {getPinnedItemIcon(path, isDir)}
                    <span className="truncate">{name}</span>
                    {!isDir && (
                      <span className="text-[9px] text-neutral-400 bg-neutral-200/70 px-1 py-0.2 rounded shrink-0">
                        Tệp
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isDir && (
                      <button
                        onClick={handleLocate}
                        className="p-1 hover:bg-neutral-300 rounded text-neutral-500 hover:text-neutral-800"
                        title="Mở thư mục chứa tệp này"
                      >
                        <FolderOpen className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpinFolder(path);
                      }}
                      className="p-1 hover:bg-neutral-300 rounded text-neutral-500 hover:text-rose-600"
                      title="Bỏ ghim khỏi Truy cập nhanh"
                    >
                      <PinOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dedicated drop target banner to pin any dragged folder or file */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              e.dataTransfer.dropEffect = 'copy';
              if (!isQuickAccessDragOver) setIsQuickAccessDragOver(true);
            }}
            onDrop={handleDropOnQuickAccess}
            className={`mt-1.5 px-2 py-1.5 rounded-lg border border-dashed transition-all flex items-center justify-center gap-1.5 text-center select-none ${
              isQuickAccessDragOver
                ? 'border-amber-500 bg-amber-100 text-amber-900 font-medium ring-1 ring-amber-400'
                : 'border-neutral-300/80 bg-white/40 hover:bg-white/70 text-neutral-500'
            }`}
          >
            <Pin className="w-3 h-3 text-amber-500 shrink-0" />
            <span className="text-[10.5px]">
              {isQuickAccessDragOver ? 'Thả để ghim vào Truy Cập Nhanh' : 'Kéo thả thư mục hoặc tệp vào đây'}
            </span>
          </div>
        </div>

        {/* 2. KNOWN FOLDERS */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            Thư Mục Thường Dùng
          </div>
          <div className="mt-1 space-y-0.5">
            {knownFolders.map((folder) => {
              const isSelected = currentPath === folder.path;
              const isDragOver = dragOverPath === folder.path;

              return (
                <div
                  key={folder.id}
                  onClick={() => onNavigateToPath(folder.path)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverPath(folder.path);
                  }}
                  onDragLeave={() => {
                    if (dragOverPath === folder.path) setDragOverPath(null);
                  }}
                  onDrop={(e) => handleDropOnTargetFolder(e, folder.path)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isDragOver
                      ? 'bg-blue-200 text-blue-900 ring-2 ring-blue-500 font-semibold'
                      : isSelected
                      ? 'bg-blue-100/80 text-blue-900 font-medium'
                      : 'hover:bg-neutral-200/60 text-neutral-800'
                  }`}
                >
                  {getKnownFolderIcon(folder.id)}
                  <span className="truncate">{folder.name}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 3. THIS PC / DRIVES */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center justify-between">
            <span>Máy Tính Này (This PC)</span>
          </div>

          <div className="mt-1 space-y-0.5">
            {drives.map((drive) => {
              const isSelected = currentPath === drive.path;
              const isDragOver = dragOverPath === drive.path;

              return (
                <div
                  key={drive.path}
                  onClick={() => onNavigateToPath(drive.path)}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverPath(drive.path);
                  }}
                  onDragLeave={() => {
                    if (dragOverPath === drive.path) setDragOverPath(null);
                  }}
                  onDrop={(e) => handleDropOnTargetFolder(e, drive.path)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isDragOver
                      ? 'bg-blue-200 text-blue-900 ring-2 ring-blue-500 font-semibold'
                      : isSelected
                      ? 'bg-blue-100/80 text-blue-900 font-medium'
                      : 'hover:bg-neutral-200/60 text-neutral-800'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-neutral-500" />
                  <span className="truncate">
                    {drive.name} ({drive.path})
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* FOOTER ACTION */}
      <div className="p-2 border-t border-neutral-200 bg-neutral-100">
        <button
          onClick={onOpenFolderPicker}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg shadow-2xs font-medium transition-colors cursor-pointer"
        >
          <FolderInput className="w-4 h-4 text-blue-600" />
          <span>Mở thư mục khác</span>
        </button>
      </div>
    </aside>
  );
};
