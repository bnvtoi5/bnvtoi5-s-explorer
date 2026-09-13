import React, { useState, useEffect, useRef } from 'react';
import {
  Folder,
  FileText,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  File,
  FolderInput,
  Check,
} from 'lucide-react';
import { FileItem, ViewMode, SortField, SortOrder } from '../types';
import {
  formatFileSize,
  formatWindowsDate,
  setupExternalFileDragData,
  setGlobalDragItems,
  getGlobalDragItems,
  clearGlobalDragItems,
} from '../services/fs';

interface FileListViewProps {
  items: FileItem[];
  currentPath: string;
  selectedItems: FileItem[];
  clipboard?: { items: FileItem[]; action: 'copy' | 'cut' } | null;
  onSelectItem: (item: FileItem, isMulti: boolean, isRange?: boolean) => void;
  onSelectMultiple?: (items: FileItem[]) => void;
  onOpenItem: (item: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | null) => void;
  viewMode: ViewMode;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  onOpenFolderPicker: () => void;
  isSearching: boolean;
  onMoveItemsToFolder?: (sourcePaths: string[], targetFolderPath: string) => void;
  onDropExternalFiles?: (files: FileList | File[]) => void;
}

export const FileListView: React.FC<FileListViewProps> = ({
  items,
  currentPath,
  selectedItems,
  clipboard,
  onSelectItem,
  onSelectMultiple,
  onOpenItem,
  onContextMenu,
  viewMode,
  sortBy,
  sortOrder,
  onSortChange,
  onOpenFolderPicker,
  isSearching,
  onMoveItemsToFolder,
  onDropExternalFiles,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMouseDownTargetRef = useRef<HTMLElement | null>(null);
  const hasMarqueeMovedRef = useRef<boolean>(false);
  const isCtrlMarqueeRef = useRef<boolean>(false);
  const initialSelectedItemsRef = useRef<FileItem[]>([]);

  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Track folder being hovered over by drag cursor
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [isBackgroundDragOver, setIsBackgroundDragOver] = useState(false);

  // Marquee drag-to-select listener
  useEffect(() => {
    if (!marquee) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMarquee((prev) => (prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null));

      const boxLeft = Math.min(marquee.startX, e.clientX);
      const boxRight = Math.max(marquee.startX, e.clientX);
      const boxTop = Math.min(marquee.startY, e.clientY);
      const boxBottom = Math.max(marquee.startY, e.clientY);

      // Only perform item collision detection if dragged more than 4px
      if (boxRight - boxLeft > 4 || boxBottom - boxTop > 4) {
        hasMarqueeMovedRef.current = true;
        const container = containerRef.current;
        if (!container) return;

        const itemEls = container.querySelectorAll<HTMLElement>('[data-item-id]');
        const matchedItems: FileItem[] = [];

        itemEls.forEach((el) => {
          const rect = el.getBoundingClientRect();
          const intersects = !(
            rect.right < boxLeft ||
            rect.left > boxRight ||
            rect.bottom < boxTop ||
            rect.top > boxBottom
          );
          if (intersects) {
            const itemId = el.getAttribute('data-item-id');
            const found = items.find((it) => it.id === itemId);
            if (found && !matchedItems.some((m) => m.id === found.id)) {
              matchedItems.push(found);
            }
          }
        });

        if (onSelectMultiple) {
          const isHoldingCtrl = isCtrlMarqueeRef.current || e.ctrlKey || e.metaKey;
          if (isHoldingCtrl) {
            // Keep items that were already selected before marquee started,
            // and combine them with items covered by the marquee selection box
            const combinedMap = new Map<string, FileItem>();
            initialSelectedItemsRef.current.forEach((it) => combinedMap.set(it.id, it));
            matchedItems.forEach((it) => combinedMap.set(it.id, it));
            onSelectMultiple(Array.from(combinedMap.values()));
          } else {
            onSelectMultiple(matchedItems);
          }
        }
      }
    };

    const handleMouseUp = () => {
      setMarquee(null);
      isCtrlMarqueeRef.current = false;
      initialSelectedItemsRef.current = [];
      setTimeout(() => {
        hasMarqueeMovedRef.current = false;
      }, 60);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [marquee, items, onSelectMultiple]);

  const handleContainerMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only primary left click triggers selection box
    const target = e.target as HTMLElement;

    // Ignore if clicking on buttons, inputs or column header th
    if (
      target.closest('button') ||
      target.closest('input') ||
      target.closest('th')
    ) {
      return;
    }

    // If clicking directly on any file/folder item (row, card, or tile), do NOT initiate marquee box drag.
    // Allow item click, double click, and native HTML5 dragging to take full priority.
    if (target.closest('[data-item-id]')) {
      return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    isCtrlMarqueeRef.current = isCtrl;
    initialSelectedItemsRef.current = isCtrl ? [...selectedItems] : [];

    lastMouseDownTargetRef.current = target;
    hasMarqueeMovedRef.current = false;

    setMarquee({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });

    if (!isCtrl && onSelectMultiple) {
      // If clicking outside items (gutters or empty canvas)
      if (
        target.closest('[data-gutter="left"]') ||
        target.closest('[data-gutter="right"]') ||
        target.id === 'details-view-left-gutter' ||
        target.id === 'details-view-right-gutter' ||
        target.id === 'grid-view-left-gutter' ||
        target.id === 'grid-view-right-gutter' ||
        target.id === 'tiles-view-left-gutter' ||
        target.id === 'tiles-view-right-gutter' ||
        target.id === 'details-view-empty-area' ||
        target.id === 'grid-view-empty-area' ||
        target.id === 'tiles-view-empty-area' ||
        target.id === 'file-view-details' ||
        target.id === 'file-view-grid' ||
        target.id === 'file-view-tiles'
      ) {
        onSelectMultiple([]);
      }
    }
  };

  const handleHeaderSort = (field: SortField) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, field === 'modified' || field === 'size' ? 'desc' : 'asc');
    }
  };

  // Helper to extract dragged file paths from dataTransfer
  const extractDraggedPaths = (e: React.DragEvent): string[] => {
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

  // Universal drag start handler that prepares all OS and browser formats
  const handleItemDragStart = (e: React.DragEvent, item: FileItem) => {
    const target = e.target as HTMLElement;
    // Don't drag if interacting with an input or button
    if (target.closest('input') || target.closest('button')) {
      e.preventDefault();
      return;
    }

    // Cancel any active marquee box
    setMarquee(null);

    const isAlreadySelected = selectedItems.some((s) => s.id === item.id);
    const itemsToDrag = isAlreadySelected ? selectedItems : [item];

    if (!isAlreadySelected && onSelectItem) {
      onSelectItem(item, false);
    }

    setGlobalDragItems(itemsToDrag);
    setupExternalFileDragData(e, itemsToDrag);
  };

  const handleItemDragEnd = () => {
    clearGlobalDragItems();
    setDragOverFolderId(null);
  };

  // Drop onto folder item inside the list
  const handleDropOnFolder = (e: React.DragEvent, targetFolder: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);

    // Target folder normalized
    const normTarget = targetFolder.path.replace(/\\/g, '/').toLowerCase();

    // 1. Check synchronous internal drag items first
    const globalItems = getGlobalDragItems();
    if (globalItems.length > 0 && onMoveItemsToFolder) {
      const validSources = globalItems
        .filter((i) => {
          const normSrc = i.path.replace(/\\/g, '/').toLowerCase();
          if (normSrc === normTarget) return false;
          // Prevent moving a folder into its own subfolder
          if (i.isDir && normTarget.startsWith(normSrc + '/')) return false;
          return true;
        })
        .map((i) => i.path);

      clearGlobalDragItems();
      if (validSources.length > 0) {
        onMoveItemsToFolder(validSources, targetFolder.path);
        return;
      }
    }

    // 2. Extracted paths from payload
    const sourcePaths = extractDraggedPaths(e);
    if (sourcePaths.length > 0 && onMoveItemsToFolder) {
      const validSources = sourcePaths.filter((p) => {
        const normSrc = p.replace(/\\/g, '/').toLowerCase();
        if (normSrc === normTarget) return false;
        if (normTarget.startsWith(normSrc + '/')) return false;
        return true;
      });

      if (validSources.length > 0) {
        onMoveItemsToFolder(validSources, targetFolder.path);
        return;
      }
    }

    // 3. If external files were dropped from desktop/external apps
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropExternalFiles) {
      onDropExternalFiles(e.dataTransfer.files);
    }
  };

  // Drop onto empty background space in current folder
  const handleDropOnBackground = (e: React.DragEvent) => {
    e.preventDefault();
    setIsBackgroundDragOver(false);

    // 1. Check synchronous internal drag items first
    const globalItems = getGlobalDragItems();
    if (globalItems.length > 0 && onMoveItemsToFolder && currentPath) {
      const validSources = globalItems.map((i) => i.path);
      clearGlobalDragItems();
      if (validSources.length > 0) {
        onMoveItemsToFolder(validSources, currentPath);
        return;
      }
    }

    // 2. External files dropped into current folder
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropExternalFiles) {
      onDropExternalFiles(e.dataTransfer.files);
      return;
    }

    // 3. Fallback to payload paths
    const sourcePaths = extractDraggedPaths(e);
    if (sourcePaths.length > 0 && onMoveItemsToFolder && currentPath) {
      onMoveItemsToFolder(sourcePaths, currentPath);
    }
  };

  const getFileIcon = (item: FileItem, className: string = 'w-4 h-4') => {
    if (item.isDir) {
      return <Folder className={`${className} text-amber-500 fill-amber-500/20 shrink-0`} />;
    }

    const ext = item.extension?.toLowerCase();
    switch (ext) {
      case 'ts':
      case 'tsx':
      case 'js':
      case 'jsx':
      case 'json':
      case 'html':
      case 'css':
      case 'py':
      case 'rs':
        return <FileCode className={`${className} text-blue-500 shrink-0`} />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
      case 'svg':
      case 'bmp':
        return <FileImage className={`${className} text-purple-500 shrink-0`} />;
      case 'mp3':
      case 'wav':
      case 'ogg':
      case 'flac':
        return <FileAudio className={`${className} text-rose-500 shrink-0`} />;
      case 'mp4':
      case 'webm':
      case 'mkv':
      case 'avi':
      case 'mov':
        return <FileVideo className={`${className} text-emerald-500 shrink-0`} />;
      case 'zip':
      case 'rar':
      case '7z':
      case 'tar':
      case 'gz':
        return <FileArchive className={`${className} text-amber-600 shrink-0`} />;
      case 'pdf':
      case 'doc':
      case 'docx':
      case 'txt':
      case 'md':
        return <FileText className={`${className} text-blue-600 shrink-0`} />;
      default:
        return <File className={`${className} text-neutral-400 shrink-0`} />;
    }
  };

  const getItemTypeDescription = (item: FileItem) => {
    if (item.isDir) return 'File folder';
    const ext = (item.extension || '').toUpperCase();
    if (!ext) return 'File';
    return `${ext} File`;
  };

  const renderMarqueeOverlay = () => {
    if (
      !marquee ||
      (Math.abs(marquee.currentX - marquee.startX) < 4 &&
        Math.abs(marquee.currentY - marquee.startY) < 4)
    ) {
      return null;
    }

    const left = Math.min(marquee.startX, marquee.currentX);
    const top = Math.min(marquee.startY, marquee.currentY);
    const width = Math.abs(marquee.currentX - marquee.startX);
    const height = Math.abs(marquee.currentY - marquee.startY);

    return (
      <div
        className="fixed pointer-events-none z-50 bg-blue-500/20 border border-blue-500 rounded-xs"
        style={{ left, top, width, height }}
      />
    );
  };

  // Empty state when no folder is selected
  if (!currentPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400">
        <FolderInput className="w-16 h-16 mb-4 text-neutral-300 stroke-[1.25]" />
        <h3 className="text-base font-medium text-neutral-700 mb-1">Chưa chọn thư mục</h3>
        <p className="text-xs text-neutral-500 mb-4 text-center max-w-sm">
          Nhấn nút bên dưới để chọn một thư mục bất kỳ trên máy tính của bạn và quản lý tệp tin.
        </p>
        <button
          onClick={onOpenFolderPicker}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-sm transition-colors cursor-pointer"
        >
          <FolderInput className="w-4 h-4" />
          <span>Mở thư mục...</span>
        </button>
      </div>
    );
  }

  // Empty folder state
  if (items.length === 0) {
    return (
      <div
        ref={containerRef}
        id="file-view-empty"
        onContextMenu={(e) => onContextMenu(e, null)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsBackgroundDragOver(true);
        }}
        onDragLeave={() => setIsBackgroundDragOver(false)}
        onDrop={handleDropOnBackground}
        className={`flex-1 flex flex-col items-center justify-center p-8 select-none transition-colors ${
          isBackgroundDragOver ? 'bg-blue-50/50 border-2 border-dashed border-blue-400' : 'bg-white'
        }`}
      >
        <Folder className="w-12 h-12 text-neutral-200 stroke-[1.25] mb-2" />
        <span className="text-sm font-medium text-neutral-500">
          {isSearching ? 'Không tìm thấy tệp phù hợp' : 'Thư mục trống'}
        </span>
        <span className="text-xs text-neutral-400 mt-1">
          Kéo thả tệp từ ngoài vào đây hoặc nhấn chuột phải để tạo tệp mới
        </span>
      </div>
    );
  }

  // Details View
  if (viewMode === 'details') {
    return (
      <div
        ref={containerRef}
        id="file-view-details"
        onMouseDown={handleContainerMouseDown}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsBackgroundDragOver(true);
        }}
        onDragLeave={() => setIsBackgroundDragOver(false)}
        onDrop={handleDropOnBackground}
        className={`flex-1 overflow-auto bg-white select-none text-xs relative transition-colors flex flex-row min-h-full ${
          isBackgroundDragOver ? 'bg-blue-50/20' : ''
        }`}
        onContextMenu={(e) => {
          const itemEl = (e.target as HTMLElement).closest('[data-item-id]');
          if (!itemEl) {
            e.preventDefault();
            onContextMenu(e, null);
          }
        }}
      >
        {/* Outermost Left Gutter - completely independent from rows */}
        <div
          id="details-view-left-gutter"
          data-gutter="left"
          className="w-5 sm:w-7 md:w-8 shrink-0 bg-transparent select-none cursor-default"
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, null);
          }}
        />

        {/* Main Content Area: Table + Empty area below items */}
        <div className="flex-1 min-w-[560px] max-w-5xl flex flex-col">
          <table className="w-full text-left border-collapse table-auto">
            <thead className="sticky top-0 bg-neutral-50/95 backdrop-blur-xs border-b border-neutral-200 z-10 text-neutral-500 font-medium">
              <tr>
                <th
                  onClick={() => handleHeaderSort('name')}
                  className="py-2 px-3 cursor-pointer hover:bg-neutral-100 transition-colors w-[380px] min-w-[220px] select-none"
                >
                  <div className="flex items-center justify-between">
                    <span>Name</span>
                    {sortBy === 'name' && (
                      <span className="text-blue-600 ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('modified')}
                  className="py-2 px-3 cursor-pointer hover:bg-neutral-100 transition-colors w-[180px] min-w-[150px] select-none"
                >
                  <div className="flex items-center justify-between">
                    <span>Date modified</span>
                    {sortBy === 'modified' && (
                      <span className="text-blue-600 ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('type')}
                  className="py-2 px-3 cursor-pointer hover:bg-neutral-100 transition-colors w-[160px] min-w-[130px] select-none"
                >
                  <div className="flex items-center justify-between">
                    <span>Type</span>
                    {sortBy === 'type' && (
                      <span className="text-blue-600 ml-1">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort('size')}
                  className="py-2 px-3 cursor-pointer hover:bg-neutral-100 transition-colors w-[110px] min-w-[90px] text-right select-none"
                >
                  <div className="flex items-center justify-end gap-1">
                    <span>Size</span>
                    {sortBy === 'size' && (
                      <span className="text-blue-600">{sortOrder === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => {
                const isSelected = selectedItems.some((s) => s.id === item.id);
                const isDragTarget = dragOverFolderId === item.id;
                const isCut = clipboard?.action === 'cut' && clipboard.items.some((i) => i.id === item.id);

                return (
                  <tr
                    key={item.id}
                    data-item-id={item.id}
                    id={`file-row-${item.name}`}
                    draggable
                    onDragStart={(e) => handleItemDragStart(e, item)}
                    onDragEnd={handleItemDragEnd}
                    onDragOver={(e) => {
                      if (item.isDir) {
                        e.preventDefault();
                        e.stopPropagation();
                        e.dataTransfer.dropEffect = 'move';
                        setDragOverFolderId(item.id);
                      }
                    }}
                    onDragLeave={(e) => {
                      if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                      if (item.isDir && dragOverFolderId === item.id) {
                        setDragOverFolderId(null);
                      }
                    }}
                    onDrop={(e) => {
                      if (item.isDir) {
                        handleDropOnFolder(e, item);
                      }
                    }}
                    onClick={(e) => {
                      if (hasMarqueeMovedRef.current) {
                        e.stopPropagation();
                        return;
                      }
                      onSelectItem(item, e.ctrlKey || e.metaKey, e.shiftKey);
                    }}
                    onDoubleClick={() => {
                      onOpenItem(item);
                    }}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      onContextMenu(e, item);
                    }}
                    className={`group border-b border-neutral-100 cursor-pointer transition-colors ${
                      isDragTarget
                        ? 'bg-blue-100/90 ring-2 ring-blue-500 font-semibold text-blue-950'
                        : isSelected
                        ? 'bg-blue-100/75 text-blue-950 font-medium'
                        : 'hover:bg-neutral-50/90 text-neutral-800'
                    } ${item.isHidden ? 'opacity-50' : ''} ${isCut ? 'opacity-40' : ''}`}
                  >
                    {/* Name Column */}
                    <td className="py-2.5 px-3">
                      <div data-drag-handle="true" className="flex items-center gap-2.5 truncate">
                        {getFileIcon(item)}
                        <span className="truncate font-normal">{item.name}</span>
                        {isDragTarget && (
                          <span className="ml-2 text-[11px] font-medium text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Thả vào đây
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Date modified */}
                    <td className="py-2.5 px-3 text-neutral-500 whitespace-nowrap">
                      {formatWindowsDate(item.modifiedMs)}
                    </td>

                    {/* Type */}
                    <td className="py-2.5 px-3 text-neutral-500 truncate">
                      {getItemTypeDescription(item)}
                    </td>

                    {/* Size */}
                    <td className="py-2.5 px-3 text-neutral-500 text-right whitespace-nowrap">
                      {item.isDir ? '' : formatFileSize(item.size)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Generous empty space below items for easy marquee drag-to-select and background context menu */}
          <div
            id="details-view-empty-area"
            className="min-h-[280px] flex-1 cursor-default p-6 flex flex-col justify-start"
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(e, null);
            }}
          >
            {items.length === 0 && (
              <div className="py-20 text-center text-neutral-400 font-normal">
                Thư mục này trống
              </div>
            )}
          </div>
        </div>

        {/* Outermost Right Gutter - completely independent from rows */}
        <div
          id="details-view-right-gutter"
          data-gutter="right"
          className="flex-1 min-w-[60px] md:min-w-[120px] bg-transparent select-none cursor-default"
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, null);
          }}
        />

        {renderMarqueeOverlay()}
      </div>
    );
  }

  // Grid / Large Icons View
  if (viewMode === 'grid') {
    return (
      <div
        ref={containerRef}
        id="file-view-grid"
        onMouseDown={handleContainerMouseDown}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          setIsBackgroundDragOver(true);
        }}
        onDragLeave={() => setIsBackgroundDragOver(false)}
        onDrop={handleDropOnBackground}
        className={`flex-1 overflow-auto bg-white select-none relative transition-colors flex flex-row min-h-full ${
          isBackgroundDragOver ? 'bg-blue-50/20' : ''
        }`}
        onContextMenu={(e) => {
          const itemEl = (e.target as HTMLElement).closest('[data-item-id]');
          if (!itemEl) {
            e.preventDefault();
            onContextMenu(e, null);
          }
        }}
      >
        {/* Outermost Left Gutter */}
        <div
          id="grid-view-left-gutter"
          data-gutter="left"
          className="w-5 sm:w-7 md:w-8 shrink-0 bg-transparent select-none cursor-default"
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, null);
          }}
        />

        {/* Main Grid Content Area */}
        <div className="flex-1 min-w-0 flex flex-col py-4">
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
            {items.map((item) => {
              const isSelected = selectedItems.some((s) => s.id === item.id);
              const isDragTarget = dragOverFolderId === item.id;
              const isCut = clipboard?.action === 'cut' && clipboard.items.some((i) => i.id === item.id);

              return (
                <div
                  key={item.id}
                  data-item-id={item.id}
                  id={`file-grid-item-${item.name}`}
                  draggable
                  onDragStart={(e) => handleItemDragStart(e, item)}
                  onDragEnd={handleItemDragEnd}
                  onDragOver={(e) => {
                    if (item.isDir) {
                      e.preventDefault();
                      e.stopPropagation();
                      e.dataTransfer.dropEffect = 'move';
                      setDragOverFolderId(item.id);
                    }
                  }}
                  onDragLeave={(e) => {
                    if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                    if (item.isDir && dragOverFolderId === item.id) {
                      setDragOverFolderId(null);
                    }
                  }}
                  onDrop={(e) => {
                    if (item.isDir) {
                      handleDropOnFolder(e, item);
                    }
                  }}
                  onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey, e.shiftKey)}
                  onDoubleClick={() => onOpenItem(item)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onContextMenu(e, item);
                  }}
                  className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center cursor-pointer transition-all ${
                    isDragTarget
                      ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500 scale-105 shadow-md'
                      : isSelected
                      ? 'bg-blue-50 border-blue-400 shadow-xs'
                      : 'bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200'
                  } ${item.isHidden ? 'opacity-50' : ''} ${isCut ? 'opacity-40' : ''}`}
                >
                  <div data-drag-handle="true" className="flex flex-col items-center w-full">
                    <div className="mb-2">{getFileIcon(item, 'w-10 h-10')}</div>
                    <span className="text-xs text-neutral-800 line-clamp-2 break-all w-full px-1">
                      {item.name}
                    </span>
                    {!item.isDir && (
                      <span className="text-[10px] text-neutral-400 mt-1">
                        {formatFileSize(item.size)}
                      </span>
                    )}
                    {isDragTarget && (
                      <span className="mt-1 text-[10px] font-medium text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                        Thả vào đây
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Empty area below grid for easy marquee selection */}
          <div
            id="grid-view-empty-area"
            className="min-h-[220px] flex-1 cursor-default mt-4"
            onContextMenu={(e) => {
              e.preventDefault();
              onContextMenu(e, null);
            }}
          />
        </div>

        {/* Outermost Right Gutter */}
        <div
          id="grid-view-right-gutter"
          data-gutter="right"
          className="w-8 sm:w-16 md:w-24 shrink-0 bg-transparent select-none cursor-default"
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, null);
          }}
        />

        {renderMarqueeOverlay()}
      </div>
    );
  }

  // Tiles / Medium Icons View
  return (
    <div
      ref={containerRef}
      id="file-view-tiles"
      onMouseDown={handleContainerMouseDown}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        setIsBackgroundDragOver(true);
      }}
      onDragLeave={() => setIsBackgroundDragOver(false)}
      onDrop={handleDropOnBackground}
      className={`flex-1 overflow-auto bg-white select-none relative transition-colors flex flex-row min-h-full ${
        isBackgroundDragOver ? 'bg-blue-50/20' : ''
      }`}
      onContextMenu={(e) => {
        const itemEl = (e.target as HTMLElement).closest('[data-item-id]');
        if (!itemEl) {
          e.preventDefault();
          onContextMenu(e, null);
        }
      }}
    >
      {/* Outermost Left Gutter */}
      <div
        id="tiles-view-left-gutter"
        data-gutter="left"
        className="w-5 sm:w-7 md:w-8 shrink-0 bg-transparent select-none cursor-default"
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, null);
        }}
      />

      {/* Main Tiles Content Area */}
      <div className="flex-1 min-w-0 flex flex-col py-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
          {items.map((item) => {
            const isSelected = selectedItems.some((s) => s.id === item.id);
            const isDragTarget = dragOverFolderId === item.id;
            const isCut = clipboard?.action === 'cut' && clipboard.items.some((i) => i.id === item.id);

            return (
              <div
                key={item.id}
                data-item-id={item.id}
                id={`file-tile-item-${item.name}`}
                draggable
                onDragStart={(e) => handleItemDragStart(e, item)}
                onDragEnd={handleItemDragEnd}
                onDragOver={(e) => {
                  if (item.isDir) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    setDragOverFolderId(item.id);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (item.isDir && dragOverFolderId === item.id) {
                    setDragOverFolderId(null);
                  }
                }}
                onDrop={(e) => {
                  if (item.isDir) {
                    handleDropOnFolder(e, item);
                  }
                }}
                onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey, e.shiftKey)}
                onDoubleClick={() => onOpenItem(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, item);
                }}
                className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
                  isDragTarget
                    ? 'bg-blue-100 border-blue-500 ring-2 ring-blue-500 shadow-sm'
                    : isSelected
                    ? 'bg-blue-50 border-blue-400'
                    : 'bg-white border-neutral-200 hover:bg-neutral-50'
                } ${item.isHidden ? 'opacity-50' : ''} ${isCut ? 'opacity-40' : ''}`}
              >
                <div data-drag-handle="true" className="flex items-center gap-3 min-w-0 flex-1">
                  {getFileIcon(item, 'w-8 h-8')}
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-neutral-800 truncate">{item.name}</p>
                    <p className="text-[10px] text-neutral-400 truncate">
                      {getItemTypeDescription(item)}
                      {!item.isDir && ` • ${formatFileSize(item.size)}`}
                    </p>
                    {isDragTarget && (
                      <span className="text-[10px] font-medium text-blue-600">
                        Thả để chuyển vào
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Empty area below tiles for easy marquee selection */}
        <div
          id="tiles-view-empty-area"
          className="min-h-[220px] flex-1 cursor-default mt-4"
          onContextMenu={(e) => {
            e.preventDefault();
            onContextMenu(e, null);
          }}
        />
      </div>

      {/* Outermost Right Gutter */}
      <div
        id="tiles-view-right-gutter"
        data-gutter="right"
        className="w-8 sm:w-16 md:w-24 shrink-0 bg-transparent select-none cursor-default"
        onContextMenu={(e) => {
          e.preventDefault();
          onContextMenu(e, null);
        }}
      />

      {renderMarqueeOverlay()}
    </div>
  );
};
