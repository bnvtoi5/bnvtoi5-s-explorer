import React from 'react';
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
      className="w-56 bg-neutral-100/60 border-r border-neutral-200 flex flex-col justify-between select-none text-xs text-neutral-700 shrink-0"
    >
      <div className="overflow-y-auto p-2 space-y-4">
        {/* Quick Access / Pinned Folders */}
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
                No pinned folders. Right-click any folder to pin here.
              </div>
            ) : (
              pinnedFolders.map((pinnedPath) => {
                const name = pinnedPath.split(/[/|\\]/).filter(Boolean).pop() || pinnedPath;
                const isActive = currentPath === pinnedPath;

                return (
                  <div
                    key={pinnedPath}
                    id={`pinned-folder-${name}`}
                    onClick={() => onNavigateToPath(pinnedPath)}
                    className={`group flex items-center justify-between px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
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

        {/* Windows Known Folders if native / detected */}
        {knownFolders.length > 0 && (
          <div>
            <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
              Special Folders
            </div>
            <div className="mt-1 space-y-0.5">
              {knownFolders.map((folder) => {
                const isActive = currentPath === folder.path;
                return (
                  <div
                    key={folder.id}
                    id={`known-folder-${folder.id}`}
                    onClick={() => onNavigateToPath(folder.path)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
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

        {/* Drives & Mounted Storage */}
        <div>
          <div className="px-2 py-1 text-[11px] font-semibold text-neutral-400 uppercase tracking-wider">
            This PC / Drives
          </div>
          <div className="mt-1 space-y-0.5">
            {drives.length === 0 ? (
              <div className="px-2 py-2 text-[11px] text-neutral-400 italic">
                No active drive mounted. Click &apos;Open Folder&apos; below.
              </div>
            ) : (
              drives.map((drive) => {
                const isActive = currentPath === drive.path;
                return (
                  <div
                    key={drive.path}
                    id={`drive-${drive.name}`}
                    onClick={() => onNavigateToPath(drive.path)}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${
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
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-md font-medium text-neutral-700 hover:text-neutral-900 shadow-xs transition-colors"
        >
          <FolderInput className="w-4 h-4 text-blue-600" />
          <span>Open Folder or Drive</span>
        </button>
      </div>
    </aside>
  );
};
