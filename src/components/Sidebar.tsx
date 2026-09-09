import React from 'react';
import {
  HardDrive,
  Folder,
  Pin,
  PinOff,
  FolderInput,
  Monitor,
  FileText,
  Download,
  Image,
  Music,
  Video,
} from 'lucide-react';
import { DriveInfo, KnownFolder } from '../types';

interface SidebarProps {
  currentPath: string;
  pinnedFolders: string[];
  drives: DriveInfo[];
  knownFolders: KnownFolder[];
  onNavigateToPath: (path: string) => void;
  onUnpinFolder: (path: string) => void;
  onOpenFolderPicker: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  pinnedFolders,
  drives,
  knownFolders,
  onNavigateToPath,
  onUnpinFolder,
  onOpenFolderPicker,
}) => {
  const getKnownFolderIcon = (id: string) => {
    switch (id) {
      case 'desktop':
        return <Monitor className="w-4 h-4 text-blue-500" />;
      case 'documents':
        return <FileText className="w-4 h-4 text-amber-500" />;
      case 'downloads':
        return <Download className="w-4 h-4 text-emerald-500" />;
      case 'pictures':
        return <Image className="w-4 h-4 text-purple-500" />;
      case 'music':
        return <Music className="w-4 h-4 text-rose-500" />;
      case 'videos':
        return <Video className="w-4 h-4 text-indigo-500" />;
      default:
        return <Folder className="w-4 h-4 text-amber-500" />;
    }
  };

  return (
    <aside
      id="explorer-sidebar"
      className="w-60 bg-neutral-100/70 border-r border-neutral-200 flex flex-col justify-between select-none text-xs text-neutral-700 shrink-0"
    >
      <div className="overflow-y-auto p-2 space-y-4">
        {/* 1. PINNED / QUICK ACCESS */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider flex items-center gap-1.5">
            <Pin className="w-3 h-3 text-neutral-400" />
            <span>Truy Cập Nhanh</span>
          </div>

          <div className="mt-1 space-y-0.5">
            {pinnedFolders.length === 0 ? (
              <div className="px-2 py-1.5 text-[11px] text-neutral-400 italic">
                Chưa có thư mục ghim
              </div>
            ) : (
              pinnedFolders.map((path) => {
                const name = path.split(/[/\\]/).filter(Boolean).pop() || path;
                const isSelected = currentPath === path;
                return (
                  <div
                    key={path}
                    onClick={() => onNavigateToPath(path)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-blue-100/80 text-blue-900 font-medium'
                        : 'hover:bg-neutral-200/60 text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                      <Folder className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" />
                      <span className="truncate">{name}</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpinFolder(path);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-neutral-300 rounded text-neutral-500"
                      title="Bỏ ghim"
                    >
                      <PinOff className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })
            )}
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
              return (
                <div
                  key={folder.id}
                  onClick={() => onNavigateToPath(folder.path)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
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
              return (
                <div
                  key={drive.path}
                  onClick={() => onNavigateToPath(drive.path)}
                  className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-100/80 text-blue-900 font-medium'
                      : 'hover:bg-neutral-200/60 text-neutral-800'
                  }`}
                >
                  <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
                  <div className="min-w-0 flex-1 truncate">
                    <span className="truncate font-medium">{drive.name}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. BOTTOM ACTION */}
      <div className="p-2 border-t border-neutral-200 bg-neutral-100/90">
        <button
          id="btn-sidebar-open-folder"
          onClick={onOpenFolderPicker}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-neutral-200/80 border border-neutral-300 rounded-lg text-neutral-800 text-xs font-medium transition-colors shadow-2xs"
        >
          <FolderInput className="w-4 h-4 text-blue-600" />
          <span>Mở Thư Mục Trên Máy</span>
        </button>
      </div>
    </aside>
  );
};
