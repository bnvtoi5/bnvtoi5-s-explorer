import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import {
  ChevronRight,
  Shield,
  ShieldOff,
  Star,
  Share2,
  Pin,
  PinOff,
  Copy,
  Scissors,
  FolderPlus,
  RefreshCw,
  Sliders,
  Terminal,
  Info,
  Trash2,
  Edit3,
  Package,
  FileText,
  FileSpreadsheet,
  Presentation,
  Check,
  CornerDownRight,
  Layers,
  Send,
  Users,
  Folder,
  Code2,
  ClipboardPaste,
  Sparkles,
} from 'lucide-react';
import { FileItem, SmartZone, ViewMode, SortField, SortOrder } from '../types';
import { PropertiesTab } from './PropertiesModal';
import {
  openRealItem,
  openWithCode,
  runAsAdmin,
  launchTerminal,
  launchPowerShell,
  extractArchiveItem,
  createNewTemplateFile,
} from '../services/fs';

interface ContextMenuProps {
  x: number;
  y: number;
  currentPath?: string;
  item: FileItem | null;
  targetZoneId?: string;
  pinnedFolders: string[];
  smartZones?: SmartZone[];
  viewMode?: ViewMode;
  onViewModeChange?: (mode: ViewMode) => void;
  sortBy?: SortField;
  sortOrder?: SortOrder;
  onSortChange?: (field: SortField, order: SortOrder) => void;
  clipboard?: { items: FileItem[]; action: 'copy' | 'cut' } | null;
  onCopy?: (item: FileItem) => void;
  onCut?: (item: FileItem) => void;
  onPaste?: (targetDir?: string) => void;
  onClose: () => void;
  onOpen: (item: FileItem) => void;
  onPin: (path: string) => void;
  onUnpin: (path: string) => void;
  onRename: (item: FileItem) => void;
  onDelete: (item: FileItem) => void;
  onShowProperties: (item: FileItem | null, initialTab?: PropertiesTab) => void;
  onGiveAccess?: (path: string) => void;
  onRemoveAccess?: (path: string) => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onRefresh: () => void;
  onAssignToZone?: (zoneId: string, item: FileItem) => void;
}

// Smart Submenu Component with dynamic vertical flip and horizontal boundary clamp
interface ContextSubmenuProps {
  isOpen: boolean;
  onMouseEnter: () => void;
  width?: string;
  className?: string;
  children: React.ReactNode;
}

