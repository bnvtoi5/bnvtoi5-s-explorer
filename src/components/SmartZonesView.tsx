import React, { useState, useMemo } from 'react';
import {
  FileItem,
  SmartZone,
  ZoneColor,
  ZoneWidth,
  ZoneDisplayStyle,
  ZoneRuleType,
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
} from 'lucide-react';

interface SmartZonesViewProps {
  items: FileItem[];
  currentPath: string;
  zones: SmartZone[];
  onUpdateZones: (zones: SmartZone[]) => void;
  selectedItems: FileItem[];
  onSelectItem: (item: FileItem, isMulti: boolean) => void;
  onOpenItem: (item: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | null) => void;
  onOpenFolderPicker: () => void;
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

export function SmartZonesView({
  items,
  currentPath,
  zones,
  onUpdateZones,
  selectedItems,
  onSelectItem,
  onOpenItem,
  onContextMenu,
  onOpenFolderPicker,
}: SmartZonesViewProps) {
  const [editingZoneId, setEditingZoneId] = useState<string | null>(null);
  const [isAddZoneModalOpen, setIsAddZoneModalOpen] = useState<boolean>(false);
  const [draggedItemPath, setDraggedItemPath] = useState<string | null>(null);

  // New Zone Modal Form State
  const [newZoneName, setNewZoneName] = useState('Khu vực mới');
  const [newZoneColor, setNewZoneColor] = useState<ZoneColor>('blue');
  const [newZoneWidth, setNewZoneWidth] = useState<ZoneWidth>('col-1');
  const [newZoneDisplay, setNewZoneDisplay] = useState<ZoneDisplayStyle>('compact');
  const [newZoneRuleType, setNewZoneRuleType] = useState<ZoneRuleType>('recent');
  const [newZoneRecentHours, setNewZoneRecentHours] = useState<number>(24);
  const [newZoneCategory, setNewZoneCategory] = useState<'documents' | 'images' | 'media' | 'archives' | 'folders' | 'code'>('archives');
  const [newZoneKeyword, setNewZoneKeyword] = useState<string>('');

  // Evaluate which files belong to each zone
  const { zoneFileMap, unsortedItems } = useMemo(() => {
    const map = new Map<string, FileItem[]>();
    const assignedPaths = new Set<string>();

    zones.forEach((z) => map.set(z.id, []));

    const now = Date.now();

    for (const item of items) {
      let matchedZoneId: string | null = null;

      for (const zone of zones) {
        const { rule } = zone;

        if (rule.ruleType === 'recent') {
          const thresholdMs = (rule.recentHours || 24) * 3600 * 1000;
          if (now - item.modifiedMs <= thresholdMs) {
            matchedZoneId = zone.id;
            break;
          }
        } else if (rule.ruleType === 'category') {
          const ext = (item.extension || '').toLowerCase();
          if (rule.category === 'folders' && item.isDir) {
            matchedZoneId = zone.id;
            break;
          }
          if (rule.category === 'documents' && ['pdf', 'doc', 'docx', 'txt', 'rtf', 'md', 'xlsx', 'pptx'].includes(ext)) {
            matchedZoneId = zone.id;
            break;
          }
          if (rule.category === 'images' && ['png', 'jpg', 'jpeg', 'webp', 'svg', 'gif', 'bmp', 'ico'].includes(ext)) {
            matchedZoneId = zone.id;
            break;
          }
          if (rule.category === 'media' && ['mp4', 'mkv', 'webm', 'mov', 'avi', 'mp3', 'wav', 'ogg'].includes(ext)) {
            matchedZoneId = zone.id;
            break;
          }
          if (rule.category === 'archives' && ['zip', 'rar', '7z', 'tar', 'gz', 'exe', 'msi', 'iso'].includes(ext)) {
            matchedZoneId = zone.id;
            break;
          }
          if (rule.category === 'code' && ['ts', 'tsx', 'js', 'jsx', 'json', 'py', 'html', 'css', 'rs'].includes(ext)) {
            matchedZoneId = zone.id;
            break;
          }
        } else if (rule.ruleType === 'keyword') {
          if (rule.keyword && item.name.toLowerCase().includes(rule.keyword.toLowerCase())) {
            matchedZoneId = zone.id;
            break;
          }
        } else if (rule.ruleType === 'size') {
          const minBytes = rule.minSizeBytes || 50 * 1024 * 1024;
          if (item.size >= minBytes) {
            matchedZoneId = zone.id;
            break;
          }
        } else if (rule.ruleType === 'manual') {
          if (rule.manualItemPaths && rule.manualItemPaths.includes(item.path)) {
            matchedZoneId = zone.id;
            break;
          }
        }
      }

      if (matchedZoneId) {
        map.get(matchedZoneId)?.push(item);
        assignedPaths.add(item.path);
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
    const newZone: SmartZone = {
      id: 'zone_' + Date.now(),
      name: newZoneName.trim() || 'Khu vực mới',
      color: newZoneColor,
      width: newZoneWidth,
      displayStyle: newZoneDisplay,
      collapsed: false,
      rule: {
        ruleType: newZoneRuleType,
        recentHours: newZoneRuleType === 'recent' ? newZoneRecentHours : undefined,
        category: newZoneRuleType === 'category' ? newZoneCategory : undefined,
        keyword: newZoneRuleType === 'keyword' ? newZoneKeyword.trim() : undefined,
        manualItemPaths: newZoneRuleType === 'manual' ? [] : undefined,
      },
    };

    onUpdateZones([...zones, newZone]);
    setIsAddZoneModalOpen(false);
  };

  // Drag & drop item into manual zone
  const handleDropOnZone = (e: React.DragEvent, targetZoneId: string) => {
    e.preventDefault();
    if (!draggedItemPath) return;

    const targetZone = zones.find((z) => z.id === targetZoneId);
    if (!targetZone) return;

    // Add path to target zone's manualItemPaths and set ruleType to manual if not already
    const currentPaths = targetZone.rule.manualItemPaths || [];
    if (!currentPaths.includes(draggedItemPath)) {
      handleUpdateZone(targetZoneId, {
        rule: {
          ...targetZone.rule,
          ruleType: 'manual',
          manualItemPaths: [...currentPaths, draggedItemPath],
        },
      });
    }
    setDraggedItemPath(null);
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

  return (
    <div
      id="smart-zones-container"
      className="flex-1 flex flex-col h-full bg-neutral-50/60 overflow-y-auto p-4 space-y-4"
    >
      {/* 1. Header Toolbar */}
      <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-neutral-200/80 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neutral-900">Khu Vực Thông Minh (Smart Zones)</h2>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-neutral-100 text-neutral-600 font-medium">
                {zones.length} hộp khu vực • {items.length} files
              </span>
            </div>
            <p className="text-[11px] text-neutral-500">
              Tự động phân nhóm và hiển thị file theo quy tắc: tải về, giải nén, tài liệu hoặc phân loại thủ công
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
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

      {/* 2. Grid of Zone Boxes */}
      <div className="grid grid-cols-12 gap-4">
        {zones.map((zone) => {
          const zoneItems = zoneFileMap.get(zone.id) || [];
          const colorCfg = COLOR_STYLES[zone.color] || COLOR_STYLES.blue;
          const totalBytes = zoneItems.reduce((acc, it) => acc + (it.size || 0), 0);
          const isEditing = editingZoneId === zone.id;

          return (
            <div
              key={zone.id}
              id={`zone-box-${zone.id}`}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropOnZone(e, zone.id)}
              className={`flex flex-col bg-white rounded-xl border ${colorCfg.border} shadow-xs transition-all ${
                WIDTH_CLASSES[zone.width] || WIDTH_CLASSES['col-1']
              }`}
            >
              {/* Box Header */}
              <div
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-t-xl border-b border-neutral-200/70 ${colorCfg.headerBg} transition-colors`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <span className={`w-2.5 h-2.5 rounded-full ${colorCfg.dot} shrink-0`} />
                  <span className="font-semibold text-xs truncate">{zone.name}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${colorCfg.badgeBg} ${colorCfg.badgeText} shrink-0`}
                  >
                    {zoneItems.length} mục {zoneItems.length > 0 && `• ${formatBytes(totalBytes)}`}
                  </span>
                </div>

                {/* Header Controls */}
                <div className="flex items-center gap-1 shrink-0 ml-2">
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
                <div className="p-3 bg-neutral-50/90 border-b border-neutral-200 text-xs space-y-3 animate-in fade-in">
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
                      className="w-full px-2.5 py-1 text-xs bg-white border border-neutral-300 rounded-md focus:outline-blue-500"
                    />
                  </div>

                  {/* Width & Display Style */}
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-neutral-500 block mb-1">Độ rộng hộp:</label>
                      <select
                        value={zone.width}
                        onChange={(e) => handleUpdateZone(zone.id, { width: e.target.value as ZoneWidth })}
                        className="w-full px-2 py-1 bg-white border border-neutral-300 rounded-md text-xs"
                      >
                        <option value="col-1">1 Cột (Nhỏ)</option>
                        <option value="col-2">2 Cột (Vừa)</option>
                        <option value="col-3">3 Cột (Lớn)</option>
                        <option value="full">Toàn hàng (Full)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-[11px] text-neutral-500 block mb-1">Kiểu hiển thị file:</label>
                      <select
                        value={zone.displayStyle}
                        onChange={(e) =>
                          handleUpdateZone(zone.id, { displayStyle: e.target.value as ZoneDisplayStyle })
                        }
                        className="w-full px-2 py-1 bg-white border border-neutral-300 rounded-md text-xs"
                      >
                        <option value="compact">Danh sách gọn</option>
                        <option value="icons">Lưới biểu tượng</option>
                        <option value="details">Chi tiết đầy đủ</option>
                        <option value="cards">Thẻ xem trước</option>
                      </select>
                    </div>
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="text-[11px] text-neutral-500 block mb-1.5">Màu sắc viền & header:</label>
                    <div className="flex items-center gap-1.5">
                      {(['blue', 'purple', 'emerald', 'amber', 'rose', 'cyan', 'indigo', 'slate'] as ZoneColor[]).map(
                        (col) => (
                          <button
                            key={col}
                            onClick={() => handleUpdateZone(zone.id, { color: col })}
                            className={`w-5 h-5 rounded-full ${COLOR_STYLES[col].dot} flex items-center justify-center transition-transform ${
                              zone.color === col ? 'ring-2 ring-offset-1 ring-neutral-900 scale-110' : 'opacity-70 hover:opacity-100'
                            }`}
                          >
                            {zone.color === col && <Check className="w-3 h-3 text-white" />}
                          </button>
                        )
                      )}
                    </div>
                  </div>

                  {/* Rule switcher */}
                  <div className="pt-2 border-t border-neutral-200/70">
                    <label className="text-[11px] text-neutral-500 block mb-1">Quy tắc tự gom file:</label>
                    <select
                      value={zone.rule.ruleType}
                      onChange={(e) => {
                        const newType = e.target.value as ZoneRuleType;
                        handleUpdateZone(zone.id, {
                          rule: {
                            ruleType: newType,
                            recentHours: newType === 'recent' ? 24 : undefined,
                            category: newType === 'category' ? 'archives' : undefined,
                            manualItemPaths: newType === 'manual' ? [] : undefined,
                          },
                        });
                      }}
                      className="w-full px-2 py-1 bg-white border border-neutral-300 rounded-md text-xs"
                    >
                      <option value="recent">Mới tải về / Cập nhật gần đây (24h/3d)</option>
                      <option value="category">Phân loại định dạng (Nén, Tài liệu, Media...)</option>
                      <option value="keyword">Theo từ khóa tên file (unzip, project...)</option>
                      <option value="size">Dung lượng lớn (&gt;50MB)</option>
                      <option value="manual">Kéo thả phân bộ thủ công</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Box Body / File Container */}
              {!zone.collapsed && (
                <div className="p-2 min-h-[120px] max-h-[420px] overflow-y-auto">
                  {zoneItems.length === 0 ? (
                    <div className="h-28 flex flex-col items-center justify-center text-neutral-400 text-center p-3 border-2 border-dashed border-neutral-100 rounded-lg">
                      <Sparkles className="w-5 h-5 mb-1 text-neutral-300 stroke-[1.5]" />
                      <span className="text-[11px]">Chưa có file nào khớp với hộp này</span>
                      <span className="text-[10px] text-neutral-400 mt-0.5">
                        Kéo file thả vào đây hoặc đợi file mới xuất hiện
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

                        if (zone.displayStyle === 'icons') {
                          return (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={() => setDraggedItemPath(item.path)}
                              onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey)}
                              onDoubleClick={() => onOpenItem(item)}
                              onContextMenu={(e) => onContextMenu(e, item)}
                              className={`flex flex-col items-center text-center p-2 rounded-lg cursor-pointer border transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'hover:bg-neutral-50 border-transparent'
                              }`}
                            >
                              <div className="w-8 h-8 flex items-center justify-center mb-1">
                                {getFileIcon(item)}
                              </div>
                              <span className="text-[11px] text-neutral-800 line-clamp-2 w-full break-all leading-tight">
                                {item.name}
                              </span>
                            </div>
                          );
                        }

                        if (zone.displayStyle === 'cards') {
                          return (
                            <div
                              key={item.id}
                              draggable
                              onDragStart={() => setDraggedItemPath(item.path)}
                              onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey)}
                              onDoubleClick={() => onOpenItem(item)}
                              onContextMenu={(e) => onContextMenu(e, item)}
                              className={`flex items-center gap-2.5 p-2 rounded-lg border cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-blue-50 border-blue-300'
                                  : 'bg-neutral-50/50 hover:bg-neutral-100/70 border-neutral-200/60'
                              }`}
                            >
                              <div className="w-7 h-7 rounded-md bg-white border border-neutral-200/60 flex items-center justify-center shrink-0">
                                {getFileIcon(item)}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="text-xs font-medium text-neutral-800 truncate">{item.name}</div>
                                <div className="text-[10px] text-neutral-500">
                                  {item.isDir ? 'Thư mục' : formatBytes(item.size)}
                                </div>
                              </div>
                            </div>
                          );
                        }

                        // Compact or Details
                        return (
                          <div
                            key={item.id}
                            draggable
                            onDragStart={() => setDraggedItemPath(item.path)}
                            onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey)}
                            onDoubleClick={() => onOpenItem(item)}
                            onContextMenu={(e) => onContextMenu(e, item)}
                            className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs cursor-pointer select-none transition-colors ${
                              isSelected
                                ? 'bg-blue-50 text-blue-900 border border-blue-200'
                                : 'hover:bg-neutral-100/80 text-neutral-800'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                              {getFileIcon(item)}
                              <span className="truncate text-[11px] font-medium">{item.name}</span>
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
            </div>
          );
        })}

        {/* 3. Unsorted / Other Files Box */}
        {unsortedItems.length > 0 && (
          <div
            id="zone-box-unsorted"
            className="col-span-12 flex flex-col bg-white rounded-xl border border-dashed border-neutral-300 shadow-xs"
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

            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2 max-h-[220px] overflow-y-auto">
              {unsortedItems.map((item) => {
                const isSelected = selectedItems.some((s) => s.id === item.id);
                return (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => setDraggedItemPath(item.path)}
                    onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey)}
                    onDoubleClick={() => onOpenItem(item)}
                    onContextMenu={(e) => onContextMenu(e, item)}
                    className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer text-xs transition-colors ${
                      isSelected
                        ? 'bg-blue-50 border-blue-300 text-blue-900'
                        : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-700'
                    }`}
                  >
                    {getFileIcon(item)}
                    <span className="truncate text-[11px]">{item.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

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
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200/80 space-y-2.5">
                <label className="font-semibold text-neutral-800 block">Quy tắc tự động gôm file:</label>
                <select
                  value={newZoneRuleType}
                  onChange={(e) => setNewZoneRuleType(e.target.value as ZoneRuleType)}
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-medium text-neutral-800"
                >
                  <option value="recent">⚡ File mới tải về / sửa đổi gần đây</option>
                  <option value="category">📦 Theo định dạng (Nén, Tài liệu, Media, Thư mục, Code...)</option>
                  <option value="keyword">🏷️ Tên file chứa từ khóa (VD: unzip, setup, project...)</option>
                  <option value="size">⚖️ Dung lượng lớn (&gt;50MB)</option>
                  <option value="manual">✋ Phân bộ thủ công (Kéo thả)</option>
                </select>

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
                          e.target.value as 'documents' | 'images' | 'media' | 'archives' | 'folders' | 'code'
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
    </div>
  );
}
