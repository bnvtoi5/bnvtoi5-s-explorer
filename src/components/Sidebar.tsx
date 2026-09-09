import React, { useState } from 'react';
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
  Image,
  Music,
  Video,
  Plus,
  Sparkles,
  Briefcase,
  Star,
  Bookmark,
  Layers,
  Palette,
  Code,
  Zap,
  Box,
  MoreHorizontal,
  Trash2,
  Settings2,
} from 'lucide-react';
import { DriveInfo, KnownFolder, CustomSpace, FileItem } from '../types';

interface SidebarProps {
  currentPath: string;
  pinnedFolders: string[];
  drives: DriveInfo[];
  knownFolders: KnownFolder[];
  customSpaces: CustomSpace[];
  activeSpaceId: string | null;
  onNavigateToPath: (path: string) => void;
  onSelectSpace: (spaceId: string) => void;
  onCreateSpace: () => void;
  onEditSpace: (space: CustomSpace) => void;
  onDeleteSpace: (spaceId: string) => void;
  onUnpinFolder: (path: string) => void;
  onOpenFolderPicker: () => void;
  onDropItemsIntoSpace?: (spaceId: string, items: FileItem[]) => void;
}

const COLOR_DOTS: Record<string, string> = {
  blue: 'bg-blue-500',
  purple: 'bg-purple-500',
  emerald: 'bg-emerald-500',
  amber: 'bg-amber-500',
  rose: 'bg-rose-500',
  indigo: 'bg-indigo-500',
  cyan: 'bg-cyan-500',
  slate: 'bg-slate-500',
};

