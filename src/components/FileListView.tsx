import React from 'react';
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
} from 'lucide-react';
import { FileItem, ViewMode, SortField, SortOrder } from '../types';
import { formatFileSize, formatWindowsDate } from '../services/fs';

interface FileListViewProps {
  items: FileItem[];
  currentPath: string;
  selectedItems: FileItem[];
  onSelectItem: (item: FileItem, isMulti: boolean) => void;
  onOpenItem: (item: FileItem) => void;
  onContextMenu: (e: React.MouseEvent, item: FileItem | null) => void;
  viewMode: ViewMode;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  onOpenFolderPicker: () => void;
  isSearching: boolean;
}

export const FileListView: React.FC<FileListViewProps> = ({
  items,
  currentPath,
  selectedItems,
  onSelectItem,
  onOpenItem,
  onContextMenu,
  viewMode,
  sortBy,
  sortOrder,
  onSortChange,
  onOpenFolderPicker,
  isSearching,
}) => {
  const getFileIcon = (item: FileItem, sizeClass: string = 'w-4 h-4') => {
    if (item.isDir) {
      return <Folder className={`${sizeClass} text-amber-500 fill-amber-500/20 shrink-0`} />;
    }

    const ext = item.extension?.toLowerCase() || '';

    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico'].includes(ext)) {
      return <FileImage className={`${sizeClass} text-purple-500 shrink-0`} />;
    }
    if (['mp3', 'wav', 'ogg', 'flac', 'm4a'].includes(ext)) {
      return <FileAudio className={`${sizeClass} text-rose-500 shrink-0`} />;
    }
    if (['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(ext)) {
      return <FileVideo className={`${sizeClass} text-indigo-500 shrink-0`} />;
    }
    if (['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className={`${sizeClass} text-amber-600 shrink-0`} />;
    }
    if (['ts', 'tsx', 'js', 'jsx', 'rs', 'py', 'json', 'html', 'css', 'c', 'cpp'].includes(ext)) {
      return <FileCode className={`${sizeClass} text-blue-600 shrink-0`} />;
    }
    if (['txt', 'md', 'doc', 'docx', 'pdf', 'rtf'].includes(ext)) {
      return <FileText className={`${sizeClass} text-neutral-600 shrink-0`} />;
    }

    return <File className={`${sizeClass} text-neutral-400 shrink-0`} />;
  };

  const getItemTypeDescription = (item: FileItem): string => {
    if (item.isDir) return 'File folder';
    if (!item.extension) return 'File';
    return `${item.extension.toUpperCase()} File`;
  };

  const handleHeaderSort = (field: SortField) => {
    if (sortBy === field) {
      onSortChange(field, sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      onSortChange(field, 'asc');
    }
  };

  // If no folder is open
  if (!currentPath) {
    return (
      <div
        id="explorer-empty-welcome"
        className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-white select-none"
        onContextMenu={(e) => onContextMenu(e, null)}
      >
        <div className="w-16 h-16 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 mb-4 shadow-xs">
          <FolderInput className="w-8 h-8" />
        </div>
        <h2 className="text-base font-semibold text-neutral-800 mb-1">
          Open a Folder to Explore
        </h2>
        <p className="text-xs text-neutral-500 max-w-md mb-5 leading-relaxed">
          Explorer App inspects real local folders and files on your computer.
          No sample or fake demo data will ever be generated.
        </p>
        <button
          id="btn-welcome-open-folder"
          onClick={onOpenFolderPicker}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg shadow-xs transition-colors"
        >
          <FolderInput className="w-4 h-4" />
          <span>Select Folder or Drive</span>
        </button>
      </div>
    );
  }

  // If current folder has 0 items
  if (items.length === 0) {
    return (
      <div
        id="explorer-empty-folder"
        className="flex-1 flex flex-col items-center justify-center p-8 text-neutral-400 select-none bg-white"
        onContextMenu={(e) => onContextMenu(e, null)}
      >
        <Folder className="w-12 h-12 text-neutral-300 stroke-[1.5] mb-2" />
        <span className="text-sm">
          {isSearching ? 'No items match your search' : 'This folder is empty'}
        </span>
      </div>
    );
  }

  // Details View
  if (viewMode === 'details') {
    return (
      <div
        id="file-view-details"
        className="flex-1 overflow-auto bg-white select-none text-xs"
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            onContextMenu(e, null);
          }
        }}
      >
        <table className="w-full text-left border-collapse">
          <thead className="sticky top-0 bg-neutral-50 border-b border-neutral-200 z-10 text-neutral-500 font-medium">
            <tr>
              <th
                onClick={() => handleHeaderSort('name')}
                className="py-1.5 px-3 cursor-pointer hover:bg-neutral-100 transition-colors w-1/2"
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
                className="py-1.5 px-3 cursor-pointer hover:bg-neutral-100 transition-colors w-1/5"
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
                className="py-1.5 px-3 cursor-pointer hover:bg-neutral-100 transition-colors w-1/6"
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
                className="py-1.5 px-3 cursor-pointer hover:bg-neutral-100 transition-colors text-right"
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

              return (
                <tr
                  key={item.id}
                  id={`file-row-${item.name}`}
                  onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey)}
                  onDoubleClick={() => onOpenItem(item)}
                  onContextMenu={(e) => onContextMenu(e, item)}
                  className={`border-b border-neutral-100 cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-blue-100/70 text-blue-950 font-medium'
                      : 'hover:bg-neutral-50 text-neutral-800'
                  } ${item.isHidden ? 'opacity-50' : ''}`}
                >
                  <td className="py-1 px-3">
                    <div className="flex items-center gap-2 truncate">
                      {getFileIcon(item)}
                      <span className="truncate">{item.name}</span>
                    </div>
                  </td>
                  <td className="py-1 px-3 text-neutral-500 whitespace-nowrap">
                    {formatWindowsDate(item.modifiedMs)}
                  </td>
                  <td className="py-1 px-3 text-neutral-500 truncate">
                    {getItemTypeDescription(item)}
                  </td>
                  <td className="py-1 px-3 text-neutral-500 text-right whitespace-nowrap">
                    {item.isDir ? '' : formatFileSize(item.size)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  // Grid (Large Icons) View
  if (viewMode === 'grid') {
    return (
      <div
        id="file-view-grid"
        className="flex-1 overflow-auto p-4 bg-white select-none"
        onContextMenu={(e) => {
          if (e.target === e.currentTarget) {
            onContextMenu(e, null);
          }
        }}
      >
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-3">
          {items.map((item) => {
            const isSelected = selectedItems.some((s) => s.id === item.id);

            return (
              <div
                key={item.id}
                id={`file-grid-item-${item.name}`}
                onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey)}
                onDoubleClick={() => onOpenItem(item)}
                onContextMenu={(e) => onContextMenu(e, item)}
                className={`flex flex-col items-center justify-center p-3 rounded-lg border text-center cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-blue-50 border-blue-400 shadow-xs'
                    : 'bg-white border-transparent hover:bg-neutral-50 hover:border-neutral-200'
                } ${item.isHidden ? 'opacity-50' : ''}`}
              >
                <div className="mb-2">
                  {getFileIcon(item, 'w-10 h-10')}
                </div>
                <span className="text-xs text-neutral-800 line-clamp-2 break-all w-full px-1">
                  {item.name}
                </span>
                {!item.isDir && (
                  <span className="text-[10px] text-neutral-400 mt-1">
                    {formatFileSize(item.size)}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Tiles View
  return (
    <div
      id="file-view-tiles"
      className="flex-1 overflow-auto p-3 bg-white select-none"
      onContextMenu={(e) => {
        if (e.target === e.currentTarget) {
          onContextMenu(e, null);
        }
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
        {items.map((item) => {
          const isSelected = selectedItems.some((s) => s.id === item.id);

          return (
            <div
              key={item.id}
              id={`file-tile-item-${item.name}`}
              onClick={(e) => onSelectItem(item, e.ctrlKey || e.metaKey)}
              onDoubleClick={() => onOpenItem(item)}
              onContextMenu={(e) => onContextMenu(e, item)}
              className={`flex items-center gap-3 p-2 rounded-lg border cursor-pointer transition-all ${
                isSelected
                  ? 'bg-blue-50 border-blue-400'
                  : 'bg-white border-neutral-200 hover:bg-neutral-50'
              } ${item.isHidden ? 'opacity-50' : ''}`}
            >
              {getFileIcon(item, 'w-8 h-8')}
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-neutral-800 truncate">{item.name}</div>
                <div className="text-[10px] text-neutral-400 truncate">
                  {item.isDir ? 'File folder' : formatFileSize(item.size)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
