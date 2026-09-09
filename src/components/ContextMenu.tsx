import React, { useState, useEffect, useRef } from 'react';
import {
  FolderOpen,
  Pin,
  PinOff,
  Edit2,
  Trash2,
  Copy,
  Info,
  FolderPlus,
  FilePlus,
  RefreshCw,
  Layers,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { FileItem, CustomSpace } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  item: FileItem | null;
  pinnedFolders: string[];
  customSpaces: CustomSpace[];
  onClose: () => void;
  onOpen: (item: FileItem) => void;
  onPin: (path: string) => void;
  onUnpin: (path: string) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onShowProperties: (item: FileItem | null) => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onRefresh: () => void;
  onAddItemToSpace: (spaceId: string, item: FileItem) => void;
  onCreateNewSpace: () => void;
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

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  pinnedFolders,
  customSpaces,
  onClose,
  onOpen,
  onPin,
  onUnpin,
  onRename,
  onDelete,
  onShowProperties,
  onCreateFolder,
  onCreateFile,
  onRefresh,
  onAddItemToSpace,
  onCreateNewSpace,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showSpacesSubmenu, setShowSpacesSubmenu] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Adjust coordinates so menu doesn't overflow screen
  const adjustedX = Math.min(x, window.innerWidth - 240);
  const adjustedY = Math.min(y, window.innerHeight - 340);

  const isPinned = item?.isDir && pinnedFolders.includes(item.path);

  return (
    <div
      ref={menuRef}
      id="explorer-context-menu"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-56 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-xl shadow-xl py-1 text-xs text-neutral-800 animate-in fade-in zoom-in-95 duration-75 select-none"
    >
      {item ? (
        // Item specific actions
        <>
          <button
            id="ctx-open-item"
            onClick={() => {
              onOpen(item);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 transition-colors"
          >
            <FolderOpen className="w-4 h-4 text-blue-500" />
            <span className="font-medium">Open</span>
          </button>

          {/* Add to Custom Space submenu */}
          <div
            className="relative"
            onMouseEnter={() => setShowSpacesSubmenu(true)}
            onMouseLeave={() => setShowSpacesSubmenu(false)}
          >
            <button
              id="ctx-add-to-space"
              className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-neutral-100 transition-colors"
            >
              <div className="flex items-center gap-2.5">
                <Layers className="w-4 h-4 text-blue-600" />
                <span className="font-medium">Gôm vào Không Gian...</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {/* Flyout Submenu */}
            {showSpacesSubmenu && (
              <div
                className="absolute left-full -top-1 ml-1 w-52 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-xl shadow-xl py-1 text-xs text-neutral-800 animate-in fade-in duration-75 z-50"
              >
                <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase">
                  Chọn Không Gian
                </div>

                {customSpaces.map((sp) => (
                  <button
                    key={sp.id}
                    onClick={() => {
                      onAddItemToSpace(sp.id, item);
                      onClose();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                  >
                    <div className={`w-2 h-2 rounded-full ${COLOR_DOTS[sp.color] || 'bg-blue-500'}`} />
                    <span className="truncate flex-1">{sp.name}</span>
                    <span className="text-[10px] text-neutral-400">{sp.items.length}</span>
                  </button>
                ))}

                <div className="border-t border-neutral-100 my-1" />

                <button
                  onClick={() => {
                    onCreateNewSpace();
                    onClose();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-neutral-100 text-blue-600 font-medium transition-colors text-left"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Tạo Không Gian Mới</span>
                </button>
              </div>
            )}
          </div>

          {item.isDir && (
            <button
              id="ctx-pin-item"
              onClick={() => {
                if (isPinned) {
                  onUnpin(item.path);
                } else {
                  onPin(item.path);
                }
                onClose();
              }}
              className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
            >
              {isPinned ? (
                <>
                  <PinOff className="w-4 h-4 text-neutral-500" />
                  <span>Unpin from Quick Access</span>
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 text-neutral-500" />
                  <span>Pin to Quick Access</span>
                </>
              )}
            </button>
          )}

          <button
            id="ctx-copy-path"
            onClick={() => {
              navigator.clipboard.writeText(item.path);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <Copy className="w-4 h-4 text-neutral-500" />
            <span>Copy path</span>
          </button>

          <div className="border-t border-neutral-200 my-1" />

          <button
            id="ctx-rename-item"
            onClick={() => {
              onRename(item);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <Edit2 className="w-4 h-4 text-neutral-500" />
            <span>Rename</span>
          </button>

          <button
            id="ctx-delete-item"
            onClick={() => {
              onDelete(item);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-red-50 text-red-600 transition-colors"
          >
            <Trash2 className="w-4 h-4 text-red-500" />
            <span>Delete</span>
          </button>

          <div className="border-t border-neutral-200 my-1" />

          <button
            id="ctx-properties-item"
            onClick={() => {
              onShowProperties(item);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <Info className="w-4 h-4 text-neutral-500" />
            <span>Properties</span>
          </button>
        </>
      ) : (
        // Background canvas context menu
        <>
          <button
            id="ctx-bg-refresh"
            onClick={() => {
              onRefresh();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-neutral-500" />
            <span>Refresh</span>
          </button>

          <div className="border-t border-neutral-200 my-1" />

          <button
            id="ctx-bg-new-folder"
            onClick={() => {
              onCreateFolder();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            <span>New folder</span>
          </button>

          <button
            id="ctx-bg-new-file"
            onClick={() => {
              onCreateFile();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <FilePlus className="w-4 h-4 text-blue-500" />
            <span>New text document</span>
          </button>

          <div className="border-t border-neutral-200 my-1" />

          <button
            id="ctx-bg-new-space"
            onClick={() => {
              onCreateNewSpace();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 text-blue-600 transition-colors"
          >
            <Layers className="w-4 h-4 text-blue-600" />
            <span>+ Tạo Không Gian Mới</span>
          </button>

          <div className="border-t border-neutral-200 my-1" />

          <button
            id="ctx-bg-properties"
            onClick={() => {
              onShowProperties(null);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <Info className="w-4 h-4 text-neutral-500" />
            <span>Properties</span>
          </button>
        </>
      )}
    </div>
  );
};
