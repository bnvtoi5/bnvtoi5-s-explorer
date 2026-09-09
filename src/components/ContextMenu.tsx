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
} from 'lucide-react';
import { FileItem, SmartZone } from '../types';

interface ContextMenuProps {
  x: number;
  y: number;
  item: FileItem | null;
  pinnedFolders: string[];
  smartZones?: SmartZone[];
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
  onAssignToZone?: (zoneId: string, item: FileItem) => void;
}

export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  item,
  pinnedFolders,
  smartZones = [],
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
  onAssignToZone,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [showZonesSubmenu, setShowZonesSubmenu] = useState(false);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

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
            <span className="font-medium">Mở</span>
          </button>

          {/* Optional Assign to Smart Zone */}
          {smartZones.length > 0 && onAssignToZone && (
            <div
              className="relative"
              onMouseEnter={() => setShowZonesSubmenu(true)}
              onMouseLeave={() => setShowZonesSubmenu(false)}
            >
              <button
                id="ctx-assign-zone"
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-neutral-100 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span>Gán vào Hộp Khu Vực...</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              {showZonesSubmenu && (
                <div className="absolute left-full -top-1 ml-1 w-52 bg-white/95 backdrop-blur-md border border-neutral-200 rounded-xl shadow-xl py-1 text-xs text-neutral-800 z-50 animate-in fade-in duration-75">
                  <div className="px-3 py-1 text-[10px] font-semibold text-neutral-400 uppercase">
                    Chọn Hộp
                  </div>
                  {smartZones.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => {
                        onAssignToZone(z.id, item);
                        onClose();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-blue-50 hover:text-blue-700 transition-colors text-left"
                    >
                      <span className="truncate flex-1">{z.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

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
                  <span>Bỏ ghim khỏi Truy Cập Nhanh</span>
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 text-neutral-500" />
                  <span>Ghim vào Truy Cập Nhanh</span>
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
            <span>Sao chép đường dẫn</span>
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
            <span>Đổi tên</span>
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
            <span>Xóa</span>
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
            <span>Thuộc tính (Properties)</span>
          </button>
        </>
      ) : (
        <>
          <button
            id="ctx-new-folder"
            onClick={() => {
              onCreateFolder();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <FolderPlus className="w-4 h-4 text-amber-500" />
            <span>Thư mục mới</span>
          </button>

          <button
            id="ctx-new-file"
            onClick={() => {
              onCreateFile();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <FilePlus className="w-4 h-4 text-blue-500" />
            <span>Tập tin văn bản mới (.txt)</span>
          </button>

          <div className="border-t border-neutral-200 my-1" />

          <button
            id="ctx-refresh"
            onClick={() => {
              onRefresh();
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4 text-neutral-500" />
            <span>Làm mới (Refresh)</span>
          </button>

          <div className="border-t border-neutral-200 my-1" />

          <button
            id="ctx-properties-bg"
            onClick={() => {
              onShowProperties(null);
              onClose();
            }}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-neutral-100 transition-colors"
          >
            <Info className="w-4 h-4 text-neutral-500" />
            <span>Thuộc tính thư mục</span>
          </button>
        </>
      )}
    </div>
  );
};
