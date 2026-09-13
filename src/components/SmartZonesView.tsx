import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  FileItem,
  SmartZone,
  ZoneColor,
  ZoneWidth,
  ZoneDisplayStyle,
  ZoneRuleType,
  ZoneFreeformLayout,
  SmartZonesLayoutMode,
} from '../types';
import {
  Folder,
  File,
  FileText,
  Image as ImageIcon,
  Film,
  Music,
  Archive,
  Code2,
  Settings2,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Clock,
  Tag,
  SlidersHorizontal,
  FolderOpen,
  Sparkles,
  Layers,
  Eye,
  Maximize2,
  Minimize2,
  Check,
  X,
  Move,
  ArrowUpDown,
  RotateCcw,
  PackageOpen,
  LayoutGrid,
  Lock,
  Unlock,
  Grid,
  GripHorizontal,
} from 'lucide-react';
import {
  extractArchiveItem,
  setupExternalFileDragData,
  setGlobalDragItems,
  getGlobalDragItems,
  clearGlobalDragItems,
} from '../services/fs';

interface SmartZonesViewProps {
  items: FileItem[];
  currentPath: string;
  zones: SmartZone[];
  isCustomFolderConfig?: boolean;
  layoutMode?: SmartZonesLayoutMode;
  onLayoutModeChange?: (mode: SmartZonesLayoutMode) => void;
  onUpdateZones: (zones: SmartZone[]) => void;
  onResetFolderZones?: () => void;
  onRefresh?: () => void;
  selectedItems: FileItem[];
  onSelectItem: (item: FileItem, isMulti: boolean, isRange?: boolean) => void;
  onSelectMultiple?: (items: FileItem[]) => void;
  onOpenItem: (item: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | null, targetZoneId?: string) => void;
  onOpenFolderPicker: () => void;
  clipboard?: { items: FileItem[]; action: 'copy' | 'cut' } | null;
  onMoveItemsToFolder?: (sourcePaths: string[], targetFolderPath: string) => void;
}

const COLOR_STYLES: Record<
  ZoneColor,
  {
    border: string;
    headerBg: string;
    badgeBg: string;
    badgeText: string;
    accent: string;
    dot: string;
  }
