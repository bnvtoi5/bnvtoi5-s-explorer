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
  Eye,
  RefreshCw,
  Layers,
} from 'lucide-react';
import { ViewMode, SortField, SortOrder, FileItem } from '../types';

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
}

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
}) => {
  const [showSortMenu, setShowSortMenu] = useState(false);
  const [showViewMenu, setShowViewMenu] = useState(false);
  const [showNewMenu, setShowNewMenu] = useState(false);

  const sortMenuRef = useRef<HTMLDivElement>(null);
  const viewMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

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
          className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-200/80 active:bg-neutral-300/80 transition-colors font-medium text-neutral-800 text-xs"
          title="Mở thư mục trên máy tính"
        >
          <FolderInput className="w-4 h-4 text-blue-600" />
          <span>Mở Thư Mục</span>
        </button>

        <div className="h-4 w-px bg-neutral-300 mx-1" />

        {/* New Item Dropdown */}
        <div className="relative" ref={newMenuRef}>
          <button
            id="btn-new-menu"
            onClick={() => setShowNewMenu(!showNewMenu)}
            disabled={!currentPath}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-xs ${
              currentPath
                ? 'hover:bg-neutral-200/80 active:bg-neutral-300/80 text-neutral-800'
                : 'text-neutral-400 cursor-not-allowed'
            }`}
          >
            <FolderPlus className="w-4 h-4 text-amber-600" />
            <span>Tạo Mới</span>
          </button>

          {showNewMenu && (
            <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
              <button
                id="btn-create-folder"
                onClick={() => {
                  setShowNewMenu(false);
                  onCreateFolder();
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-neutral-100 text-neutral-800 text-xs"
              >
                <FolderPlus className="w-4 h-4 text-amber-500" />
                <span>Thư mục mới</span>
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
                <span>Tập tin văn bản (.txt)</span>
              </button>
            </div>
          )}
        </div>

        <div className="h-4 w-px bg-neutral-300 mx-1" />

        {/* Selection actions: Rename & Delete */}
        <button
          id="btn-rename-item"
          onClick={onRenameSelected}
          disabled={!singleSelection}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-xs ${
            singleSelection
              ? 'hover:bg-neutral-200/80 active:bg-neutral-300/80 text-neutral-800'
              : 'text-neutral-400 cursor-not-allowed'
          }`}
          title="Đổi tên mục đã chọn (F2)"
        >
          <Edit2 className="w-4 h-4" />
          <span>Đổi tên</span>
        </button>

        <button
          id="btn-delete-item"
          onClick={onDeleteSelected}
          disabled={!hasSelection}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-colors text-xs ${
            hasSelection
              ? 'hover:bg-red-50 text-red-700'
              : 'text-neutral-400 cursor-not-allowed'
          }`}
          title="Xóa mục đã chọn (Delete)"
        >
          <Trash2 className="w-4 h-4" />
          <span>Xóa</span>
        </button>

        <div className="h-4 w-px bg-neutral-300 mx-1" />

        {/* Sort Menu */}
        <div className="relative" ref={sortMenuRef}>
          <button
            id="btn-sort-menu"
            onClick={() => setShowSortMenu(!showSortMenu)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-200/80 transition-colors text-neutral-800 text-xs"
          >
            <ArrowUpDown className="w-4 h-4 text-neutral-600" />
            <span>Sắp xếp</span>
          </button>

          {showSortMenu && (
            <div className="absolute left-0 mt-1 w-44 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 text-xs">
              <div className="px-3 py-1 text-neutral-400 font-semibold uppercase text-[10px]">Sắp xếp theo</div>
              {[
                { field: 'name' as SortField, label: 'Tên' },
                { field: 'modified' as SortField, label: 'Ngày sửa đổi' },
                { field: 'type' as SortField, label: 'Loại file' },
                { field: 'size' as SortField, label: 'Dung lượng' },
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
                      {sortOrder === 'asc' ? '▲ Tăng' : '▼ Giảm'}
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
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md hover:bg-neutral-200/80 transition-colors text-neutral-800 text-xs"
          >
            {viewMode === 'details' && <List className="w-4 h-4 text-neutral-600" />}
            {viewMode === 'grid' && <LayoutGrid className="w-4 h-4 text-neutral-600" />}
            {viewMode === 'tiles' && <Columns className="w-4 h-4 text-neutral-600" />}
            {viewMode === 'zones' && <Layers className="w-4 h-4 text-blue-600" />}
            <span>Chế độ xem</span>
          </button>

          {showViewMenu && (
            <div className="absolute left-0 mt-1 w-52 bg-white rounded-lg shadow-lg border border-neutral-200 py-1 z-50 text-xs">
              <div className="px-3 py-1 text-neutral-400 font-semibold uppercase text-[10px]">Bố cục hiển thị</div>
              {[
                { mode: 'details' as ViewMode, label: 'Chi tiết (Details)', icon: List },
                { mode: 'grid' as ViewMode, label: 'Lưới biểu tượng (Icons)', icon: LayoutGrid },
                { mode: 'tiles' as ViewMode, label: 'Thẻ (Tiles)', icon: Columns },
                { mode: 'zones' as ViewMode, label: 'Hộp Khu Vực (Smart Zones)', icon: Layers },
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
                  Mục ẩn (Hidden files)
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
          title="Làm mới (F5)"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Right Quick Switcher: 1-click toggle between Standard List & Smart Zones */}
      <div className="flex items-center gap-1.5 bg-neutral-200/60 p-0.5 rounded-lg">
        <button
          id="btn-switch-details"
          onClick={() => onViewModeChange('details')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            viewMode === 'details'
              ? 'bg-white text-neutral-900 shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
          title="Chế độ xem danh sách chi tiết thông thường"
        >
          <List className="w-3.5 h-3.5" />
          <span>Danh Sách</span>
        </button>

        <button
          id="btn-switch-zones"
          onClick={() => onViewModeChange('zones')}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            viewMode === 'zones'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-neutral-600 hover:text-neutral-900'
          }`}
          title="Chế độ xem các Hộp Khu Vực tự gôm file thông minh"
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Hộp Khu Vực</span>
        </button>
      </div>
    </div>
  );
};