export const Sidebar: React.FC<SidebarProps> = ({
  currentPath,
  pinnedFolders,
  drives,
  knownFolders,
  customSpaces,
  activeSpaceId,
  onNavigateToPath,
  onSelectSpace,
  onCreateSpace,
  onEditSpace,
  onDeleteSpace,
  onUnpinFolder,
  onOpenFolderPicker,
}) => {
  const [activeSpaceMenuId, setActiveSpaceMenuId] = useState<string | null>(null);

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

  const getSpaceIcon = (iconName: string) => {
    switch (iconName) {
      case 'briefcase': return <Briefcase className="w-3.5 h-3.5" />;
      case 'folder': return <Folder className="w-3.5 h-3.5" />;
      case 'star': return <Star className="w-3.5 h-3.5" />;
      case 'bookmark': return <Bookmark className="w-3.5 h-3.5" />;
      case 'layers': return <Layers className="w-3.5 h-3.5" />;
      case 'palette': return <Palette className="w-3.5 h-3.5" />;
      case 'code': return <Code className="w-3.5 h-3.5" />;
      case 'zap': return <Zap className="w-3.5 h-3.5" />;
      case 'box': return <Box className="w-3.5 h-3.5" />;
      case 'sparkles':
      default:
        return <Sparkles className="w-3.5 h-3.5" />;
    }
  };

  return (
    <aside
      id="explorer-sidebar"
      className="w-60 bg-neutral-100/70 border-r border-neutral-200 flex flex-col justify-between select-none text-xs text-neutral-700 shrink-0"
    >
      <div className="overflow-y-auto p-2 space-y-4">
        {/* 1. CUSTOM SPACES (KHÔNG GIAN TÙY CHỈNH) */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            <span className="flex items-center gap-1.5 text-neutral-700">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Không Gian Custom</span>
            </span>
            <button
              id="btn-sidebar-create-space"
              onClick={onCreateSpace}
              className="p-1 hover:bg-neutral-200 text-blue-600 rounded transition-colors"
              title="Tạo không gian tùy chỉnh mới"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="mt-1 space-y-0.5">
            {customSpaces.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-neutral-400 italic">
                Chưa có không gian nào. Bấm &quot;+&quot; để tạo khu vực gom file.
              </div>
            ) : (
              customSpaces.map((space) => {
                const isActive = activeSpaceId === space.id;
                const dotColor = COLOR_DOTS[space.color] || 'bg-blue-500';
                const isMenuOpen = activeSpaceMenuId === space.id;

                return (
                  <div
                    key={space.id}
                    id={`sidebar-space-${space.id}`}
                    onClick={() => onSelectSpace(space.id)}
                    className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-100/90 text-blue-900 font-semibold shadow-2xs'
                        : 'hover:bg-neutral-200/70 text-neutral-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-2 h-2 rounded-full ${dotColor} shrink-0`} />
                      <div className="text-neutral-500 shrink-0">
                        {getSpaceIcon(space.icon)}
                      </div>
                      <span className="truncate">{space.name}</span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {/* Count badge */}
                      <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200/80 text-neutral-600 group-hover:bg-neutral-300 font-mono">
                        {space.items.length}
                      </span>

                      {/* Options Button */}
                      <div className="relative" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => setActiveSpaceMenuId(isMenuOpen ? null : space.id)}
                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-neutral-900 hover:bg-neutral-300/60 rounded transition-all"
                          title="Tùy chọn không gian"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>

                        {/* Dropdown Menu */}
                        {isMenuOpen && (
                          <div
                            className="absolute right-0 top-6 z-30 w-36 bg-white border border-neutral-200 rounded-lg shadow-lg py-1 text-xs text-neutral-800 animate-in fade-in zoom-in-95 duration-75"
                            onMouseLeave={() => setActiveSpaceMenuId(null)}
                          >
                            <button
                              onClick={() => {
                                onEditSpace(space);
                                setActiveSpaceMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-left"
                            >
                              <Settings2 className="w-3.5 h-3.5 text-neutral-500" />
                              <span>Chỉnh sửa</span>
                            </button>
                            <button
                              onClick={() => {
                                onDeleteSpace(space.id);
                                setActiveSpaceMenuId(null);
                              }}
                              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-red-50 text-red-600 text-left"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Xóa không gian</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 2. Quick Access / Pinned Folders */}
        <div>
          <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <Pin className="w-3 h-3" />
              Pinned Folders
            </span>
          </div>

          <div className="mt-1 space-y-0.5">
            {pinnedFolders.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-neutral-400 italic">
                Chưa ghim thư mục nào.
              </div>
            ) : (
              pinnedFolders.map((pinnedPath) => {
                const name = pinnedPath.split(/[/|\\]/).filter(Boolean).pop() || pinnedPath;
                const isActive = !activeSpaceId && currentPath === pinnedPath;

                return (
                  <div
                    key={pinnedPath}
                    id={`pinned-folder-${name}`}
                    onClick={() => onNavigateToPath(pinnedPath)}
                    className={`group flex items-center justify-between px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'hover:bg-neutral-200/70 text-neutral-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <FolderOpen className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span className="truncate">{name}</span>
                    </div>

                    <button
                      id={`btn-unpin-${name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onUnpinFolder(pinnedPath);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-red-600 rounded"
                      title="Unpin folder"
                    >
                      <PinOff className="w-3 h-3" />
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* 3. Special Folders */}
        {knownFolders.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Special Folders
            </div>
            <div className="mt-1 space-y-0.5">
              {knownFolders.map((folder) => {
                const isActive = !activeSpaceId && currentPath === folder.path;
                return (
                  <div
                    key={folder.id}
                    id={`known-folder-${folder.id}`}
                    onClick={() => onNavigateToPath(folder.path)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'hover:bg-neutral-200/70 text-neutral-700'
                    }`}
                  >
                    {getKnownFolderIcon(folder.id)}
                    <span className="truncate">{folder.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 4. Drives / Storage */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            This PC / Drives
          </div>
          <div className="mt-1 space-y-0.5">
            {drives.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-neutral-400 italic">
                Chưa mount ổ đĩa. Bấm nút bên dưới để chọn thư mục.
              </div>
            ) : (
              drives.map((drive) => {
                const isActive = !activeSpaceId && currentPath === drive.path;
                return (
                  <div
                    key={drive.path}
                    id={`drive-${drive.name}`}
                    onClick={() => onNavigateToPath(drive.path)}
                    className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md cursor-pointer transition-colors ${
                      isActive
                        ? 'bg-blue-100 text-blue-900 font-medium'
                        : 'hover:bg-neutral-200/70 text-neutral-700'
                    }`}
                  >
                    <HardDrive className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="truncate">{drive.name}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Bottom Mount / Folder Picker Button */}
      <div className="p-2 border-t border-neutral-200 bg-neutral-100/90">
        <button
          id="btn-sidebar-open-folder"
          onClick={onOpenFolderPicker}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg font-medium text-neutral-700 hover:text-neutral-900 shadow-xs transition-colors"
        >
          <FolderInput className="w-4 h-4 text-blue-600" />
          <span>Mở Thư Mục / Ổ Đĩa</span>
        </button>
      </div>
    </aside>
  );
};