> = {
  blue: {
    border: 'border-blue-200 hover:border-blue-400',
    headerBg: 'bg-blue-50/80 text-blue-900',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    accent: 'text-blue-600',
    dot: 'bg-blue-500',
  },
  purple: {
    border: 'border-purple-200 hover:border-purple-400',
    headerBg: 'bg-purple-50/80 text-purple-900',
    badgeBg: 'bg-purple-100',
    badgeText: 'text-purple-700',
    accent: 'text-purple-600',
    dot: 'bg-purple-500',
  },
  emerald: {
    border: 'border-emerald-200 hover:border-emerald-400',
    headerBg: 'bg-emerald-50/80 text-emerald-900',
    badgeBg: 'bg-emerald-100',
    badgeText: 'text-emerald-700',
    accent: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  amber: {
    border: 'border-amber-200 hover:border-amber-400',
    headerBg: 'bg-amber-50/80 text-amber-900',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-800',
    accent: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  rose: {
    border: 'border-rose-200 hover:border-rose-400',
    headerBg: 'bg-rose-50/80 text-rose-900',
    badgeBg: 'bg-rose-100',
    badgeText: 'text-rose-700',
    accent: 'text-rose-600',
    dot: 'bg-rose-500',
  },
  cyan: {
    border: 'border-cyan-200 hover:border-cyan-400',
    headerBg: 'bg-cyan-50/80 text-cyan-900',
    badgeBg: 'bg-cyan-100',
    badgeText: 'text-cyan-700',
    accent: 'text-cyan-600',
    dot: 'bg-cyan-500',
  },
  indigo: {
    border: 'border-indigo-200 hover:border-indigo-400',
    headerBg: 'bg-indigo-50/80 text-indigo-900',
    badgeBg: 'bg-indigo-100',
    badgeText: 'text-indigo-700',
    accent: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  slate: {
    border: 'border-neutral-300 hover:border-neutral-400',
    headerBg: 'bg-neutral-100/80 text-neutral-900',
    badgeBg: 'bg-neutral-200',
    badgeText: 'text-neutral-700',
    accent: 'text-neutral-600',
    dot: 'bg-neutral-500',
  },
};

const WIDTH_CLASSES: Record<ZoneWidth, string> = {
  'col-1': 'col-span-12 md:col-span-6 lg:col-span-4 xl:col-span-3',
  'col-2': 'col-span-12 md:col-span-6 lg:col-span-6 xl:col-span-6',
  'col-3': 'col-span-12 lg:col-span-8 xl:col-span-9',
  full: 'col-span-12',
};

const COMMON_EXTENSIONS = ['wav', 'mp3', 'flac', 'png', 'jpg', 'pdf', 'docx', 'xlsx', 'zip', 'exe', 'ts', 'py'];

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFileIcon(item: FileItem) {
  if (item.isDir) return <Folder className="w-4 h-4 text-amber-500 shrink-0" fill="currentColor" />;
  const ext = (item.extension || '').toLowerCase();
  if (['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico'].includes(ext)) {
    return <ImageIcon className="w-4 h-4 text-emerald-500 shrink-0" />;
  }
  if (['mp4', 'mkv', 'webm', 'mov', 'avi'].includes(ext)) {
    return <Film className="w-4 h-4 text-purple-500 shrink-0" />;
  }
  if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
    return <Music className="w-4 h-4 text-pink-500 shrink-0" />;
  }
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return <Archive className="w-4 h-4 text-orange-500 shrink-0" />;
  }
  if (['exe', 'msi', 'bat', 'cmd'].includes(ext)) {
    return <File className="w-4 h-4 text-rose-500 shrink-0" />;
  }
  if (['pdf', 'doc', 'docx', 'txt', 'rtf', 'md'].includes(ext)) {
    return <FileText className="w-4 h-4 text-blue-500 shrink-0" />;
  }
  if (['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'html', 'css', 'rs', 'cpp'].includes(ext)) {
    return <Code2 className="w-4 h-4 text-cyan-600 shrink-0" />;
  }
  return <File className="w-4 h-4 text-neutral-400 shrink-0" />;
}

export const QUICK_EXTENSION_PRESETS = [
  {
    category: 'Âm thanh',
    exts: ['wav', 'mp3', 'flac', 'm4a', 'ogg', 'aac', 'wma'],
  },
  {
    category: 'Video',
    exts: ['mp4', 'mkv', 'mov', 'avi', 'webm'],
  },
  {
    category: 'Hình ảnh / Thiết kế',
    exts: ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'psd', 'ai'],
  },
  {
    category: 'Tài liệu / Dữ liệu',
    exts: ['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'md'],
  },
  {
    category: 'Nén & Cài đặt',
    exts: ['zip', 'rar', '7z', 'exe', 'msi', 'iso'],
  },
  {
    category: 'Mã nguồn / Dự án',
    exts: ['ts', 'js', 'py', 'json', 'html', 'css', 'sql'],
  },
];

export function parseExtensionsInput(input?: string): string[] {
  if (!input) return [];
  return Array.from(
    new Set(
      input
        .split(/[,;\s|]+/)
        .map((s) => s.trim().toLowerCase().replace(/^\./, ''))
        .filter(Boolean)
    )
  );
}

export function toggleExtensionInInput(currentInput: string, ext: string): string {
  const cleanExt = ext.trim().toLowerCase().replace(/^\./, '');
  const currentList = parseExtensionsInput(currentInput);
  let nextList: string[];
  if (currentList.includes(cleanExt)) {
    nextList = currentList.filter((e) => e !== cleanExt);
  } else {
    nextList = [...currentList, cleanExt];
  }
  return nextList.join(', ');
}

export function SmartZonesView({
  items,
  currentPath,
  zones,
  isCustomFolderConfig = false,
  layoutMode: propsLayoutMode = 'grid',
  onLayoutModeChange,
  onUpdateZones,
  onResetFolderZones,
  onRefresh,
  selectedItems,
  onSelectItem,
  onSelectMultiple,
  onOpenItem,
  onContextMenu,
  onOpenFolderPicker,
  clipboard,
  onMoveItemsToFolder,
}: SmartZonesViewProps) {
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState<boolean>(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState<boolean>(false);
  const [draggedItemPath, setDraggedItemPath] = useState<string | null>(null);
  const [draggedItems, setDraggedItems] = useState<FileItem[]>([]);
  const [draggedSourceZoneId, setDraggedSourceZoneId] = useState<string | null>(null);
  const [dragOverZoneId, setDragOverZoneId] = useState<string | null>(null);
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragDropFeedback, setDragDropFeedback] = useState<string | null>(null);

  // Layout mode & Freeform customization state
  const [layoutMode, setLayoutMode] = useState<SmartZonesLayoutMode>(propsLayoutMode || 'grid');
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);
  const [draggingZoneId, setDraggingZoneId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [resizingZoneId, setResizingZoneId] = useState<string | null>(null);
  const [resizeStart, setResizeStart] = useState<{
    startX: number;
    startY: number;
    initialWidth: number;
    initialHeight: number;
  }>({ startX: 0, startY: 0, initialWidth: 380, initialHeight: 340 });

  useEffect(() => {
    if (propsLayoutMode) {
      setLayoutMode(propsLayoutMode);
    }
  }, [propsLayoutMode]);

  const getZoneLayout = (zone: SmartZone, index: number): ZoneFreeformLayout => {
    if (zone.freeform) {
      return zone.freeform;
    }
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: 20 + col * (380 + 20),
      y: 20 + row * (340 + 20),
      width: 380,
      height: 340,
    };
  };

  const handleZoneDragStart = (e: React.MouseEvent, zoneId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const index = zones.indexOf(zone);
    const layout = getZoneLayout(zone, index);
    setDraggingZoneId(zoneId);
    setDragOffset({
      x: e.clientX - layout.x,
      y: e.clientY - layout.y,
    });
  };

  const handleResizeStart = (e: React.MouseEvent, zoneId: string) => {
    if (!isEditMode) return;
    e.preventDefault();
    e.stopPropagation();
    const zone = zones.find((z) => z.id === zoneId);
    if (!zone) return;
    const index = zones.indexOf(zone);
    const layout = getZoneLayout(zone, index);
    setResizingZoneId(zoneId);
    setResizeStart({
      startX: e.clientX,
      startY: e.clientY,
      initialWidth: layout.width,
      initialHeight: layout.height,
    });
  };

  const handleResetZoneSize = (e: React.MouseEvent, zoneId: string) => {
    e.stopPropagation();
    const updated = zones.map((z, i) => {
      if (z.id === zoneId) {
        const cur = getZoneLayout(z, i);
        return {
          ...z,
          freeform: {
            ...cur,
            width: 380,
            height: 340,
          },
        };
      }
      return z;
    });
    onUpdateZones(updated);
  };

  const handleAutoArrange = () => {
    const updated = zones.map((z, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      return {
        ...z,
        freeform: {
          x: 20 + col * (380 + 20),
          y: 20 + row * (340 + 20),
          width: 380,
          height: 340,
        },
      };
    });
    onUpdateZones(updated);
  };

  // Window drag/resize listener for Freeform boxes
  useEffect(() => {
    if (!draggingZoneId && !resizingZoneId) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (draggingZoneId) {
        let nextX = e.clientX - dragOffset.x;
        let nextY = e.clientY - dragOffset.y;
        if (snapToGrid) {
          nextX = Math.round(nextX / 16) * 16;
          nextY = Math.round(nextY / 16) * 16;
        }
        nextX = Math.max(12, nextX);
        nextY = Math.max(12, nextY);

        onUpdateZones(
          zones.map((z, idx) => {
            if (z.id === draggingZoneId) {
              const cur = getZoneLayout(z, idx);
              return {
                ...z,
                freeform: { ...cur, x: nextX, y: nextY },
              };
            }
            return z;
          })
        );
      } else if (resizingZoneId) {
        const deltaX = e.clientX - resizeStart.startX;
        const deltaY = e.clientY - resizeStart.startY;
        let nextW = resizeStart.initialWidth + deltaX;
        let nextH = resizeStart.initialHeight + deltaY;
        if (snapToGrid) {
          nextW = Math.round(nextW / 16) * 16;
          nextH = Math.round(nextH / 16) * 16;
        }
        nextW = Math.max(260, nextW);
        nextH = Math.max(180, nextH);

        onUpdateZones(
          zones.map((z, idx) => {
            if (z.id === resizingZoneId) {
              const cur = getZoneLayout(z, idx);
              return {
                ...z,
                freeform: { ...cur, width: nextW, height: nextH },
              };
            }
            return z;
          })
        );
      }
    };

    const handleMouseUp = () => {
      setDraggingZoneId(null);
      setResizingZoneId(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [draggingZoneId, resizingZoneId, dragOffset, resizeStart, snapToGrid, zones, onUpdateZones]);

  // Background context menu handler for empty spaces inside zones or container
  const handleBackgroundContextMenu = (e: React.MouseEvent, targetZoneId?: string) => {
    if ((e.target as HTMLElement).closest('[data-item-id]')) {
      return;
    }
    if ((e.target as HTMLElement).closest('input, select, textarea, button')) {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    onContextMenu(e, null, targetZoneId);
  };

  // Marquee drag-to-select state
  const containerRef = useRef<HTMLDivElement>(null);
  const isCtrlMarqueeRef = useRef<boolean>(false);
  const initialSelectedItemsRef = useRef<FileItem[]>([]);
  const [marquee, setMarquee] = useState<{
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  } | null>(null);

  // Marquee listener
  useEffect(() => {
    if (!marquee) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMarquee((prev) => (prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null));

      const boxLeft = Math.min(marquee.startX, e.clientX);
      const boxRight = Math.max(marquee.startX, e.clientX);
      const boxTop = Math.min(marquee.startY, e.clientY);
      const boxBottom = Math.max(marquee.startY, e.clientY);

      if (boxRight - boxLeft > 4 || boxBottom - boxTop > 4) {
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
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [marquee, items, onSelectMultiple]);

  const handleContainerMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (
      target.closest('[data-item-id]') ||
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('#modal-create-smart-zone') ||
      target.closest('[data-resize-handle]') ||
      (isEditMode && target.closest('[data-zone-header]'))
    ) {
      return;
    }

    const isCtrl = e.ctrlKey || e.metaKey;
    isCtrlMarqueeRef.current = isCtrl;
    initialSelectedItemsRef.current = isCtrl ? [...selectedItems] : [];

    setMarquee({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });

    if (!isCtrl && onSelectMultiple) {
      onSelectMultiple([]);
    }
  };

  const handleItemDragStart = (e: React.DragEvent, item: FileItem, sourceZoneId: string) => {
    const isAlreadySelected = selectedItems.some((s) => s.id === item.id);
    const itemsToDrag = isAlreadySelected ? selectedItems : [item];

    if (!isAlreadySelected && onSelectItem) {
      onSelectItem(item, false);
    }

    setDraggedItems(itemsToDrag);
    setDraggedItemPath(item.path);
    setDraggedSourceZoneId(sourceZoneId);
    setGlobalDragItems(itemsToDrag);
    setupExternalFileDragData(e, itemsToDrag);
  };

  const handleItemDragEnd = () => {
    setDraggedItems([]);
    setDraggedItemPath(null);
    setDraggedSourceZoneId(null);
    setDragOverZoneId(null);
    setDragOverFolderId(null);
    clearGlobalDragItems();
  };

  const handleDropOnFolder = (e: React.DragEvent, targetFolder: FileItem) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    setDragOverZoneId(null);

    const normTarget = targetFolder.path.replace(/\\/g, '/').toLowerCase();

    // 1. Check synchronous internal drag items first
    const globalItems = getGlobalDragItems();
    if (globalItems.length > 0 && onMoveItemsToFolder) {
      const validSources = globalItems
        .filter((i) => {
          const normSrc = i.path.replace(/\\/g, '/').toLowerCase();
          if (normSrc === normTarget) return false;
          if (i.isDir && normTarget.startsWith(normSrc + '/')) return false;
          return true;
        })
        .map((i) => i.path);

      clearGlobalDragItems();
      if (validSources.length > 0) {
        onMoveItemsToFolder(validSources, targetFolder.path);
        setDragDropFeedback(`Đã chuyển ${validSources.length} mục vào thư mục "${targetFolder.name}"`);
        setTimeout(() => setDragDropFeedback(null), 3000);
        return;
      }
    }

    // 2. Extracted paths from payload
    let sourcePaths: string[] = [];
    try {
      const json = e.dataTransfer.getData('application/json');
      if (json) {
        const parsed = JSON.parse(json);
        if (Array.isArray(parsed)) sourcePaths = parsed;
      }
    } catch {}
    if (sourcePaths.length === 0) {
      const txt = e.dataTransfer.getData('text/plain');
      if (txt) {
        sourcePaths = txt.split('\n').filter(Boolean);
      }
    }

    if (sourcePaths.length > 0 && onMoveItemsToFolder) {
      const validSources = sourcePaths.filter((p) => {
        const normSrc = p.replace(/\\/g, '/').toLowerCase();
        if (normSrc === normTarget) return false;
        if (normTarget.startsWith(normSrc + '/')) return false;
        return true;
      });

      if (validSources.length > 0) {
        onMoveItemsToFolder(validSources, targetFolder.path);
        setDragDropFeedback(`Đã chuyển ${validSources.length} mục vào thư mục "${targetFolder.name}"`);
        setTimeout(() => setDragDropFeedback(null), 3000);
      }
    }
  };

  // New Zone Modal Form State
  const [newZoneName, setNewZoneName] = useState('Khu vực mới');
  const [newZoneColor, setNewZoneColor] = useState<ZoneColor>('blue');
  const [newZoneWidth, setNewZoneWidth] = useState<ZoneWidth>('col-1');
  const [newZoneDisplay, setNewZoneDisplay] = useState<ZoneDisplayStyle>('compact');
  const [newZoneRuleType, setNewZoneRuleType] = useState<ZoneRuleType>('extension');
  const [newZoneRecentHours, setNewZoneRecentHours] = useState<number>(24);
  const [newZoneCategory, setNewZoneCategory] = useState<'documents' | 'images' | 'media' | 'archives' | 'folders' | 'code' | 'custom'>('custom');
  const [newZoneCustomExtensions, setNewZoneCustomExtensions] = useState<string>('wav');
  const [newZoneKeyword, setNewZoneKeyword] = useState<string>('');

  // Evaluate which files belong to each zone (NON-EXCLUSIVE: Files can match and appear in multiple zones)
  const { zoneFileMap, unsortedItems } = useMemo(() => {
    const map = new Map<string, FileItem[]>();
    const assignedPaths = new Set<string>();

    zones.forEach((z) => map.set(z.id, []));

    const now = Date.now();

    for (const item of items) {
      let matchedAnyZone = false;

      for (const zone of zones) {
        const { rule } = zone;
        let matched = false;

        const ext = (item.extension || '').toLowerCase().replace(/^\./, '');

        if (rule.ruleType === 'recent') {
          const thresholdMs = (rule.recentHours || 24) * 3600 * 1000;
          if (now - item.modifiedMs <= thresholdMs) {
            matched = true;
          }
        } else if (rule.ruleType === 'extension') {
          const targetExts = (rule.extensions || []).map((e) => e.toLowerCase().trim().replace(/^\./, '')).filter(Boolean);
          if (ext && targetExts.includes(ext)) {
            matched = true;
          }
        } else if (rule.ruleType === 'category') {
          if (rule.category === 'custom') {
            const targetExts = (rule.extensions || []).map((e) => e.toLowerCase().trim().replace(/^\./, '')).filter(Boolean);
            if (ext && targetExts.includes(ext)) {
              matched = true;
            }
          } else if (rule.category === 'folders' && item.isDir) {
            matched = true;
          } else if (rule.category === 'documents' && ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'xlsx', 'pptx', 'csv'].includes(ext)) {
            matched = true;
          } else if (rule.category === 'images' && ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'psd', 'ai'].includes(ext)) {
            matched = true;
          } else if (rule.category === 'media' && ['mp4', 'mkv', 'webm', 'mov', 'avi', 'mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
            matched = true;
          } else if (rule.category === 'archives' && ['zip', 'rar', '7z', 'tar', 'gz', 'exe', 'msi', 'iso', 'bat', 'cmd'].includes(ext)) {
            matched = true;
          } else if (rule.category === 'code' && ['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'html', 'css', 'rs', 'cpp', 'sql'].includes(ext)) {
            matched = true;
          }
        } else if (rule.ruleType === 'keyword') {
          if (rule.keyword && item.name.toLowerCase().includes(rule.keyword.toLowerCase())) {
            matched = true;
          }
        } else if (rule.ruleType === 'size') {
          const minBytes = rule.minSizeBytes || 50 * 1024 * 1024;
          if (item.size >= minBytes) {
            matched = true;
          }
        }

        // Also check if manually added to this zone
        if (rule.manualItemPaths && rule.manualItemPaths.includes(item.path)) {
          matched = true;
        }

        if (matched) {
          map.get(zone.id)?.push(item);
          matchedAnyZone = true;
          assignedPaths.add(item.path);
        }
      }
    }

    const unassigned = items.filter((it) => !assignedPaths.has(it.path));
    return { zoneFileMap: map, unsortedItems: unassigned };
  }, [items, zones]);

  // Zone actions
  const handleToggleCollapse = (zoneId: string) => {
    onUpdateZones(
      zones.map((z) => (z.id === zoneId ? { ...z, collapsed: !z.collapsed } : z))
    );
  };

  const handleUpdateZone = (zoneId: string, patch: Partial<SmartZone>) => {
    onUpdateZones(zones.map((z) => (z.id === zoneId ? { ...z, ...patch } : z)));
  };

  const handleDeleteZone = (zoneId: string) => {
    onUpdateZones(zones.filter((z) => z.id !== zoneId));
  };

  const handleCreateZone = () => {
    const isExtRule = newZoneRuleType === 'extension' || (newZoneRuleType === 'category' && newZoneCategory === 'custom');
    const parsedExts = isExtRule ? parseExtensionsInput(newZoneCustomExtensions) : undefined;

    let defaultName = newZoneName.trim();
    if (!defaultName || defaultName === 'Khu vực mới') {
      if (isExtRule && parsedExts && parsedExts.length > 0) {
        defaultName = `Hộp Tệp .${parsedExts.join(', .')}`;
      } else {
        defaultName = 'Khu vực mới';
      }
    }

    const newZone: SmartZone = {
      id: 'zone_' + Date.now(),
      name: defaultName,
      color: newZoneColor,
      width: newZoneWidth,
      displayStyle: newZoneDisplay,
      collapsed: false,
      rule: {
        ruleType: newZoneRuleType,
        recentHours: newZoneRuleType === 'recent' ? newZoneRecentHours : undefined,
        category: newZoneRuleType === 'category' ? newZoneCategory : undefined,
        extensions: parsedExts,
        customExtensionsInput: isExtRule ? newZoneCustomExtensions : undefined,
        keyword: newZoneRuleType === 'keyword' ? newZoneKeyword.trim() : undefined,
        manualItemPaths: [],
      },
    };

    onUpdateZones([...zones, newZone]);
    setIsAddZoneModalOpen(false);
  };

  // Check if item meets category or type rules of target zone
  const checkRuleCompatibility = (zone: SmartZone, item: FileItem): { allowed: boolean; reason?: string } => {
    const { rule } = zone;
    const ext = (item.extension || '').toLowerCase().replace(/^\./, '');

    if (rule.ruleType === 'extension' || (rule.ruleType === 'category' && rule.category === 'custom')) {
      const targetExts = (rule.extensions || []).map((e) => e.toLowerCase().trim().replace(/^\./, '')).filter(Boolean);
      if (targetExts.length > 0 && !targetExts.includes(ext)) {
        return {
          allowed: false,
          reason: `Khu vực này chỉ nhận các tệp có đuôi: ${targetExts.map((e) => '.' + e).join(', ')}`,
        };
      }
    }

    if (rule.ruleType === 'category') {
      if (rule.category === 'folders' && !item.isDir) {
        return { allowed: false, reason: 'Khu vực này chỉ nhận Thư mục' };
      }
      if (rule.category === 'archives' && !['zip', 'rar', '7z', 'tar', 'gz', 'exe', 'msi', 'iso', 'bat', 'cmd'].includes(ext)) {
        return { allowed: false, reason: 'Khu vực này chỉ nhận file nén/cài đặt (Zip, Rar, 7z, Exe)' };
      }
      if (rule.category === 'documents' && !['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'xlsx', 'pptx', 'csv'].includes(ext)) {
        return { allowed: false, reason: 'Khu vực này chỉ nhận Tài liệu văn bản (PDF, Word, Excel, Txt)' };
      }
      if (rule.category === 'images' && !['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico', 'psd', 'ai'].includes(ext)) {
        return { allowed: false, reason: 'Khu vực này chỉ nhận Hình ảnh' };
      }
      if (rule.category === 'media' && !['mp4', 'mkv', 'webm', 'mov', 'avi', 'mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
        return { allowed: false, reason: 'Khu vực này chỉ nhận Media (Video, Audio)' };
      }
      if (rule.category === 'code' && !['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'html', 'css', 'rs', 'cpp', 'sql'].includes(ext)) {
        return { allowed: false, reason: 'Khu vực này chỉ nhận File lập trình & mã nguồn' };
      }
    }

    return { allowed: true };
  };

  // Drag & drop item into zone (Transfers across zones, handles single or multiple items)
  const handleDropOnZone = (e: React.DragEvent, targetZoneId: string) => {
    e.preventDefault();
    setDragOverZoneId(null);

    const targetZone = zones.find((z) => z.id === targetZoneId);
    if (!targetZone) return;

    // Resolve dragged items list
    let draggedList: FileItem[] = [];
    if (draggedItems.length > 0) {
      draggedList = draggedItems;
    } else if (draggedItemPath) {
      const it = items.find((i) => i.path === draggedItemPath);
      if (it) draggedList = [it];
    } else {
      try {
        const raw = e.dataTransfer.getData('text/plain');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            draggedList = items.filter((it) => parsed.includes(it.path));
          } else if (typeof parsed === 'string') {
            const it = items.find((i) => i.path === parsed);
            if (it) draggedList = [it];
          }
        }
      } catch {
        const rawPath = e.dataTransfer.getData('text/plain');
        const it = items.find((i) => i.path === rawPath);
        if (it) draggedList = [it];
      }
    }

    if (draggedList.length === 0) return;

    const allowedPaths = draggedList.map((i) => i.path);

    // Update zones: remove from source zone manual list (if dragged between zones), and add to target zone
    const updatedZones = zones.map((z) => {
      if (draggedSourceZoneId && z.id === draggedSourceZoneId && z.id !== targetZoneId) {
        const prevManual = z.rule.manualItemPaths || [];
        return {
          ...z,
          rule: {
            ...z.rule,
            manualItemPaths: prevManual.filter((p) => !allowedPaths.includes(p)),
          },
        };
      }
      if (z.id === targetZoneId) {
        const prevManual = z.rule.manualItemPaths || [];
        const combined = [...prevManual];
        for (const p of allowedPaths) {
          if (!combined.includes(p)) combined.push(p);
        }
        return {
          ...z,
          rule: {
            ...z.rule,
            manualItemPaths: combined,
          },
        };
      }
      return z;
    });

    onUpdateZones(updatedZones);

    if (draggedList.length === 1) {
      setDragDropFeedback(`Đã chuyển "${draggedList[0].name}" vào hộp "${targetZone.name}"`);
    } else {
      setDragDropFeedback(`Đã chuyển ${draggedList.length} tệp vào hộp "${targetZone.name}"`);
    }
    setTimeout(() => setDragDropFeedback(null), 3000);

    setDraggedItems([]);
    setDraggedItemPath(null);
    setDraggedSourceZoneId(null);
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

  if (!currentPath) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400">
        <FolderOpen className="w-16 h-16 mb-4 text-neutral-300 stroke-[1.25]" />
        <h3 className="text-base font-medium text-neutral-700 mb-1">Chưa chọn thư mục</h3>
        <p className="text-xs text-neutral-500 mb-4 text-center max-w-sm">
          Mở một thư mục bất kỳ trên máy tính để trải nghiệm xem các file tự động gom vào các hộp khu vực thông minh.
        </p>
        <button
          onClick={onOpenFolderPicker}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
        >
          Chọn thư mục trên máy
        </button>
      </div>
    );
  }

  const renderZoneBox = (zone: SmartZone, isFreeform: boolean) => {
    const zoneItems = zoneFileMap.get(zone.id) || [];
    const colorCfg = COLOR_STYLES[zone.color] || COLOR_STYLES.blue;
    const totalBytes = zoneItems.reduce((acc, it) => acc + (it.size || 0), 0);
    const isEditing = editingZoneId === zone.id;
    const index = zones.indexOf(zone);
    const layout = getZoneLayout(zone, index);
    const isBeingDragged = draggingZoneId === zone.id;
    const isBeingResized = resizingZoneId === zone.id;

    return (
      <div
        key={zone.id}
        id={`zone-box-${zone.id}`}
        data-zone-box={zone.id}
        onContextMenu={(e) => handleBackgroundContextMenu(e, zone.id)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (dragOverZoneId !== zone.id) setDragOverZoneId(zone.id);
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOverZoneId(null);
        }}
        onDrop={(e) => handleDropOnZone(e, zone.id)}
        style={
          isFreeform
            ? {
                position: 'absolute',
                left: `${layout.x}px`,
                top: `${layout.y}px`,
                width: `${layout.width}px`,
                height: `${layout.height}px`,
                zIndex: isBeingDragged ? 50 : isBeingResized ? 45 : 10,
              }
            : undefined
        }
        className={`flex flex-col bg-white rounded-xl border ${colorCfg.border} shadow-xs transition-all ${
          isFreeform
            ? `overflow-hidden ${
                isBeingDragged
                  ? 'ring-2 ring-blue-500 shadow-2xl opacity-95'
                  : isBeingResized
                  ? 'ring-2 ring-amber-500 shadow-xl'
                  : isEditMode
                  ? 'hover:ring-1 hover:ring-blue-400 border-dashed'
                  : ''
              }`
            : `${WIDTH_CLASSES[zone.width] || WIDTH_CLASSES['col-1']} ${
                dragOverZoneId === zone.id
                  ? 'ring-2 ring-blue-500 bg-blue-50/20 border-blue-400 scale-[1.01]'
                  : ''
              }`
        }`}
      >
        {/* Box Header */}
        <div
          data-zone-header={zone.id}
          onMouseDown={(e) => {
            if (isFreeform && isEditMode) {
              handleZoneDragStart(e, zone.id);
            }
          }}
          className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-xl border-b border-neutral-200/70 ${colorCfg.headerBg} transition-colors ${
            isFreeform && isEditMode ? 'cursor-move select-none' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {isFreeform && isEditMode && (
              <GripHorizontal className="w-3.5 h-3.5 text-neutral-500 shrink-0" />
            )}
            <span className={`w-2.5 h-2.5 rounded-full ${colorCfg.dot} shrink-0`} />
            <span className="font-semibold text-xs truncate">{zone.name}</span>
            {isFreeform && isEditMode && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200 shrink-0">
                {layout.width}×{layout.height}px
              </span>
            )}
            {(zone.rule.ruleType === 'extension' || (zone.rule.ruleType === 'category' && zone.rule.category === 'custom')) &&
              zone.rule.extensions &&
              zone.rule.extensions.length > 0 && (
                <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/5 text-neutral-700 font-mono shrink-0 max-w-[120px] truncate">
                  .{zone.rule.extensions.slice(0, 3).join(', .')}
                  {zone.rule.extensions.length > 3 ? ` +${zone.rule.extensions.length - 3}` : ''}
                </span>
              )}
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${colorCfg.badgeBg} ${colorCfg.badgeText} shrink-0`}
            >
              {zoneItems.length} mục {zoneItems.length > 0 && `• ${formatBytes(totalBytes)}`}
            </span>
          </div>

          {/* Header Controls */}
          <div className="flex items-center gap-1 shrink-0 ml-2">
            {isFreeform && isEditMode && (
              <button
                onClick={(e) => handleResetZoneSize(e, zone.id)}
                title="Đặt lại kích thước chuẩn (380×340)"
                className="p-1 text-neutral-500 hover:text-neutral-900 rounded-md hover:bg-black/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              onClick={() => setEditingZoneId(isEditing ? null : zone.id)}
              title="Cài đặt khu vực"
              className="p-1 text-neutral-500 hover:text-neutral-900 rounded-md hover:bg-black/5 transition-colors"
            >
              <Settings2 className="w-3.5 h-3.5" />
            </button>

            <button
              onClick={() => handleToggleCollapse(zone.id)}
              title={zone.collapsed ? 'Mở rộng' : 'Thu gọn'}
              className="p-1 text-neutral-500 hover:text-neutral-900 rounded-md hover:bg-black/5 transition-colors"
            >
              {zone.collapsed ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronUp className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        </div>

        {/* Inline Quick Settings Drawer */}
        {isEditing && (
          <div className="p-3 bg-neutral-50/90 border-b border-neutral-200 text-xs space-y-3 animate-in fade-in overflow-y-auto max-h-[280px]">
            <div className="flex items-center justify-between">
              <span className="font-medium text-neutral-700">Tùy chỉnh hộp:</span>
              <button
                onClick={() => handleDeleteZone(zone.id)}
                className="flex items-center gap-1 text-rose-600 hover:text-rose-700 text-[11px]"
              >
                <Trash2 className="w-3 h-3" />
                Xóa hộp này
              </button>
            </div>

            {/* Rename */}
            <div>
              <label className="text-[11px] text-neutral-500 block mb-1">Tên hộp:</label>
              <input
                type="text"
                value={zone.name}
                onChange={(e) => handleUpdateZone(zone.id, { name: e.target.value })}
                className="w-full px-2.5 py-1 bg-white border border-neutral-300 rounded-md text-xs font-medium"
              />
            </div>

            {/* Width or Freeform dimensions */}
            {isFreeform ? (
              <div>
                <label className="text-[11px] text-neutral-500 block mb-1">Kích thước tự do (W × H):</label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs px-2 py-1 bg-white border border-neutral-300 rounded-md text-neutral-700 font-semibold">
                    {layout.width} × {layout.height} px
                  </span>
                  <button
                    onClick={(e) => handleResetZoneSize(e, zone.id)}
                    className="px-2 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded text-[11px] transition-colors"
                  >
                    Chuẩn (380×340)
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[11px] text-neutral-500 block mb-1">Độ rộng khung lưới:</label>
                <div className="grid grid-cols-4 gap-1">
                  {(['col-1', 'col-2', 'col-3', 'col-full'] as ZoneWidth[]).map((w) => (
                    <button
                      key={w}
                      onClick={() => handleUpdateZone(zone.id, { width: w })}
                      className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                        zone.width === w
                          ? 'bg-blue-50 border-blue-500 text-blue-700'
                          : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                      }`}
                    >
                      {w === 'col-1' ? 'Hẹp (1 cột)' : w === 'col-2' ? 'Vừa (2 cột)' : w === 'col-3' ? 'Rộng (3 cột)' : 'Toàn màn hình'}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color */}
            <div>
              <label className="text-[11px] text-neutral-500 block mb-1">Màu nhận diện:</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {(Object.keys(COLOR_STYLES) as ZoneColor[]).map((c) => (
                  <button
                    key={c}
                    onClick={() => handleUpdateZone(zone.id, { color: c })}
                    className={`w-6 h-6 rounded-full border-2 transition-all ${
                      COLOR_STYLES[c].dot
                    } ${zone.color === c ? 'scale-110 ring-2 ring-offset-1 ring-blue-500 border-white' : 'border-transparent opacity-80 hover:opacity-100'}`}
                  />
                ))}
              </div>
            </div>

            {/* Display style */}
            <div>
              <label className="text-[11px] text-neutral-500 block mb-1">Kiểu hiển thị tệp:</label>
              <div className="grid grid-cols-3 gap-1">
                {(['icons', 'compact', 'details'] as ZoneDisplayStyle[]).map((st) => (
                  <button
                    key={st}
                    onClick={() => handleUpdateZone(zone.id, { displayStyle: st })}
                    className={`px-2 py-1 rounded text-[10px] font-medium border transition-colors ${
                      zone.displayStyle === st
                        ? 'bg-blue-50 border-blue-500 text-blue-700'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    {st === 'icons' ? 'Biểu tượng lớn' : st === 'compact' ? 'Danh sách gọn' : 'Chi tiết'}
                  </button>
                ))}
              </div>
            </div>

            {/* Rule Configuration */}
            <div className="pt-1 border-t border-neutral-200/80 space-y-2">
              <div>
                <label className="text-[11px] text-neutral-500 block mb-1">Quy tắc tự gom file:</label>
                <select
                  value={zone.rule.ruleType}
                  onChange={(e) => {
                    const newType = e.target.value as ZoneRuleType;
                    const existingExts = zone.rule.extensions && zone.rule.extensions.length > 0 ? zone.rule.extensions : ['wav'];
                    handleUpdateZone(zone.id, {
                      rule: {
                        ruleType: newType,
                        recentHours: newType === 'recent' ? 24 : undefined,
                        category: newType === 'category' ? 'archives' : undefined,
                        extensions: newType === 'extension' ? existingExts : undefined,
                        customExtensionsInput: newType === 'extension' ? (zone.rule.customExtensionsInput || existingExts.join(', ')) : undefined,
                        manualItemPaths: newType === 'manual' ? [] : undefined,
                      },
                    });
                  }}
                  className="w-full px-2 py-1 bg-white border border-neutral-300 rounded-md text-xs font-medium"
                >
                  <option value="extension">🎯 Theo đuôi tệp cụ thể (.wav, .mp3, .psd...)</option>
                  <option value="category">📦 Nhóm định dạng (Nén, Tài liệu, Media...)</option>
                  <option value="recent">⚡ Mới tải về / Cập nhật gần đây</option>
                  <option value="keyword">🏷️ Theo từ khóa tên file</option>
                  <option value="size">⚖️ Dung lượng lớn (&gt;50MB)</option>
                  <option value="manual">✋ Kéo thả phân bộ thủ công</option>
                </select>
              </div>

              {(zone.rule.ruleType === 'extension' || (zone.rule.ruleType === 'category' && zone.rule.category === 'custom')) && (
                <div className="p-2 bg-white rounded-lg border border-neutral-200 space-y-1.5">
                  <label className="text-[11px] font-medium text-neutral-700 block">
                    Đuôi tệp cần gom (phân cách bằng dấu phẩy):
                  </label>
                  <input
                    type="text"
                    value={zone.rule.customExtensionsInput ?? (zone.rule.extensions || []).join(', ')}
                    onChange={(e) => {
                      const raw = e.target.value;
                      const parsed = parseExtensionsInput(raw);
                      handleUpdateZone(zone.id, {
                        rule: {
                          ...zone.rule,
                          customExtensionsInput: raw,
                          extensions: parsed,
                        },
                      });
                    }}
                    placeholder="ví dụ: wav, mp3, flac, aac"
                    className="w-full px-2.5 py-1.5 bg-neutral-50 border border-neutral-300 rounded-md text-xs font-mono font-medium focus:bg-white focus:border-blue-500 focus:outline-hidden"
                  />
                  <div className="pt-1">
                    <span className="text-[10px] text-neutral-400 block mb-1">Gợi ý nhanh (nhấn để bật/tắt):</span>
                    <div className="flex flex-wrap gap-1">
                      {COMMON_EXTENSIONS.map((ext) => {
                        const isCurrentActive = (zone.rule.extensions || []).includes(ext);
                        return (
                          <button
                            key={ext}
                            type="button"
                            onClick={() => {
                              const nextInput = toggleExtensionInInput(
                                zone.rule.customExtensionsInput ?? (zone.rule.extensions || []).join(', '),
                                ext
                              );
                              const parsed = parseExtensionsInput(nextInput);
                              handleUpdateZone(zone.id, {
                                rule: {
                                  ...zone.rule,
                                  customExtensionsInput: nextInput,
                                  extensions: parsed,
                                },
                              });
                            }}
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors border ${
                              isCurrentActive
                                ? 'bg-blue-600 text-white border-blue-600 font-bold'
                                : 'bg-neutral-100 text-neutral-600 border-neutral-200 hover:bg-neutral-200'
                            }`}
                          >
                            .{ext}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Zone Content / File Items */}
        {!zone.collapsed && (
          <div
            onContextMenu={(e) => handleBackgroundContextMenu(e, zone.id)}
            className={`p-2 overflow-y-auto ${isFreeform ? 'flex-1 min-h-0' : 'min-h-[120px] max-h-[420px]'}`}
          >
            {zoneItems.length === 0 ? (
              <div className="h-28 flex flex-col items-center justify-center text-neutral-400 text-center p-3 border-2 border-dashed border-neutral-100 rounded-lg">
                <Sparkles className="w-5 h-5 mb-1 text-neutral-300 stroke-[1.5]" />
                <span className="text-[11px]">Chưa có file nào khớp với hộp này</span>
                <span className="text-[10px] text-neutral-400 mt-0.5">
                  {(zone.rule.ruleType === 'extension' || (zone.rule.ruleType === 'category' && zone.rule.category === 'custom')) &&
                  zone.rule.extensions &&
                  zone.rule.extensions.length > 0
                    ? `Hộp đang gom các tệp đuôi: .${zone.rule.extensions.join(', .')}`
                    : 'Kéo file thả vào đây hoặc đợi file mới xuất hiện'}
                </span>
              </div>
            ) : (
              <div
                className={
                  zone.displayStyle === 'icons'
                    ? 'grid grid-cols-3 sm:grid-cols-4 gap-2'
                    : zone.displayStyle === 'cards'
                    ? 'grid grid-cols-1 sm:grid-cols-2 gap-2'
                    : 'space-y-1'
                }
              >
                {zoneItems.map((item) => {
                  const isSelected = selectedItems.some((s) => s.id === item.id);
                  const isCut = clipboard?.action === 'cut' && clipboard.items.some((i) => i.id === item.id);
                  const isFolderDragOver = item.isDir && dragOverFolderId === item.id;

                  if (zone.displayStyle === 'icons') {
                    return (
                      <div
                        key={item.id}
                        data-item-id={item.id}
                        draggable
                        onDragStart={(e) => handleItemDragStart(e, item, zone.id)}
                        onDragEnd={handleItemDragEnd}
                        onDragOver={(e) => {
                          if (item.isDir) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverFolderId !== item.id) setDragOverFolderId(item.id);
                          }
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          if (item.isDir && dragOverFolderId === item.id) setDragOverFolderId(null);
                        }}
                        onDrop={(e) => {
                          if (item.isDir) handleDropOnFolder(e, item);
                        }}
                        onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey, e.shiftKey)}
                        onDoubleClick={() => onOpenItem(item)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onContextMenu(e, item, zone.id);
                        }}
                        className={`flex flex-col items-center text-center p-2 rounded-lg cursor-pointer border transition-all relative ${
                          isCut ? 'opacity-50' : ''
                        } ${
                          isFolderDragOver
                            ? 'bg-blue-100/90 border-blue-500 ring-2 ring-blue-500 text-blue-900 shadow-md font-semibold'
                            : isSelected
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                            : 'bg-white hover:bg-neutral-50/80 border-transparent hover:border-neutral-200'
                        }`}
                      >
                        <div className="w-10 h-10 flex items-center justify-center mb-1">
                          {getFileIcon(item)}
                        </div>
                        <span className="text-xs font-medium text-neutral-800 line-clamp-2 break-all max-w-[110px]">
                          {item.name}
                        </span>
                        {isFolderDragOver && (
                          <span className="text-[9px] text-blue-700 bg-white/90 px-1 py-0.2 rounded border border-blue-300 mt-1 font-medium">
                            Thả vào
                          </span>
                        )}
                      </div>
                    );
                  }

                  if (zone.displayStyle === 'cards') {
                    return (
                      <div
                        key={item.id}
                        data-item-id={item.id}
                        draggable
                        onDragStart={(e) => handleItemDragStart(e, item, zone.id)}
                        onDragEnd={handleItemDragEnd}
                        onDragOver={(e) => {
                          if (item.isDir) {
                            e.preventDefault();
                            e.stopPropagation();
                            e.dataTransfer.dropEffect = 'move';
                            if (dragOverFolderId !== item.id) setDragOverFolderId(item.id);
                          }
                        }}
                        onDragLeave={(e) => {
                          if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                          if (item.isDir && dragOverFolderId === item.id) setDragOverFolderId(null);
                        }}
                        onDrop={(e) => {
                          if (item.isDir) handleDropOnFolder(e, item);
                        }}
                        onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey, e.shiftKey)}
                        onDoubleClick={() => onOpenItem(item)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onContextMenu(e, item, zone.id);
                        }}
                        className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-all relative ${
                          isCut ? 'opacity-50' : ''
                        } ${
                          isFolderDragOver
                            ? 'bg-blue-100/90 border-blue-500 ring-2 ring-blue-500 shadow-md'
                            : isSelected
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300'
                            : 'bg-neutral-50/50 hover:bg-neutral-100/70 border-neutral-200/60'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-md bg-white border border-neutral-200/60 flex items-center justify-center shrink-0">
                          {getFileIcon(item)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-medium text-neutral-800 truncate">{item.name}</div>
                          <div className="text-[10px] text-neutral-400 flex items-center gap-2">
                            <span>{item.isDir ? 'Folder' : formatBytes(item.size)}</span>
                            {isFolderDragOver && (
                              <span className="text-[9px] text-blue-700 bg-white/90 px-1 py-0.2 rounded border border-blue-300 font-medium">
                                Thả vào thư mục
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // compact & details
                  return (
                    <div
                      key={item.id}
                      data-item-id={item.id}
                      draggable
                      onDragStart={(e) => handleItemDragStart(e, item, zone.id)}
                      onDragEnd={handleItemDragEnd}
                      onDragOver={(e) => {
                        if (item.isDir) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.dataTransfer.dropEffect = 'move';
                          if (dragOverFolderId !== item.id) setDragOverFolderId(item.id);
                        }
                      }}
                      onDragLeave={(e) => {
                        if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                        if (item.isDir && dragOverFolderId === item.id) setDragOverFolderId(null);
                      }}
                      onDrop={(e) => {
                        if (item.isDir) handleDropOnFolder(e, item);
                      }}
                      onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey, e.shiftKey)}
                      onDoubleClick={() => onOpenItem(item)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onContextMenu(e, item, zone.id);
                      }}
                      className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer select-none transition-all ${
                        isCut ? 'opacity-50' : ''
                      } ${
                        isFolderDragOver
                          ? 'bg-blue-100 text-blue-900 border-2 border-blue-500 font-semibold shadow-xs'
                          : isSelected
                          ? 'bg-blue-50 text-blue-900 border border-blue-300'
                          : 'hover:bg-neutral-100/80 text-neutral-800 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                        {getFileIcon(item)}
                        <span className="truncate text-[11px] font-medium">{item.name}</span>
                        {isFolderDragOver && (
                          <span className="text-[10px] text-blue-700 bg-white/80 px-1 py-0.2 rounded border border-blue-300">
                            Thả vào thư mục
                          </span>
                        )}
                      </div>

                      {zone.displayStyle === 'details' && (
                        <div className="flex items-center gap-3 shrink-0 text-[10px] text-neutral-500">
                          <span>{item.isDir ? 'Folder' : formatBytes(item.size)}</span>
                          <span>{new Date(item.modifiedMs).toLocaleDateString()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Resize handle in Freeform edit mode */}
        {isFreeform && isEditMode && (
          <div
            data-resize-handle={zone.id}
            onMouseDown={(e) => handleResizeStart(e, zone.id)}
            title="Kéo góc này để thay đổi kích thước hộp"
            className="absolute bottom-1 right-1 w-6 h-6 cursor-se-resize flex items-center justify-center text-neutral-500 hover:text-blue-600 bg-white/90 hover:bg-blue-50 border border-neutral-300 rounded shadow-xs transition-all z-30"
          >
            <Maximize2 className="w-3.5 h-3.5 rotate-90" />
          </div>
        )}
      </div>
    );
  };

  const renderUnsortedBox = (isFreeform: boolean) => {
    if (unsortedItems.length === 0) return null;

    return (
      <div
        id="zone-box-unsorted"
        onContextMenu={(e) => handleBackgroundContextMenu(e)}
        onDragOver={(e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'copy';
          if (dragOverZoneId !== 'unsorted') setDragOverZoneId('unsorted');
        }}
        onDragLeave={(e) => {
          if (e.currentTarget === e.target) setDragOverZoneId(null);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOverZoneId(null);
          if (draggedSourceZoneId && draggedSourceZoneId !== 'unsorted') {
            const list = draggedItems.length > 0 ? draggedItems : items.filter((i) => i.path === draggedItemPath);
            const paths = list.map((i) => i.path);
            const updatedZones = zones.map((z) => {
              if (z.id === draggedSourceZoneId) {
                return {
                  ...z,
                  rule: {
                    ...z.rule,
                    manualItemPaths: (z.rule.manualItemPaths || []).filter((p) => !paths.includes(p)),
                  },
                };
              }
              return z;
            });
            onUpdateZones(updatedZones);
            setDragDropFeedback(`Đã chuyển ${list.length} tệp ra khỏi hộp`);
            setTimeout(() => setDragDropFeedback(null), 3000);
          }
          setDraggedItems([]);
          setDraggedItemPath(null);
          setDraggedSourceZoneId(null);
        }}
        className={`${isFreeform ? 'w-full' : 'col-span-12'} flex flex-col bg-white rounded-xl border border-dashed shadow-xs transition-all ${
          dragOverZoneId === 'unsorted'
            ? 'border-blue-500 bg-blue-50/20 ring-2 ring-blue-500'
            : 'border-neutral-300'
        }`}
      >
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-neutral-100/60 rounded-t-xl border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-neutral-400 shrink-0" />
            <span className="font-semibold text-xs text-neutral-700">Các file khác trong thư mục (Chưa vào hộp nào)</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-neutral-200 text-neutral-700 font-medium">
              {unsortedItems.length} mục
            </span>
          </div>
          <span className="text-[11px] text-neutral-400">
            Kéo thả file vào bất kỳ hộp phía trên để phân loại
          </span>
        </div>

        <div
          onContextMenu={(e) => handleBackgroundContextMenu(e)}
          className="p-2.5 max-h-[300px] overflow-y-auto grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2"
        >
          {unsortedItems.map((item) => {
            const isSelected = selectedItems.some((s) => s.id === item.id);
            const isCut = clipboard?.action === 'cut' && clipboard.items.some((i) => i.id === item.id);
            const isFolderDragOver = item.isDir && dragOverFolderId === item.id;

            return (
              <div
                key={item.id}
                data-item-id={item.id}
                draggable
                onDragStart={(e) => handleItemDragStart(e, item, 'unsorted')}
                onDragEnd={handleItemDragEnd}
                onDragOver={(e) => {
                  if (item.isDir) {
                    e.preventDefault();
                    e.stopPropagation();
                    e.dataTransfer.dropEffect = 'move';
                    if (dragOverFolderId !== item.id) setDragOverFolderId(item.id);
                  }
                }}
                onDragLeave={(e) => {
                  if (e.currentTarget.contains(e.relatedTarget as Node)) return;
                  if (item.isDir && dragOverFolderId === item.id) setDragOverFolderId(null);
                }}
                onDrop={(e) => {
                  if (item.isDir) handleDropOnFolder(e, item);
                }}
                onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey, e.shiftKey)}
                onDoubleClick={() => onOpenItem(item)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onContextMenu(e, item);
                }}
                className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer text-xs transition-all relative ${
                  isCut ? 'opacity-50' : ''
                } ${
                  isFolderDragOver
                    ? 'bg-blue-100/90 border-blue-500 ring-2 ring-blue-500 text-blue-900 shadow-sm font-semibold'
                    : isSelected
                    ? 'bg-blue-50 border-blue-300 text-blue-900 ring-1 ring-blue-300'
                    : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700'
                }`}
              >
                {getFileIcon(item)}
                <span className="truncate text-[11px]">{item.name}</span>
                {isFolderDragOver && (
                  <span className="text-[9px] text-blue-700 bg-white/90 px-1 py-0.2 rounded border border-blue-300 ml-auto shrink-0 font-medium">
                    Thả vào
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      id="smart-zones-container"
      onMouseDown={handleContainerMouseDown}
      onContextMenu={(e) => handleBackgroundContextMenu(e)}
      className="flex-1 flex flex-col h-full bg-neutral-50/60 overflow-y-auto p-4 space-y-4 select-none relative"
    >
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white px-3.5 py-2.5 rounded-xl border border-neutral-200/80 shadow-xs flex-wrap">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Layers className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <h2 className="text-sm font-semibold text-neutral-900">Khu Vực Thông Minh</h2>
            <span className="text-[11px] px-2 py-0.5 rounded-md bg-neutral-100 text-neutral-600 font-medium">
              {zones.length} hộp • {items.length} tệp
            </span>
            {isCustomFolderConfig && (
              <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200/80 font-medium">
                Tùy chỉnh riêng
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 flex-wrap">
          {/* Mode Switcher: Lưới Ngăn Nắp (Grid) vs Bố Cục Tự Do (Freeform) */}
          <div className="flex items-center bg-neutral-100 p-0.5 rounded-lg border border-neutral-200/80">
            <button
              id="btn-zones-mode-grid"
              onClick={() => {
                setLayoutMode('grid');
                setIsEditMode(false);
                onLayoutModeChange?.('grid');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                layoutMode === 'grid'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title="Lưới Ngăn Nắp: Tự động sắp xếp các hộp theo hàng và cột ngay ngắn"
            >
              <LayoutGrid className="w-3.5 h-3.5 text-blue-600" />
              <span>Lưới Ngăn Nắp</span>
            </button>

            <button
              id="btn-zones-mode-freeform"
              onClick={() => {
                setLayoutMode('freeform');
                onLayoutModeChange?.('freeform');
              }}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                layoutMode === 'freeform'
                  ? 'bg-white text-neutral-900 shadow-xs font-semibold'
                  : 'text-neutral-500 hover:text-neutral-800'
              }`}
              title="Bố Cục Tự Do: Tùy chỉnh vị trí và kích thước từng hộp theo ý muốn"
            >
              <Move className="w-3.5 h-3.5 text-amber-600" />
              <span>Bố Cục Tự Do</span>
            </button>
          </div>

          {/* Controls specific to Freeform Mode */}
          {layoutMode === 'freeform' && (
            <div className="flex items-center gap-1.5">
              <button
                id="btn-toggle-edit-mode"
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all shadow-xs ${
                  isEditMode
                    ? 'bg-amber-600 hover:bg-amber-700 text-white ring-2 ring-amber-400 font-semibold'
                    : 'bg-white hover:bg-neutral-100 text-neutral-700 border border-neutral-300'
                }`}
                title={
                  isEditMode
                    ? 'Khóa vị trí và lưu bố cục tự do'
                    : 'Bật chế độ chỉnh sửa để di chuyển và thay đổi kích thước hộp'
                }
              >
                {isEditMode ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                <span>{isEditMode ? 'Khóa & Hoàn Tất' : 'Chỉnh Sửa Bố Cục'}</span>
              </button>

              {isEditMode && (
                <>
                  <button
                    onClick={() => setSnapToGrid(!snapToGrid)}
                    className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      snapToGrid
                        ? 'bg-blue-50 border-blue-300 text-blue-700'
                        : 'bg-white border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                    title="Bám lưới 16px để căn chỉnh các hộp đều nhau"
                  >
                    <Grid className="w-3.5 h-3.5" />
                    <span>Bám lưới</span>
                  </button>

                  <button
                    onClick={handleAutoArrange}
                    className="flex items-center gap-1 px-2 py-1.5 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-lg text-xs font-medium text-neutral-600 transition-colors"
                    title="Tự động sắp xếp lại các hộp thẳng hàng trên canvas"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tự Căn Chỉnh</span>
                  </button>
                </>
              )}
            </div>
          )}

          {/* Reset per-folder configuration if modified */}
          {isCustomFolderConfig && onResetFolderZones && (
            <button
              id="btn-reset-folder-zones"
              onClick={() => setIsResetConfirmOpen(true)}
              title="Khôi phục các hộp khu vực về mặc định cho thư mục này"
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-600 hover:text-neutral-800 rounded-lg text-xs font-medium transition-colors border border-neutral-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Khôi phục mặc định</span>
            </button>
          )}

          <button
            id="btn-add-smart-zone"
            onClick={() => setIsAddZoneModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm Khu Vực</span>
          </button>
        </div>
      </div>

      {/* Freeform Edit Mode Banner */}
      {layoutMode === 'freeform' && isEditMode && (
        <div className="px-3.5 py-2.5 bg-amber-50/90 border border-amber-300 text-amber-900 text-xs rounded-xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse shrink-0" />
            <span className="font-semibold">Đang trong Chế độ Chỉnh sửa Bố Cục Tự Do:</span>
            <span>Kéo thanh tiêu đề hộp để di chuyển vị trí. Kéo góc dưới bên phải (◢) để thay đổi kích thước hộp theo ý muốn.</span>
          </div>
          <button
            onClick={() => setIsEditMode(false)}
            className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-semibold shadow-xs"
          >
            Khóa & Xong
          </button>
        </div>
      )}

      {/* Drag & Drop Feedback Toast */}
      {dragDropFeedback && (
        <div className="px-3 py-2 bg-blue-50 border border-blue-200 text-blue-800 text-xs rounded-lg flex items-center justify-between shadow-xs animate-in fade-in">
          <span>{dragDropFeedback}</span>
          <button
            onClick={() => setDragDropFeedback(null)}
            className="text-blue-500 hover:text-blue-800 p-0.5 rounded"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 2. Grid or Freeform Mode Canvas */}
      {layoutMode === 'freeform' ? (
        <div className="flex flex-col space-y-4">
          <div
            id="freeform-canvas-container"
            className="relative w-full min-h-[850px] min-w-[1100px] bg-white/60 rounded-xl border border-neutral-200/80 overflow-auto shadow-inner p-2"
            style={{
              backgroundImage: isEditMode
                ? 'radial-gradient(#94a3b8 1.2px, transparent 1.2px)'
                : 'radial-gradient(#cbd5e1 1px, transparent 1px)',
              backgroundSize: '16px 16px',
            }}
            onContextMenu={(e) => handleBackgroundContextMenu(e)}
          >
            {zones.map((zone) => renderZoneBox(zone, true))}
          </div>
          {renderUnsortedBox(true)}
        </div>
      ) : (
        <div className="grid grid-cols-12 gap-4" onContextMenu={(e) => handleBackgroundContextMenu(e)}>
          {zones.map((zone) => renderZoneBox(zone, false))}
          {renderUnsortedBox(false)}
        </div>
      )}

      {/* 4. Modal: Thêm Khu Vực Mới */}
      {isAddZoneModalOpen && (
        <div
          id="modal-create-smart-zone"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-neutral-200 max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-neutral-200 bg-neutral-50/70">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center">
                  <Plus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-900">Tạo Hộp Khu Vực Mới</h3>
                  <p className="text-[11px] text-neutral-500">Đặt tên, màu sắc và cơ chế tự động gom file</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddZoneModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg hover:bg-black/5"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Form */}
            <div className="p-5 space-y-4 text-xs">
              {/* Tên */}
              <div>
                <label className="font-medium text-neutral-700 block mb-1">Tên khu vực:</label>
                <input
                  type="text"
                  value={newZoneName}
                  onChange={(e) => setNewZoneName(e.target.value)}
                  placeholder="VD: File Mới Tải Về, Tài Liệu Dự Án, Nén & Giải Nén..."
                  className="w-full px-3 py-2 border border-neutral-300 rounded-lg text-xs focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-hidden"
                />
              </div>

              {/* Màu sắc */}
              <div>
                <label className="font-medium text-neutral-700 block mb-1.5">Màu đại diện:</label>
                <div className="flex items-center gap-2">
                  {(['blue', 'purple', 'emerald', 'amber', 'rose', 'cyan', 'indigo', 'slate'] as ZoneColor[]).map(
                    (col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewZoneColor(col)}
                        className={`w-7 h-7 rounded-full ${COLOR_STYLES[col].dot} flex items-center justify-center transition-all ${
                          newZoneColor === col ? 'ring-2 ring-offset-2 ring-neutral-900 scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {newZoneColor === col && <Check className="w-3.5 h-3.5 text-white" />}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Kích cỡ & Kiểu hiển thị */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-neutral-700 block mb-1">Kích cỡ hộp:</label>
                  <select
                    value={newZoneWidth}
                    onChange={(e) => setNewZoneWidth(e.target.value as ZoneWidth)}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                  >
                    <option value="col-1">1 Cột (Gọn)</option>
                    <option value="col-2">2 Cột (Vừa)</option>
                    <option value="col-3">3 Cột (Rộng)</option>
                    <option value="full">Toàn hàng (Full)</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-neutral-700 block mb-1">Kiểu hiển thị file:</label>
                  <select
                    value={newZoneDisplay}
                    onChange={(e) => setNewZoneDisplay(e.target.value as ZoneDisplayStyle)}
                    className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs"
                  >
                    <option value="compact">Danh sách gọn</option>
                    <option value="icons">Lưới biểu tượng</option>
                    <option value="details">Chi tiết (Dung lượng, ngày)</option>
                    <option value="cards">Thẻ xem trước</option>
                  </select>
                </div>
              </div>

              {/* Quy tắc gom file */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-3">
                <label className="font-semibold text-neutral-800 block text-xs">Quy tắc tự động gôm file:</label>
                <select
                  value={newZoneRuleType}
                  onChange={(e) => setNewZoneRuleType(e.target.value as ZoneRuleType)}
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-medium text-neutral-800"
                >
                  <option value="extension">🎯 Theo đuôi tệp cụ thể (.wav, .mp3, .psd, .blend...)</option>
                  <option value="category">📦 Theo nhóm định dạng (Nén, Tài liệu, Media, Thư mục...)</option>
                  <option value="recent">⚡ File mới tải về / sửa đổi gần đây</option>
                  <option value="keyword">🏷️ Tên file chứa từ khóa (VD: unzip, setup, project...)</option>
                  <option value="size">⚖️ Dung lượng lớn (&gt;50MB)</option>
                  <option value="manual">✋ Phân bộ thủ công (Kéo thả)</option>
                </select>

                {/* Granular Extension Selector */}
                {(newZoneRuleType === 'extension' || (newZoneRuleType === 'category' && newZoneCategory === 'custom')) && (
                  <div className="pt-1 space-y-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-neutral-700">
                          Nhập đuôi tệp muốn gom (bất kỳ loại nào):
                        </label>
                        <span className="text-[10px] text-neutral-400">Cách nhau bằng dấu phẩy</span>
                      </div>
                      <input
                        type="text"
                        value={newZoneCustomExtensions}
                        onChange={(e) => setNewZoneCustomExtensions(e.target.value)}
                        placeholder="VD: wav hoặc .wav, .mp3, .flac, .psd, .blend..."
                        className="w-full px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-mono focus:outline-blue-500 focus:border-blue-500 shadow-2xs"
                      />
                    </div>

                    {/* Active parsed tags */}
                    {parseExtensionsInput(newZoneCustomExtensions).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] text-neutral-500 font-medium">Đang chọn:</span>
                        {parseExtensionsInput(newZoneCustomExtensions).map((ext) => (
                          <span
                            key={ext}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 text-[11px] font-mono font-medium"
                          >
                            .{ext}
                            <button
                              type="button"
                              onClick={() => setNewZoneCustomExtensions(toggleExtensionInInput(newZoneCustomExtensions, ext))}
                              className="hover:text-blue-950 ml-0.5 cursor-pointer"
                              title={`Xóa đuôi .${ext}`}
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <button
                          type="button"
                          onClick={() => setNewZoneCustomExtensions('')}
                          className="text-[10px] text-neutral-400 hover:text-rose-600 underline ml-1 cursor-pointer"
                        >
                          Xóa hết
                        </button>
                      </div>
                    )}

                    {/* Quick Presets by Category */}
                    <div className="pt-2 border-t border-neutral-200/70 space-y-1.5">
                      <span className="text-[11px] font-medium text-neutral-600 block">
                        Hoặc bấm chọn nhanh các đuôi tệp phổ biến:
                      </span>
                      <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                        {QUICK_EXTENSION_PRESETS.map((preset) => {
                          const activeExts = parseExtensionsInput(newZoneCustomExtensions);
                          return (
                            <div key={preset.category} className="flex items-start gap-1.5 flex-wrap text-xs">
                              <span className="text-[10px] text-neutral-400 w-28 shrink-0 font-medium pt-0.5">
                                {preset.category}:
                              </span>
                              <div className="flex items-center gap-1 flex-wrap flex-1">
                                {preset.exts.map((ext) => {
                                  const isSelected = activeExts.includes(ext);
                                  return (
                                    <button
                                      key={ext}
                                      type="button"
                                      onClick={() =>
                                        setNewZoneCustomExtensions(
                                          toggleExtensionInInput(newZoneCustomExtensions, ext)
                                        )
                                      }
                                      className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors border cursor-pointer ${
                                        isSelected
                                          ? 'bg-blue-600 text-white border-blue-600 font-semibold shadow-2xs'
                                          : 'bg-white hover:bg-neutral-100 text-neutral-700 border-neutral-200'
                                      }`}
                                    >
                                      .{ext}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                {newZoneRuleType === 'recent' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-neutral-500 text-[11px]">Thời gian gần đây:</span>
                    <select
                      value={newZoneRecentHours}
                      onChange={(e) => setNewZoneRecentHours(Number(e.target.value))}
                      className="px-2 py-1 bg-white border border-neutral-300 rounded-md text-xs"
                    >
                      <option value={24}>Trong 24 giờ qua (1 ngày)</option>
                      <option value={72}>Trong 3 ngày qua</option>
                      <option value={168}>Trong 7 ngày qua</option>
                      <option value={720}>Trong 30 ngày qua</option>
                    </select>
                  </div>
                )}

                {newZoneRuleType === 'category' && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="text-neutral-500 text-[11px]">Chọn loại file:</span>
                    <select
                      value={newZoneCategory}
                      onChange={(e) =>
                        setNewZoneCategory(
                          e.target.value as 'documents' | 'images' | 'media' | 'archives' | 'folders' | 'code' | 'custom'
                        )
                      }
                      className="px-2 py-1 bg-white border border-neutral-300 rounded-md text-xs"
                    >
                      <option value="archives">File Nén & Cài Đặt (.zip, .rar, .7z, .exe...)</option>
                      <option value="documents">Tài Liệu Văn Phòng (.pdf, .docx, .txt, .xlsx...)</option>
                      <option value="images">Hình Ảnh (.png, .jpg, .webp, .svg...)</option>
                      <option value="media">Âm Thanh & Video (.mp4, .mp3, .mkv...)</option>
                      <option value="folders">Thư Mục Con (Subfolders)</option>
                      <option value="code">Mã Nguồn & Dự Án (.ts, .js, .py, .json...)</option>
                      <option value="custom">🎯 Tùy chọn đuôi tệp riêng (.wav, .psd, .flac...)</option>
                    </select>
                  </div>
                )}

                {newZoneRuleType === 'keyword' && (
                  <div className="pt-1">
                    <label className="text-neutral-500 text-[11px] block mb-1">Từ khóa trong tên file:</label>
                    <input
                      type="text"
                      value={newZoneKeyword}
                      onChange={(e) => setNewZoneKeyword(e.target.value)}
                      placeholder="VD: unzip, final, invoice, setup..."
                      className="w-full px-2.5 py-1 bg-white border border-neutral-300 rounded-md text-xs"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-neutral-200 bg-neutral-50">
              <button
                type="button"
                onClick={() => setIsAddZoneModalOpen(false)}
                className="px-3.5 py-1.5 text-xs text-neutral-600 hover:text-neutral-900 rounded-lg hover:bg-neutral-200/60"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleCreateZone}
                className="px-4 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-xs transition-colors"
              >
                Tạo Khu Vực
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reset Confirmation Modal */}
      {isResetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in duration-150"
          onClick={() => setIsResetConfirmOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl border border-neutral-200/90 w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="reset-confirm-title"
          >
            <div className="p-5">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center shrink-0">
                  <RotateCcw className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 id="reset-confirm-title" className="text-sm font-semibold text-neutral-900">
                    Khôi phục cấu hình mặc định?
                  </h3>
                  <p className="text-xs text-neutral-500 mt-1.5 leading-relaxed">
                    Các hộp khu vực bạn đã tạo thêm hoặc tùy chỉnh riêng cho thư mục này sẽ được đặt lại về danh sách mặc định. Bạn có chắc chắn muốn khôi phục không?
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 bg-neutral-50 border-t border-neutral-100">
              <button
                type="button"
                id="btn-cancel-reset"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-200/70 rounded-lg transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                id="btn-confirm-reset"
                onClick={() => {
                  if (onResetFolderZones) {
                    onResetFolderZones();
                  }
                  setIsResetConfirmOpen(false);
                }}
                className="px-4 py-1.5 text-xs font-medium bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow-xs transition-colors"
              >
                Khôi phục
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Selection lasso box overlay */}
      {renderMarqueeOverlay()}
    </div>
  );
}