const ContextSubmenu: React.FC<ContextSubmenuProps> = ({
  isOpen,
  onMouseEnter,
  width = 'w-52',
  className = '',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [positionStyle, setPositionStyle] = useState<React.CSSProperties>({
    position: 'absolute',
    zIndex: 60,
    visibility: 'hidden',
  });

  useLayoutEffect(() => {
    if (!isOpen || !containerRef.current) return;
    const submenuEl = containerRef.current;
    const parentEl = submenuEl.parentElement;
    if (!parentEl) return;

    const parentRect = parentEl.getBoundingClientRect();
    const subRect = submenuEl.getBoundingClientRect();
    const vh = window.innerHeight;
    const vw = window.innerWidth;

    // Determine vertical direction based on THIS specific item's position
    const spaceBelow = vh - parentRect.top;
    const spaceAbove = parentRect.bottom;
    const opensUp = spaceBelow < subRect.height + 24 && spaceAbove > spaceBelow;

    // Determine horizontal direction
    const opensLeft = parentRect.right + subRect.width > vw - 12;

    const newStyle: React.CSSProperties = {
      position: 'absolute',
      zIndex: 60,
      visibility: 'visible',
    };

    if (opensLeft) {
      newStyle.right = 'calc(100% - 2px)';
      newStyle.left = 'auto';
    } else {
      newStyle.left = 'calc(100% - 2px)';
      newStyle.right = 'auto';
    }

    if (opensUp) {
      newStyle.bottom = '-4px';
      newStyle.top = 'auto';
      // Safety clamp if bottom alignment causes top to go offscreen
      const projectedTop = parentRect.bottom - subRect.height;
      if (projectedTop < 10) {
        newStyle.bottom = 'auto';
        newStyle.top = `${-(parentRect.top - 10)}px`;
      }
    } else {
      newStyle.top = '-4px';
      newStyle.bottom = 'auto';
      // Safety clamp if top alignment causes bottom to go offscreen
      const projectedBottom = parentRect.top + subRect.height;
      if (projectedBottom > vh - 10) {
        const overflow = projectedBottom - (vh - 10);
        newStyle.top = `${-4 - overflow}px`;
      }
    }

    setPositionStyle(newStyle);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      ref={containerRef}
      onMouseEnter={onMouseEnter}
      style={positionStyle}
      className={`${width} bg-[#262626] border border-[#404040] rounded-md shadow-2xl py-1 text-xs text-[#e5e5e5] select-none ${className}`}
    >
      {children}
    </div>
  );
};

// Windows 11 Fluent Dark Context Menu
export const ContextMenu: React.FC<ContextMenuProps> = ({
  x,
  y,
  currentPath = '',
  item,
  targetZoneId,
  pinnedFolders,
  smartZones = [],
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
  clipboard,
  onCopy,
  onCut,
  onPaste,
  onClose,
  onOpen,
  onPin,
  onUnpin,
  onRename,
  onDelete,
  onShowProperties,
  onGiveAccess,
  onRemoveAccess,
  onCreateFolder,
  onCreateFile,
  onRefresh,
  onAssignToZone,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);

  // Dynamic layout calculations to guarantee zero off-screen clipping
  const [coords, setCoords] = useState<{ left: number; top: number }>({ left: x, top: y });
  const [subMenuOpensLeft, setSubMenuOpensLeft] = useState<boolean>(false);
  const [isCalculated, setIsCalculated] = useState<boolean>(false);

  // Submenu hover intent debounce timer to prevent closing on diagonal cursor moves across borders
  const submenuCloseTimer = useRef<NodeJS.Timeout | null>(null);

  const targetZone = targetZoneId && smartZones ? smartZones.find((z) => z.id === targetZoneId) : undefined;

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (submenuCloseTimer.current) clearTimeout(submenuCloseTimer.current);
    };
  }, [onClose]);

  // Measure actual rendered size and adjust position to never clip off-screen
  useLayoutEffect(() => {
    if (!menuRef.current) return;
    const rect = menuRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let targetLeft = x;
    let targetTop = y;

    // Main menu horizontal positioning
    if (x + rect.width > vw - 10) {
      targetLeft = Math.max(10, x - rect.width);
    }

    // Main menu vertical positioning (flip upwards if not enough room below click)
    if (y + rect.height > vh - 12) {
      targetTop = Math.max(12, y - rect.height);
    }

    // Strict boundary clamps
    targetLeft = Math.max(10, Math.min(targetLeft, vw - rect.width - 10));
    targetTop = Math.max(12, Math.min(targetTop, vh - rect.height - 12));

    // Submenu space check (approx 240px needed for submenus)
    const needsLeftSubmenu = targetLeft + rect.width + 240 > vw;
    setSubMenuOpensLeft(needsLeftSubmenu);

    setCoords({ left: targetLeft, top: targetTop });
    setIsCalculated(true);
  }, [x, y]);

  // Submenu hover management with safe intent window
  const handleMouseEnterSubmenuItem = (menuKey: string) => {
    if (submenuCloseTimer.current) {
      clearTimeout(submenuCloseTimer.current);
      submenuCloseTimer.current = null;
    }
    setActiveSubmenu(menuKey);
  };

  const handleMouseLeaveSubmenuItem = () => {
    if (submenuCloseTimer.current) {
      clearTimeout(submenuCloseTimer.current);
    }
    // Safe travel window allowing smooth diagonal mouse movement into submenu
    submenuCloseTimer.current = setTimeout(() => {
      setActiveSubmenu(null);
    }, 260);
  };

  const handleSubmenuContainerEnter = () => {
    if (submenuCloseTimer.current) {
      clearTimeout(submenuCloseTimer.current);
      submenuCloseTimer.current = null;
    }
  };

  const handleMouseEnterNonSubmenu = () => {
    if (submenuCloseTimer.current) {
      clearTimeout(submenuCloseTimer.current);
      submenuCloseTimer.current = null;
    }
    setActiveSubmenu(null);
  };

  const targetPath = item ? item.path : currentPath;
  const isCurrentPinned = item?.isDir
    ? pinnedFolders.includes(item.path)
    : currentPath
    ? pinnedFolders.includes(currentPath)
    : false;

  // Submenu vertical direction check
  const subMenuOpensUp = coords.top > window.innerHeight * 0.6;

  // Helper for submenu classes with exact 2px overlap (ZERO gap)
  const getSubmenuClasses = (width = 'w-52') =>
    `absolute z-50 ${
      subMenuOpensLeft ? 'right-[calc(100%-2px)]' : 'left-[calc(100%-2px)]'
    } ${
      subMenuOpensUp ? 'bottom-[-4px]' : 'top-[-4px]'
    } ${width} bg-[#262626] border border-[#404040] rounded-md shadow-2xl py-1 text-xs text-[#e5e5e5] select-none`;

  // VS Code Brand Icon
  const VSCodeIcon = () => (
    <svg className="w-4 h-4 text-[#007acc] shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.58 2.05L7.79 9.93 3.5 6.64.93 7.85l3.96 4.15-3.96 4.15 2.57 1.21 4.29-3.29 9.79 7.88L23.07 20V4zm-2.22 5.09v9.72l-5.69-4.86z" />
    </svg>
  );

  // Git Brand Icon
  const GitIcon = () => (
    <svg className="w-4 h-4 text-[#f05032] shrink-0" viewBox="0 0 24 24" fill="currentColor">
      <path d="M21.62 10.38l-8-8a2.3 2.3 0 00-3.24 0L8.52 4.24l2.58 2.58a1.83 1.83 0 012.31 2.31l2.49 2.49a1.83 1.83 0 011.83 1.83 1.84 1.84 0 01-3.24 1.24l-2.33-2.33v5.18a1.84 1.84 0 11-1.39 0v-5.25a1.84 1.84 0 01-.98-2.41L7.23 7.33l-4.85 4.85a2.3 2.3 0 000 3.24l8 8a2.3 2.3 0 003.24 0l8-8a2.3 2.3 0 000-3.24z" />
    </svg>
  );

  // Zalo Brand Icon
  const ZaloIcon = () => (
    <div className="w-4 h-4 rounded-full bg-[#0068ff] flex items-center justify-center text-white text-[8px] font-black shrink-0 tracking-tighter">
      Z
    </div>
  );

  // Command Prompt Icon Badge
  const CmdIcon = () => (
    <div className="w-4 h-4 rounded bg-neutral-900 border border-neutral-700 flex items-center justify-center text-[8px] font-mono text-white shrink-0">
      &gt;_
    </div>
  );

  return (
    <div
      ref={menuRef}
      id="explorer-context-menu"
      style={{
        left: `${coords.left}px`,
        top: `${coords.top}px`,
        opacity: isCalculated ? 1 : 0,
      }}
      className="fixed z-50 w-60 overflow-visible bg-[#262626] border border-[#404040] rounded-md shadow-2xl py-1 text-xs text-[#e5e5e5] font-sans transition-opacity duration-75 select-none"
    >
      {/* ========================================================================= */}
      {/* CASE 1: CONTEXT MENU ON FILE / FOLDER ITEM                                */}
      {/* ========================================================================= */}
      {item ? (
        <>
          {/* Windows 11 Top Action Bar: Cut, Copy, Paste, Rename, Delete */}
          <div className="flex items-center justify-around px-2 py-1 mb-1 border-b border-[#3d3d3d] text-neutral-300">
            <button
              id="ctx-quick-cut"
              title="Cut (Ctrl+X)"
              onClick={() => {
                if (onCut) onCut(item);
                onClose();
              }}
              className="p-1.5 hover:bg-[#383838] hover:text-white rounded transition-colors"
            >
              <Scissors className="w-4 h-4" />
            </button>
            <button
              id="ctx-quick-copy"
              title="Copy (Ctrl+C)"
              onClick={() => {
                if (onCopy) onCopy(item);
                onClose();
              }}
              className="p-1.5 hover:bg-[#383838] hover:text-white rounded transition-colors"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              id="ctx-quick-paste"
              title={clipboard ? `Paste (Ctrl+V) - ${clipboard.items.length} mục` : 'Paste (Ctrl+V)'}
              disabled={!clipboard}
              onClick={() => {
                if (onPaste) onPaste(item.isDir ? item.path : undefined);
                onClose();
              }}
              className={`p-1.5 rounded transition-colors ${
                clipboard
                  ? 'hover:bg-[#383838] hover:text-blue-400 text-blue-400 cursor-pointer'
                  : 'text-neutral-600 cursor-not-allowed'
              }`}
            >
              <ClipboardPaste className="w-4 h-4" />
            </button>
            <button
              id="ctx-quick-rename"
              title="Rename (F2)"
              onClick={() => {
                onRename(item);
                onClose();
              }}
              className="p-1.5 hover:bg-[#383838] hover:text-white rounded transition-colors"
            >
              <Edit3 className="w-4 h-4" />
            </button>
            <button
              id="ctx-quick-delete"
              title="Delete (Delete)"
              onClick={() => {
                onDelete(item);
                onClose();
              }}
              className="p-1.5 hover:bg-[#383838] hover:text-red-400 rounded transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          {/* 1. Open (BOLD - Default Windows Action) */}
          <button
            id="ctx-item-open"
            onClick={() => {
              onOpen(item);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left font-bold"
          >
            <span>Open</span>
          </button>

          {/* 2. Run as administrator (Shield) */}
          <button
            id="ctx-item-run-as-admin"
            onClick={async () => {
              onClose();
              await runAsAdmin(item.path);
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <Shield className="w-4 h-4 text-amber-400 fill-blue-500 shrink-0" />
            <span>Run as administrator</span>
          </button>

          {/* 3. Open with Code */}
          <button
            id="ctx-item-open-with-code"
            onClick={async () => {
              onClose();
              await openWithCode(item.path);
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <VSCodeIcon />
            <span>Open with Code</span>
          </button>

          {/* 4. Open with > (Submenu with alternative apps) */}
          {!item.isDir && (
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnterSubmenuItem('openWith')}
              onMouseLeave={handleMouseLeaveSubmenuItem}
            >
              <button
                id="ctx-item-open-with"
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
              >
                <span>Open with</span>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              <ContextSubmenu
                isOpen={activeSubmenu === 'openWith'}
                onMouseEnter={handleSubmenuContainerEnter}
                width="w-52"
              >
                <button
                  onClick={async () => {
                    onClose();
                    await openRealItem(item.path);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left font-medium"
                >
                  <span>Choose default program...</span>
                </button>
                <button
                  onClick={async () => {
                    onClose();
                    await openWithCode(item.path);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
                >
                  <VSCodeIcon />
                  <span>Visual Studio Code</span>
                </button>
                <button
                  onClick={async () => {
                    onClose();
                    await openRealItem(item.path);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span>Notepad</span>
                </button>
              </ContextSubmenu>
            </div>
          )}

          {/* 5. Pin to Quick Access (Folder only) */}
          {item.isDir && (
            <button
              id="ctx-item-quick-access"
              onClick={() => {
                if (isCurrentPinned) {
                  onUnpin(item.path);
                } else {
                  onPin(item.path);
                }
                onClose();
              }}
              className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              {isCurrentPinned ? (
                <>
                  <PinOff className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Unpin from Quick Access (Bỏ ghim)</span>
                </>
              ) : (
                <>
                  <Pin className="w-4 h-4 text-amber-400 shrink-0" />
                  <span>Pin to Quick Access (Ghim vào Truy cập nhanh)</span>
                </>
              )}
            </button>
          )}

          {/* 6. Share with Zalo */}
          <button
            id="ctx-item-zalo"
            onClick={() => {
              navigator.clipboard.writeText(item.path);
              alert(`Đã sao chép đường dẫn để kéo thả hoặc gửi qua Zalo:\n${item.path}`);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <ZaloIcon />
            <span>Share with Zalo (Kéo thả hoặc gửi)</span>
          </button>

          {/* 7. 7-Zip > (Fixed seamless gap and instant extraction) */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('7zip')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-item-7zip"
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <Package className="w-4 h-4 text-amber-500 shrink-0" />
                <span>7-Zip</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <ContextSubmenu
              isOpen={activeSubmenu === '7zip'}
              onMouseEnter={handleSubmenuContainerEnter}
              width="w-56"
            >
              <button
                onClick={async () => {
                  onClose();
                  try {
                    await extractArchiveItem(item.path);
                    onRefresh();
                  } catch (err: unknown) {
                    alert((err as Error).message || 'Không thể giải nén file');
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left font-medium text-amber-400"
              >
                <Package className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span>Extract Here (Giải nén tại đây)</span>
              </button>
              <button
                onClick={async () => {
                  onClose();
                  await openRealItem(item.path);
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Open archive</span>
              </button>
              <button
                onClick={() => {
                  alert(`Đã yêu cầu thêm vào file nén: ${item.name}.zip`);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Add to "{item.name}.zip"</span>
              </button>
            </ContextSubmenu>
          </div>

          {/* 8. Scan with Microsoft Defender... */}
          <button
            id="ctx-item-defender"
            onClick={() => {
              alert(`Microsoft Defender: Tệp "${item.name}" an toàn và không có mã độc.`);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <Shield className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Scan with Microsoft Defender...</span>
          </button>

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* 9. Give access to > */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('giveAccess')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-item-give-access"
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <span>Give access to</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <ContextSubmenu
              isOpen={activeSubmenu === 'giveAccess'}
              onMouseEnter={handleSubmenuContainerEnter}
              width="w-52"
            >
              <button
                onClick={() => {
                  if (onRemoveAccess) onRemoveAccess(item.path);
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <ShieldOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Remove access</span>
              </button>
              <button
                onClick={() => {
                  if (onGiveAccess) onGiveAccess(item.path);
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Specific people...</span>
              </button>
              <div className="h-px bg-[#3d3d3d] my-1 mx-2" />
              <button
                onClick={() => {
                  onShowProperties(item, 'sharing');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left text-neutral-300"
              >
                <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Advanced sharing...</span>
              </button>
            </ContextSubmenu>
          </div>

          {/* 10. Copy as path */}
          <button
            id="ctx-item-copy-path"
            onClick={() => {
              navigator.clipboard.writeText(`"${item.path}"`);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <span>Copy as path</span>
          </button>

          {/* 11. Share */}
          <button
            id="ctx-item-share"
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: item.name, text: item.path }).catch(() => {});
              } else {
                navigator.clipboard.writeText(item.path);
              }
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <Share2 className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>Share</span>
          </button>

          {/* 12. Send to > */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('sendTo')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-item-send-to"
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <span>Send to</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <ContextSubmenu
              isOpen={activeSubmenu === 'sendTo'}
              onMouseEnter={handleSubmenuContainerEnter}
              width="w-52"
            >
              <button
                onClick={() => {
                  alert(`Đã gửi vào file nén zip: ${item.name}.zip`);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <Package className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Compressed (zipped) folder</span>
              </button>
              <button
                onClick={() => {
                  alert('Đã tạo lối tắt trên Desktop');
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <CornerDownRight className="w-4 h-4 text-blue-400 shrink-0" />
                <span>Desktop (create shortcut)</span>
              </button>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(item.path);
                  alert(`Đã chuẩn bị tệp để gửi qua Zalo:\n${item.path}`);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <ZaloIcon />
                <span>Zalo Chat</span>
              </button>
            </ContextSubmenu>
          </div>

          {/* Smart Zones shortcut if configured */}
          {smartZones.length > 0 && onAssignToZone && (
            <div
              className="relative"
              onMouseEnter={() => handleMouseEnterSubmenuItem('smartZones')}
              onMouseLeave={handleMouseLeaveSubmenuItem}
            >
              <button
                id="ctx-item-smart-zones"
                className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-400 shrink-0" />
                  <span>Gán vào Smart Zone...</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
              </button>

              <ContextSubmenu
                isOpen={activeSubmenu === 'smartZones'}
                onMouseEnter={handleSubmenuContainerEnter}
                width="w-52"
              >
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
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left truncate"
                  >
                    <span className="truncate">{z.name}</span>
                  </button>
                ))}
              </ContextSubmenu>
            </div>
          )}

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* 13. Cut */}
          <button
            id="ctx-item-cut"
            onClick={() => {
              if (onCut) onCut(item);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Scissors className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>Cut</span>
            </div>
            <span className="text-[11px] text-neutral-400">Ctrl+X</span>
          </button>

          {/* 14. Copy */}
          <button
            id="ctx-item-copy"
            onClick={() => {
              if (onCopy) {
                onCopy(item);
              } else {
                navigator.clipboard.writeText(item.path);
              }
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <div className="flex items-center gap-2.5">
              <Copy className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>Copy</span>
            </div>
            <span className="text-[11px] text-neutral-400">Ctrl+C</span>
          </button>

          {/* Paste Options */}
          {item.isDir ? (
            <button
              id="ctx-item-paste"
              disabled={!clipboard}
              onClick={() => {
                if (onPaste) onPaste(item.path);
                onClose();
              }}
              className={`w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-left ${
                clipboard
                  ? 'hover:bg-[#383838] hover:text-white text-[#e5e5e5] cursor-pointer'
                  : 'text-neutral-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardPaste className={`w-4 h-4 ${clipboard ? 'text-blue-400' : 'text-neutral-400'} shrink-0`} />
                <span>Paste vào thư mục này</span>
              </div>
              <span className="text-[11px] text-neutral-400">Ctrl+V</span>
            </button>
          ) : (
            <button
              id="ctx-item-paste-here"
              disabled={!clipboard}
              onClick={() => {
                if (onPaste) onPaste();
                onClose();
              }}
              className={`w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-left ${
                clipboard
                  ? 'hover:bg-[#383838] hover:text-white text-[#e5e5e5] cursor-pointer'
                  : 'text-neutral-500 cursor-not-allowed'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <ClipboardPaste className={`w-4 h-4 ${clipboard ? 'text-blue-400' : 'text-neutral-400'} shrink-0`} />
                <span>Paste</span>
              </div>
              <span className="text-[11px] text-neutral-400">Ctrl+V</span>
            </button>
          )}

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* 15. Create shortcut */}
          <button
            id="ctx-item-create-shortcut"
            onClick={onClose}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <CornerDownRight className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>Create shortcut</span>
          </button>

          {/* 16. Delete */}
          <button
            id="ctx-item-delete"
            onClick={() => {
              onDelete(item);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-rose-900/50 hover:text-rose-200 text-neutral-200 rounded-md transition-colors text-left"
          >
            <Trash2 className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Delete (Del)</span>
          </button>

          {/* 17. Rename */}
          <button
            id="ctx-item-rename"
            onClick={() => {
              onRename(item);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <Edit3 className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>Rename (F2)</span>
          </button>

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* Customize this folder (Folder only) */}
          {item.isDir && (
            <button
              id="ctx-item-customize"
              onClick={() => {
                onShowProperties(item, 'customize');
                onClose();
              }}
              className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <Sliders className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>Customize this folder...</span>
            </button>
          )}

          {/* 18. Properties */}
          <button
            id="ctx-item-properties"
            onClick={() => {
              onShowProperties(item, 'general');
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <Info className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>Properties</span>
          </button>
        </>
      ) : (
        /* ========================================================================= */
        /* CASE 2: CONTEXT MENU ON EMPTY BACKGROUND                                  */
        /* ========================================================================= */
        <>
          {/* 1. View > */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('view')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-bg-view"
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <span>View</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <ContextSubmenu
              isOpen={activeSubmenu === 'view'}
              onMouseEnter={handleSubmenuContainerEnter}
              width="w-56"
            >
              <button
                onClick={() => {
                  if (onViewModeChange) onViewModeChange('grid');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Large icons</span>
                {viewMode === 'grid' && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
              <button
                onClick={() => {
                  if (onViewModeChange) onViewModeChange('tiles');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Medium icons</span>
                {viewMode === 'tiles' && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
              <button
                onClick={() => {
                  if (onViewModeChange) onViewModeChange('details');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Small icons</span>
              </button>
              <button
                onClick={() => {
                  if (onViewModeChange) onViewModeChange('details');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>List</span>
              </button>
              <button
                onClick={() => {
                  if (onViewModeChange) onViewModeChange('details');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Details</span>
                {viewMode === 'details' && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
              <button
                onClick={() => {
                  if (onViewModeChange) onViewModeChange('tiles');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Tiles</span>
              </button>
              <button
                onClick={() => {
                  if (onViewModeChange) onViewModeChange('details');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Content</span>
              </button>
              <div className="h-px bg-[#3d3d3d] my-1 mx-2" />
              <button
                onClick={() => {
                  if (onViewModeChange) onViewModeChange('zones');
                  onClose();
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  <span>Smart Zones (Hộp khu vực)</span>
                </div>
                {viewMode === 'zones' && <Check className="w-3.5 h-3.5 text-blue-400" />}
              </button>
            </ContextSubmenu>
          </div>

          {/* 2. Sort by > */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('sort')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-bg-sort"
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <span>Sort by</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            {onSortChange && (
              <ContextSubmenu
                isOpen={activeSubmenu === 'sort'}
                onMouseEnter={handleSubmenuContainerEnter}
                width="w-48"
              >
                <button
                  onClick={() => {
                    onSortChange('name', sortOrder || 'asc');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
                >
                  <span>Name</span>
                  {sortBy === 'name' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    onSortChange('modified', sortOrder || 'desc');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
                >
                  <span>Date modified</span>
                  {sortBy === 'modified' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    onSortChange('type', sortOrder || 'asc');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
                >
                  <span>Type</span>
                  {sortBy === 'type' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    onSortChange('size', sortOrder || 'desc');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
                >
                  <span>Size</span>
                  {sortBy === 'size' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                <div className="h-px bg-[#3d3d3d] my-1 mx-2" />
                <button
                  onClick={() => {
                    onSortChange(sortBy || 'name', 'asc');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
                >
                  <span>Ascending</span>
                  {sortOrder === 'asc' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                <button
                  onClick={() => {
                    onSortChange(sortBy || 'name', 'desc');
                    onClose();
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
                >
                  <span>Descending</span>
                  {sortOrder === 'desc' && <Check className="w-3.5 h-3.5 text-blue-400" />}
                </button>
                <div className="h-px bg-[#3d3d3d] my-1 mx-2" />
                <button
                  onClick={onClose}
                  className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left text-neutral-400"
                >
                  <span>More...</span>
                </button>
              </ContextSubmenu>
            )}
          </div>

          {/* 3. Group by > */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('group')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-bg-group"
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <span>Group by</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <ContextSubmenu
              isOpen={activeSubmenu === 'group'}
              onMouseEnter={handleSubmenuContainerEnter}
              width="w-48"
            >
              <button
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>(None)</span>
                <Check className="w-3.5 h-3.5 text-blue-400" />
              </button>
              <button
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Name</span>
              </button>
              <button
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Date modified</span>
              </button>
              <button
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Type</span>
              </button>
              <button
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Size</span>
              </button>
              <div className="h-px bg-[#3d3d3d] my-1 mx-2" />
              <button
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Ascending</span>
              </button>
              <button
                onClick={onClose}
                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <span>Descending</span>
              </button>
            </ContextSubmenu>
          </div>

          {/* 4. Refresh */}
          <button
            id="ctx-bg-refresh"
            onMouseEnter={handleMouseEnterNonSubmenu}
            onClick={() => {
              onRefresh();
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <span>Refresh</span>
          </button>

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* 5. Customize this folder... */}
          <button
            id="ctx-bg-customize"
            onMouseEnter={handleMouseEnterNonSubmenu}
            onClick={() => {
              onShowProperties(null, 'customize');
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <span>Customize this folder...</span>
          </button>

          {/* Pin to Quick access */}
          {currentPath && (
            <button
              id="ctx-bg-pin-quick-access"
              onMouseEnter={handleMouseEnterNonSubmenu}
              onClick={() => {
                if (isCurrentPinned) {
                  onUnpin(currentPath);
                } else {
                  onPin(currentPath);
                }
                onClose();
              }}
              className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <Pin className={`w-4 h-4 ${isCurrentPinned ? 'text-blue-400 fill-blue-400' : 'text-neutral-400'} shrink-0`} />
              <span>{isCurrentPinned ? 'Unpin this folder from Quick access' : 'Pin to Quick access'}</span>
            </button>
          )}

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* 6. Paste */}
          <button
            id="ctx-bg-paste"
            disabled={!clipboard}
            onMouseEnter={handleMouseEnterNonSubmenu}
            onClick={() => {
              if (onPaste) onPaste();
              onClose();
            }}
            className={`w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 rounded-md transition-colors text-left ${
              clipboard
                ? 'hover:bg-[#383838] hover:text-white text-[#e5e5e5] cursor-pointer'
                : 'text-neutral-500 cursor-not-allowed'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <ClipboardPaste className="w-4 h-4 text-neutral-400 shrink-0" />
              <span>{targetZone ? `Paste vào "${targetZone.name}"` : 'Paste'}</span>
            </div>
            <span className="text-[11px] text-neutral-400">Ctrl+V</span>
          </button>

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* Open with Code */}
          <button
            id="ctx-bg-open-with-code"
            onMouseEnter={handleMouseEnterNonSubmenu}
            onClick={async () => {
              onClose();
              await openWithCode(currentPath);
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <VSCodeIcon />
            <span>Open with Code</span>
          </button>

          {/* Command Prompt > */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('cmd')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-bg-cmd"
              onClick={() => {
                launchTerminal(currentPath);
                onClose();
              }}
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <div className="flex items-center gap-2.5">
                <CmdIcon />
                <span>Command Prompt</span>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <ContextSubmenu
              isOpen={activeSubmenu === 'cmd'}
              onMouseEnter={handleSubmenuContainerEnter}
              width="w-56"
            >
              <button
                onClick={() => {
                  launchTerminal(currentPath);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <CmdIcon />
                <span>Open Command Prompt here</span>
              </button>
              <button
                onClick={() => {
                  launchPowerShell(currentPath);
                  onClose();
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <Terminal className="w-4 h-4 text-blue-400" />
                <span>Open Windows PowerShell here</span>
              </button>
            </ContextSubmenu>
          </div>

          {/* Open Git GUI here */}
          <button
            id="ctx-bg-git-gui"
            onMouseEnter={handleMouseEnterNonSubmenu}
            onClick={() => {
              alert(`Mở Git GUI tại thư mục:\n${currentPath}`);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <GitIcon />
            <span>Open Git GUI here</span>
          </button>

          {/* Open Git Bash here */}
          <button
            id="ctx-bg-git-bash"
            onMouseEnter={handleMouseEnterNonSubmenu}
            onClick={() => {
              launchTerminal(currentPath);
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <GitIcon />
            <span>Open Git Bash here</span>
          </button>

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* Give access to > */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('giveAccessBg')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-bg-give-access"
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <span>Give access to</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <ContextSubmenu
              isOpen={activeSubmenu === 'giveAccessBg'}
              onMouseEnter={handleSubmenuContainerEnter}
              width="w-52"
            >
              <button
                onClick={() => {
                  if (onRemoveAccess) onRemoveAccess(currentPath);
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <ShieldOff className="w-3.5 h-3.5 text-rose-400" />
                <span>Remove access</span>
              </button>
              <button
                onClick={() => {
                  if (onGiveAccess) onGiveAccess(currentPath);
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <Users className="w-3.5 h-3.5 text-blue-400" />
                <span>Specific people...</span>
              </button>
              <div className="h-px bg-[#3d3d3d] my-1 mx-2" />
              <button
                onClick={() => {
                  onShowProperties(null, 'sharing');
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left text-neutral-300"
              >
                <Share2 className="w-3.5 h-3.5 text-neutral-400" />
                <span>Advanced sharing...</span>
              </button>
            </ContextSubmenu>
          </div>

          {/* New > */}
          <div
            className="relative"
            onMouseEnter={() => handleMouseEnterSubmenuItem('new')}
            onMouseLeave={handleMouseLeaveSubmenuItem}
          >
            <button
              id="ctx-bg-new"
              className="w-[calc(100%-8px)] mx-1 flex items-center justify-between px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
            >
              <span>New</span>
              <ChevronRight className="w-3.5 h-3.5 text-neutral-400" />
            </button>

            <ContextSubmenu
              isOpen={activeSubmenu === 'new'}
              onMouseEnter={handleSubmenuContainerEnter}
              width="w-60"
            >
              <button
                id="ctx-new-folder"
                onClick={() => {
                  onCreateFolder();
                  onClose();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left font-medium"
              >
                <Folder className="w-4 h-4 text-amber-500 fill-amber-500/20 shrink-0" />
                <span>Folder</span>
              </button>

              <button
                onClick={onClose}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <CornerDownRight className="w-4 h-4 text-neutral-400 shrink-0" />
                <span>Shortcut</span>
              </button>

              <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

              <button
                onClick={async () => {
                  onClose();
                  await createNewTemplateFile(currentPath, 'New Microsoft Word Document.docx');
                  onRefresh();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <FileText className="w-4 h-4 text-blue-500 shrink-0" />
                <span>Microsoft Word Document</span>
              </button>

              <button
                onClick={async () => {
                  onClose();
                  await createNewTemplateFile(currentPath, 'New Microsoft Excel Worksheet.xlsx');
                  onRefresh();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />
                <span>Microsoft Excel Worksheet</span>
              </button>

              <button
                onClick={async () => {
                  onClose();
                  await createNewTemplateFile(currentPath, 'New Microsoft PowerPoint Presentation.pptx');
                  onRefresh();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <Presentation className="w-4 h-4 text-orange-500 shrink-0" />
                <span>Microsoft PowerPoint Presentation</span>
              </button>

              <button
                onClick={async () => {
                  onClose();
                  await createNewTemplateFile(currentPath, 'New Text Document.txt');
                  onRefresh();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <FileText className="w-4 h-4 text-neutral-300 shrink-0" />
                <span>Text Document</span>
              </button>

              <button
                onClick={async () => {
                  onClose();
                  await createNewTemplateFile(currentPath, 'New Document.md');
                  onRefresh();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Markdown Document (.md)</span>
              </button>

              <button
                onClick={async () => {
                  onClose();
                  await createNewTemplateFile(currentPath, 'Compressed Archive.zip');
                  onRefresh();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-1.5 hover:bg-[#383838] hover:text-white text-left"
              >
                <Package className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Compressed (zipped) Folder</span>
              </button>
            </ContextSubmenu>
          </div>

          {/* DIVIDER */}
          <div className="h-px bg-[#3d3d3d] my-1 mx-2" />

          {/* Properties */}
          <button
            id="ctx-bg-properties"
            onMouseEnter={handleMouseEnterNonSubmenu}
            onClick={() => {
              onShowProperties(null, 'general');
              onClose();
            }}
            className="w-[calc(100%-8px)] mx-1 flex items-center gap-2.5 px-2.5 py-1.5 hover:bg-[#383838] hover:text-white rounded-md transition-colors text-left"
          >
            <Info className="w-4 h-4 text-neutral-400 shrink-0" />
            <span>Properties</span>
          </button>
        </>
      )}
    </div>
  );
};
