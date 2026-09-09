import React from 'react';
import { List, LayoutGrid, Columns, Layers, Laptop, Globe } from 'lucide-react';
import { ViewMode, FileItem } from '../types';
import { formatFileSize } from '../services/fs';

interface StatusBarProps {
  totalCount: number;
  selectedItems: FileItem[];
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  isNative: boolean;
}

export const StatusBar: React.FC<StatusBarProps> = ({
  totalCount,
  selectedItems,
  viewMode,
  onViewModeChange,
  isNative,
}) => {
  const selectedCount = selectedItems.length;
  const selectedSize = selectedItems.reduce((acc, item) => acc + (item.isDir ? 0 : item.size), 0);

  return (
    <footer
      id="explorer-status-bar"
      className="h-6 bg-neutral-100 border-t border-neutral-200 px-3 flex items-center justify-between text-[11px] text-neutral-600 select-none shrink-0"
    >
      {/* Left: item counter and selection info */}
      <div className="flex items-center gap-4">
        <span>{totalCount} {totalCount === 1 ? 'mục' : 'mục'}</span>

        {selectedCount > 0 && (
          <>
            <span className="text-neutral-300">|</span>
            <span>
              Đã chọn {selectedCount} mục
              {selectedSize > 0 && ` (${formatFileSize(selectedSize)})`}
            </span>
          </>
        )}
      </div>

      {/* Right: Runtime mode and View Mode shortcuts */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-1.5 text-neutral-500">
          {isNative ? (
            <>
              <Laptop className="w-3.5 h-3.5 text-blue-600" />
              <span>Native Windows (64-bit)</span>
            </>
          ) : (
            <>
              <Globe className="w-3.5 h-3.5 text-emerald-600" />
              <span>Hệ Thống Tệp Trực Tiếp</span>
            </>
          )}
        </div>

        <div className="h-3 w-px bg-neutral-300" />

        <div className="flex items-center gap-0.5">
          <button
            id="btn-status-view-details"
            onClick={() => onViewModeChange('details')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'details' ? 'bg-neutral-200 text-blue-700' : 'hover:bg-neutral-200 text-neutral-600'
            }`}
            title="Chi tiết (Details)"
          >
            <List className="w-3 h-3" />
          </button>

          <button
            id="btn-status-view-grid"
            onClick={() => onViewModeChange('grid')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'grid' ? 'bg-neutral-200 text-blue-700' : 'hover:bg-neutral-200 text-neutral-600'
            }`}
            title="Biểu tượng lớn (Icons)"
          >
            <LayoutGrid className="w-3 h-3" />
          </button>

          <button
            id="btn-status-view-tiles"
            onClick={() => onViewModeChange('tiles')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'tiles' ? 'bg-neutral-200 text-blue-700' : 'hover:bg-neutral-200 text-neutral-600'
            }`}
            title="Thẻ (Tiles)"
          >
            <Columns className="w-3 h-3" />
          </button>

          <button
            id="btn-status-view-zones"
            onClick={() => onViewModeChange('zones')}
            className={`p-1 rounded transition-colors ${
              viewMode === 'zones' ? 'bg-blue-600 text-white' : 'hover:bg-neutral-200 text-neutral-600'
            }`}
            title="Hộp Khu Vực (Smart Zones)"
          >
            <Layers className="w-3 h-3" />
          </button>
        </div>
      </div>
    </footer>
  );
};
