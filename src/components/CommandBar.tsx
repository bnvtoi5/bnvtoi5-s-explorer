import React, { useState, useRef, useEffect } from 'react';
import {
  FolderPlus,
  FilePlus,
  Trash2,
  Edit2,
  FolderInput,
  ArrowUpDown,
  LayoutGrid,
  List,
  Columns,
  PackageCheck,
  Eye,
  RefreshCw,
  Layers,
  ChevronDown,
  Plus,
} from 'lucide-react';
import { ViewMode, SortField, SortOrder, FileItem, CustomSpace } from '../types';

interface CommandBarProps {
  currentPath: string;
  selectedItems: FileItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  showHidden: boolean;
  onToggleShowHidden: () => void;
  onOpenFolderPicker: () => void;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onDeleteSelected: () => void;
  onRenameSelected: () => void;
  onRefresh: () => void;
  onOpenInstallerGuide: () => void;
  customSpaces?: CustomSpace[];
  onAddSelectedToSpace?: (spaceId: string) => void;
  onCreateNewSpace?: () => void;
  activeSpaceId?: string | null;
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

export const CommandBar: React.FC<CommandBarProps> = ({
  currentPath,
  selectedItems,
  viewMode,
  onViewModeChange,
  sortBy,
  sortOrder,
  onSortChange,
  showHidden,
  onToggleShowHidden,
  onOpenFolderPicker,
  onCreateFolder,
  onCreateFile,
  onDeleteSelected,
  onRenameSelected,
  onRefresh,
  onOpenInstallerGuide,
  customSpaces = [],
  onAddSelectedToSpace,
  onCreateNewSpace,
  activeSpaceId,
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [showSpaceMenu, setShowSpaceMenu] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const spaceMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (sortMenuRef.current && !sortMenuRef.current.contains(e.target as Node)) {
        setShowSortMenu(false);
      }
      if (viewMenuRef.current && !viewMenuRef.current.contains(e.target as Node)) {
        setShowViewMenu(false);
      }
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
      if (spaceMenuRef.current && !spaceMenuRef.current.contains(e.target as Node)) {
        setShowSpaceMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const hasSelection = selectedItems.length > 0;
  const singleSelection = selectedItems.length === 1;

  return (
    <div
      id="explorer-command-bar"
      className="flex items-center justify-between px-3 py-1.5 border-b border-neutral-200 bg-neutral-50/90 select-none text-neutral-800 text-sm"
    >
      {/* Left actions */}
      <div className="flex items-center gap-1 flex-wrap">
        {/* Open Folder / Drive */}
        <button
          id="btn-open-real-folder"
          onClick={onOpenFolderPicker}
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-200/80 active:bg-neutral-300/80 transition-colors font-medium text-neutral-800"
          title="Mở thư mục hoặc ổ đĩa thực tế trên máy"
        >
          <FolderInput className="w-4 h-4 text-blue-600" />
          <span>Open Folder</span>
        </button>

        <div className="h-4 w-px bg-neutral-300 mx-1" />

        {/* New Item Dropdown */}
        <div className="relative" ref={newMenuRef}>
          <button
            id="btn-new-menu"
            onClick={() => setShowNewMenu(!showNewMenu)}
            disabled={!currentPath && !activeSpaceId}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
              currentPath || activeSpaceId
                ? 'hover:bg-neutral-200/80 active:bg-neutral-300/80 text-neutral-800'
                : 'text-neutral-400 cursor-not-allowed'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-amber-600" />
            <span>New</span>
          </button>

          {showNewMenu && (
            <div className="absolute left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                id="btn-create-folder"
                onClick={() => {
                  setShowNewMenu(false);
                  onCreateFolder();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 text-neutral-800 text-xs"
              >
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span>Folder</span>
              </button>
              <button
                id="btn-create-file"
                onClick={() => {
                  setShowNewMenu(false);
                  onCreateFile();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 text-neutral-800 text-xs"
              >
                <FilePlus className="w-4 h-4 text-blue-500" />
                <span>Text Document</span>
              </button>
              {onCreateNewSpace && (
                <>
                  <div className="border-t border-neutral-100 my-1" />
                  <button
                    id="btn-create-custom-space"
                    onClick={() => {
                      setShowNewMenu(false);
                      onCreateNewSpace();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 text-blue-600 text-xs font-medium"
                  >
                    <Layers className="w-4 h-4 text-blue-600" />
                    <span>Không Gian Custom</span>
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        {/* Gôm vào Không Gian Button (appears when items are selected) */}
        {hasSelection && (
          <div className="relative" ref={spaceMenuRef}>
            <button
              id="btn-add-to-space"
              onClick={() => setShowSpaceMenu(!showSpaceMenu)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 font-medium transition-colors"
              title="Gôm các file được chọn vào một Không Gian Tùy Chỉnh"
            >
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Gôm vào Không Gian ({selectedItems.length})</span>
              <ChevronDown className="w-3 h-3 text-blue-500" />
            </button>

            {showSpaceMenu && (
              <div className="absolute left-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 text-xs animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1 text-neutral-400 font-semibold uppercase text-[10px]">
                  Chọn Không Gian đích
                </div>
                {customSpaces.length === 0 ? (
                  <div className="px-3 py-2 text-neutral-400 italic text-[11px]">
                    Chưa có không gian nào
                  </div>
                ) : (
                  customSpaces.map((space) => (
                    <button
                      key={space.id}
                      onClick={() => {
                        setShowSpaceMenu(false);
                        if (onAddSelectedToSpace) onAddSelectedToSpace(space.id);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-blue-50 hover:text-blue-700 text-neutral-800"
                    >
                      <div className={`w-2 h-2 rounded-full ${COLOR_DOTS[space.color] || 'bg-blue-500'}`} />
                      <span className="truncate flex-1">{space.name}</span>
                      <span className="text-[10px] text-neutral-400">{space.items.length}</span>
                    </button>
                  ))
                )}
                {onCreateNewSpace && (
                  <>
                    <div className="border-t border-neutral-100 my-1" />
                    <button
                      onClick={() => {
                        setShowSpaceMenu(false);
                        onCreateNewSpace();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-neutral-100 text-blue-600 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>+ Tạo Không Gian Mới</span>
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        <div className="h-4 w-px bg-neutral-300 mx-1" />

        {/* Selection actions: Rename & Delete */}
        <button
          id="btn-rename-item"
          onClick={onRenameSelected}
          disabled={!singleSelection}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
            singleSelection
              ? 'hover:bg-neutral-200/80 active:bg-neutral-300/80 text-neutral-800'
              : 'text-neutral-400 cursor-not-allowed'
          }`}
          title="Rename selected item (F2)"
        >
          <Edit2 className="w-4 h-4" />
          <span>Rename</span>
        </button>

        <button
          id="btn-delete-item"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors ${
            hasSelection
              ? 'hover:bg-red-50 text-red-700'
              : 'text-neutral-400 cursor-not-allowed'
          }`}
          title="Delete selected item"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete</span>
        </button>

        <div className="h-4 w-px bg-neutral-300 mx-1" />

        {/* Sort Menu */}
        <div className="relative" ref={sortMenuRef}>
          <button
            id="btn-sort-menu"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-200/80 transition-colors text-neutral-800"
          >
            <ArrowUpDown className="w-4 h-4 text-neutral-600" />
            <span>Sort</span>
          </button>

          {showSortMenu && (
            <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 text-xs">
              <div className="px-3 py-1 text-neutral-400 font-semibold uppercase text-[10px]">Sort by</div>
              {[
                { field: 'name' as SortField, label: 'Name' },
                { field: 'modified' as SortField, label: 'Date modified' },
                { field: 'type' as SortField, label: 'Type' },
                { field: 'size' as SortField, label: 'Size' },
              ].map(({ field, label }) => (
                <button
                  key={field}
                  id={`sort-${field}`}
                  onClick={() => {
                    onSortChange(field, sortBy === field && sortOrder === 'asc' ? 'desc' : 'asc');
                    setShowSortMenu(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-neutral-100 text-neutral-800"
                >
                  <span>{label}</span>
                  {sortBy === field && (
                    <span className="text-blue-600 text-[10px]">
                      {sortOrder === 'asc' ? '▲ Asc' : '▼ Desc'}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* View Menu */}
        <div className="relative" ref={viewMenuRef}>
          <button
            id="btn-view-menu"
            onClick={() => setShowViewMenu(!showViewMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-200/80 transition-colors text-neutral-800"
          >
            {viewMode === 'details' && <List className="w-4 h-4 text-neutral-600" />}
            {viewMode === 'grid' && <LayoutGrid className="w-4 h-4 text-neutral-600" />}
            {viewMode === 'tiles' && <Columns className="w-4 h-4 text-neutral-600" />}
            <span>View</span>
          </button>

          {showViewMenu && (
            <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 text-xs">
              <div className="px-3 py-1 text-neutral-400 font-semibold uppercase text-[10px]">Layout</div>
              {[
                { mode: 'details' as ViewMode, label: 'Details', icon: List },
                { mode: 'grid' as ViewMode, label: 'Large Icons', icon: LayoutGrid },
                { mode: 'tiles' as ViewMode, label: 'Tiles', icon: Columns },
              ].map(({ mode, label, icon: IconComp }) => (
                <button
                  key={mode}
                  id={`view-mode-${mode}`}
                  onClick={() => {
                    onViewModeChange(mode);
                    setShowViewMenu(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-neutral-100 ${
                    viewMode === mode ? 'font-semibold text-blue-600 bg-blue-50/50' : 'text-neutral-800'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <IconComp className="w-3.5 h-3.5" />
                    {label}
                  </span>
                  {viewMode === mode && <span className="text-blue-600">✓</span>}
                </button>
              ))}

              <div className="border-t border-neutral-200 my-1" />
              <button
                id="btn-toggle-hidden-files"
                onClick={() => {
                  onToggleShowHidden();
                  setShowViewMenu(false);
                }}
                className="w-full flex items-center justify-between px-3 py-1.5 text-left hover:bg-neutral-100 text-neutral-800"
              >
                <span className="flex items-center gap-2">
                  <Eye className="w-3.5 h-3.5 text-neutral-500" />
                  Hidden items
                </span>
                {showHidden && <span className="text-blue-600">✓</span>}
              </button>
            </div>
          )}
        </div>

        {/* Refresh */}
        <button
          id="btn-refresh-command"
          onClick={onRefresh}
          className="p-1.5 rounded-md hover:bg-neutral-200/80 transition-colors text-neutral-600"
          title="Refresh (F5)"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Right actions: Windows 11 Installer & Packaging Guide button */}
      <div className="flex items-center gap-2">
        <button
          id="btn-installer-guide"
          onClick={onOpenInstallerGuide}
          className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200/80 font-medium text-xs transition-all shadow-xs"
        >
          <PackageCheck className="w-4 h-4 text-blue-600" />
          <span>Windows Installer & Build</span>
        </button>
      </div>
    </div>
  );
};
