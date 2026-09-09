import React, { useEffect, useRef } from 'react';
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
} from 'lucide-react';
import { FileItem } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  item: FileItem | null;
  pinnedFolders: string[];
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
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  pinnedFolders,
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
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

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
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 260);

  const isPinned = item?.isDir && pinnedFolders.includes(item.path);

  return (
    <div
      ref={menuRef}
      id="explorer-context-menu"
      style={{ left: `${adjustedX}px`, top: `${adjustedY}px` }}
      className="fixed z-50 w-52 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-xl shadow-xl py-1 text-xs text-neutral-800 animate-in fade-in zoom-in-95 duration-75 select-none"
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
