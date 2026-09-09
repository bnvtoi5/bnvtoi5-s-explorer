import React, { useState, useMemo } from 'react';
import {
  Sparkles,
  Folder,
  Briefcase,
  Star,
  Bookmark,
  Layers,
  Palette,
  Code,
  Zap,
  Box,
  FolderOpen,
  Eye,
  Trash2,
  X,
  Search,
  ExternalLink,
  Plus,
  Settings2,
  FolderInput,
  Tag,
  Copy,
  Check,
  FileText,
  FileCode,
  FileImage,
  FileAudio,
  FileVideo,
  FileArchive,
  File,
} from 'lucide-react';
import {
  CustomSpace,
  CustomSpaceItem,
  ViewMode,
  SortField,
  SortOrder,
  FileItem,
} from '../types';
import { formatFileSize, formatWindowsDate } from '../services/fs';

interface CustomSpaceViewProps {
  space: CustomSpace;
  viewMode: ViewMode;
  sortBy: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
  onNavigateToRealFolder: (path: string) => void;
  onPreviewItem: (fileItem: FileItem) => void;
  onRemoveItemFromSpace: (spaceId: string, itemId: string) => void;
  onUpdateItemNote: (spaceId: string, itemId: string, note: string) => void;
  onEditSpace: (space: CustomSpace) => void;
  onDeleteSpace: (spaceId: string) => void;
  onOpenFolderToCollect: () => void;
  onDropFilesIntoSpace?: (files: FileList) => void;
}

const COLOR_CONFIGS = {
  blue: { bg: 'bg-blue-600', lightBg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700', badge: 'bg-blue-100 text-blue-800' },
  purple: { bg: 'bg-purple-600', lightBg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700', badge: 'bg-purple-100 text-purple-800' },
  emerald: { bg: 'bg-emerald-600', lightBg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-800' },
  amber: { bg: 'bg-amber-600', lightBg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', badge: 'bg-amber-100 text-amber-800' },
  rose: { bg: 'bg-rose-600', lightBg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-700', badge: 'bg-rose-100 text-rose-800' },
  indigo: { bg: 'bg-indigo-600', lightBg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', badge: 'bg-indigo-100 text-indigo-800' },
  cyan: { bg: 'bg-cyan-600', lightBg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-700', badge: 'bg-cyan-100 text-cyan-800' },
  slate: { bg: 'bg-slate-600', lightBg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-700', badge: 'bg-slate-100 text-slate-800' },
};

export const CustomSpaceView: React.FC<CustomSpaceViewProps> = ({
  space,
  viewMode,
  sortBy,
  sortOrder,
  onSortChange,
  onNavigateToRealFolder,
  onPreviewItem,
  onRemoveItemFromSpace,
  onUpdateItemNote,
  onEditSpace,
  onDeleteSpace,
  onOpenFolderToCollect,
  onDropFilesIntoSpace,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'folders' | 'docs' | 'images' | 'media' | 'code'>('all');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [noteInput, setNoteInput] = useState('');
  const [copiedPathId, setCopiedPathId] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const colorStyle = COLOR_CONFIGS[space.color] || COLOR_CONFIGS.blue;

  const getSpaceIcon = (iconName: string, className = 'w-5 h-5') => {
    switch (iconName) {
      case 'briefcase': return <Briefcase className={className} />;
      case 'folder': return <Folder className={className} />;
      case 'star': return <Star className={className} />;
      case 'bookmark': return <Bookmark className={className} />;
      case 'layers': return <Layers className={className} />;
      case 'palette': return <Palette className={className} />;
      case 'code': return <Code className={className} />;
      case 'zap': return <Zap className={className} />;
      case 'box': return <Box className={className} />;
      case 'sparkles':
      default:
        return <Sparkles className={className} />;
    }
  };

  const getFileIcon = (item: CustomSpaceItem, sizeClass = 'w-4 h-4') => {
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
    if (['txt', 'md', 'doc', 'docx', 'pdf', 'rtf', 'xlsx', 'pptx'].includes(ext)) {
      return <FileText className={`${sizeClass} text-neutral-600 shrink-0`} />;
    }

    return <File className={`${sizeClass} text-neutral-400 shrink-0`} />;
  };

  // Convert CustomSpaceItem to FileItem for preview modal
  const toFileItem = (item: CustomSpaceItem): FileItem => ({
    id: item.id,
    name: item.name,
    path: item.path,
    isDir: item.isDir,
    size: item.size,
    modifiedMs: item.modifiedMs,
    extension: item.extension,
    isHidden: false,
    handle: item.handle,
  });

  // Calculate total size of non-folder files
  const totalSize = useMemo(() => {
    return space.items.reduce((acc, it) => acc + (it.isDir ? 0 : it.size), 0);
  }, [space.items]);

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let result = [...space.items];

    // Category filter
    if (filterCategory !== 'all') {
      result = result.filter((it) => {
        if (filterCategory === 'folders') return it.isDir;
        if (it.isDir) return false;
        const ext = it.extension?.toLowerCase() || '';
        if (filterCategory === 'images') return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext);
        if (filterCategory === 'docs') return ['txt', 'md', 'doc', 'docx', 'pdf', 'xlsx', 'pptx', 'rtf'].includes(ext);
        if (filterCategory === 'media') return ['mp3', 'wav', 'ogg', 'mp4', 'mkv', 'avi', 'mov'].includes(ext);
        if (filterCategory === 'code') return ['ts', 'tsx', 'js', 'jsx', 'rs', 'py', 'json', 'html', 'css', 'zip', 'rar'].includes(ext);
        return true;
      });
    }

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.path.toLowerCase().includes(q) ||
          (it.note && it.note.toLowerCase().includes(q))
      );
    }

    // Sort
    result.sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;

      let comparison = 0;
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'modified':
          comparison = a.modifiedMs - b.modifiedMs;
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'type':
          comparison = (a.extension || '').localeCompare(b.extension || '');
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [space.items, filterCategory, searchQuery, sortBy, sortOrder]);

  const handleCopyPath = (item: CustomSpaceItem) => {
    navigator.clipboard.writeText(item.path);
    setCopiedPathId(item.id);
    setTimeout(() => setCopiedPathId(null), 1500);
  };

  const handleStartEditNote = (item: CustomSpaceItem) => {
    setEditingNoteId(item.id);
    setNoteInput(item.note || '');
  };

  const handleSaveNote = (itemId: string) => {
    onUpdateItemNote(space.id, itemId, noteInput.trim());
    setEditingNoteId(null);
  };

  // Drag-and-drop events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFilesIntoSpace) {
      onDropFilesIntoSpace(e.dataTransfer.files);
    }
  };

  return (
    <div
      id="custom-space-container"
      className="flex-1 flex flex-col h-full bg-white overflow-hidden select-none"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* 1. Header Banner */}
      <div className={`px-6 py-4 border-b border-neutral-200 ${colorStyle.lightBg} transition-colors shrink-0`}>
        <div className="flex items-start justify-between gap-4">
          {/* Left: Icon, Title, Description, Stats */}
          <div className="flex items-start gap-4 min-w-0">
            <div
              className={`w-12 h-12 rounded-2xl ${colorStyle.bg} flex items-center justify-center text-white shadow-md shrink-0 ring-4 ring-white`}
            >
              {getSpaceIcon(space.icon, 'w-6 h-6')}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-neutral-900 tracking-tight truncate">
                  {space.name}
                </h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${colorStyle.badge}`}>
                  Không Gian Tùy Chỉnh
                </span>
              </div>

              <p className="text-xs text-neutral-600 mt-0.5 max-w-xl line-clamp-1">
                {space.description || 'Gom các file và thư mục quan trọng từ nhiều vị trí khác nhau để quản lý tập trung'}
              </p>

              {/* Stats badges */}
              <div className="flex items-center gap-4 text-[11px] text-neutral-500 mt-2 font-medium">
                <span>
                  <strong className="text-neutral-800">{space.items.length}</strong> mục đã gôm
                </span>
                <span className="text-neutral-300">•</span>
                <span>
                  Tổng dung lượng: <strong className="text-neutral-800">{formatFileSize(totalSize)}</strong>
                </span>
                <span className="text-neutral-300">•</span>
                <span>Tạo ngày: {new Date(space.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              id="btn-space-collect-files"
              onClick={onOpenFolderToCollect}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-neutral-50 text-neutral-800 border border-neutral-300 rounded-lg text-xs font-medium shadow-2xs hover:border-neutral-400 transition-colors"
              title="Mở thư mục từ máy để gôm file vào không gian này"
            >
              <FolderInput className="w-3.5 h-3.5 text-blue-600" />
              <span>Gôm File Từ Máy</span>
            </button>

            <button
              id="btn-space-edit-settings"
              onClick={() => onEditSpace(space)}
              className="p-1.5 bg-white hover:bg-neutral-50 text-neutral-700 border border-neutral-300 rounded-lg text-xs shadow-2xs transition-colors"
              title="Chỉnh sửa tên, màu sắc, biểu tượng"
            >
              <Settings2 className="w-4 h-4" />
            </button>

            <button
              id="btn-space-delete"
              onClick={() => onDeleteSpace(space.id)}
              className="p-1.5 bg-white hover:bg-red-50 text-red-600 border border-neutral-300 hover:border-red-300 rounded-lg text-xs shadow-2xs transition-colors"
              title="Xóa Không Gian này"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 2. Filter & Search Bar */}
      <div className="px-6 py-2.5 border-b border-neutral-200 bg-neutral-50/70 flex items-center justify-between gap-4 shrink-0 text-xs">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto">
          <button
            onClick={() => setFilterCategory('all')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterCategory === 'all'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Tất cả ({space.items.length})
          </button>
          <button
            onClick={() => setFilterCategory('folders')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterCategory === 'folders'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Thư mục
          </button>
          <button
            onClick={() => setFilterCategory('docs')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterCategory === 'docs'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Tài liệu
          </button>
          <button
            onClick={() => setFilterCategory('images')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterCategory === 'images'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Hình ảnh
          </button>
          <button
            onClick={() => setFilterCategory('media')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterCategory === 'media'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Media
          </button>
          <button
            onClick={() => setFilterCategory('code')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
              filterCategory === 'code'
                ? 'bg-neutral-900 text-white'
                : 'bg-neutral-200/70 text-neutral-700 hover:bg-neutral-200'
            }`}
          >
            Code & Nén
          </button>
        </div>

        {/* Search inside this Space */}
        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            placeholder="Lọc file trong không gian này..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1 bg-white border border-neutral-300 rounded-md text-xs focus:border-blue-500 outline-none text-neutral-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* 3. Drag-and-drop feedback banner */}
      {isDragOver && (
        <div className="bg-blue-50 border-2 border-dashed border-blue-500 p-4 text-center text-blue-800 text-xs font-semibold m-4 rounded-xl animate-pulse">
          Thả file vào đây để gôm ngay vào không gian &quot;{space.name}&quot;
        </div>
      )}

      {/* 4. Main Items Area */}
      <div className="flex-1 overflow-y-auto">
        {space.items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-500">
            <div className={`w-16 h-16 rounded-2xl ${colorStyle.lightBg} border ${colorStyle.border} flex items-center justify-center ${colorStyle.text} mb-4 shadow-xs`}>
              {getSpaceIcon(space.icon, 'w-8 h-8')}
            </div>
            <h3 className="text-base font-semibold text-neutral-800 mb-1">
              Chưa có file nào trong không gian &quot;{space.name}&quot;
            </h3>
            <p className="text-xs text-neutral-500 max-w-sm mb-4 leading-relaxed">
              Bạn có thể duyệt bất kỳ thư mục nào trong ứng dụng, nhấp chuột phải vào file/thư mục và chọn{' '}
              <strong className="text-neutral-800">&quot;Gôm vào Không Gian...&quot;</strong>, hoặc bấm nút bên dưới.
            </p>
            <button
              onClick={onOpenFolderToCollect}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Mở thư mục để gom file vào</span>
            </button>
          </div>
        ) : filteredAndSortedItems.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-8 text-center text-neutral-400">
            <Search className="w-8 h-8 mb-2 opacity-50" />
            <p className="text-sm font-medium">Không tìm thấy file phù hợp với bộ lọc</p>
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterCategory('all');
              }}
              className="mt-2 text-xs text-blue-600 hover:underline"
            >
              Đặt lại bộ lọc
            </button>
          </div>
        ) : viewMode === 'details' ? (
          /* DETAILS VIEW */
          <div className="min-w-[750px]">
            {/* Table Header */}
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] font-semibold text-neutral-500 border-b border-neutral-200 bg-neutral-50/50 sticky top-0 z-10">
              <button
                onClick={() => onSortChange('name', sortBy === 'name' && sortOrder === 'asc' ? 'desc' : 'asc')}
                className="col-span-4 flex items-center gap-1 hover:text-neutral-900 text-left"
              >
                <span>Tên File / Thư mục</span>
                {sortBy === 'name' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </button>
              <div className="col-span-3 text-left">Đường dẫn gốc</div>
              <button
                onClick={() => onSortChange('size', sortBy === 'size' && sortOrder === 'asc' ? 'desc' : 'asc')}
                className="col-span-1 text-right hover:text-neutral-900"
              >
                <span>Kích thước</span>
                {sortBy === 'size' && <span>{sortOrder === 'asc' ? '▲' : '▼'}</span>}
              </button>
              <div className="col-span-2 text-left pl-2">Ghi chú / Tag</div>
              <div className="col-span-2 text-right pr-2">Thao tác</div>
            </div>

            {/* Item Rows */}
            <div className="divide-y divide-neutral-100">
              {filteredAndSortedItems.map((item) => {
                const isFolder = item.isDir;
                const isEditingThisNote = editingNoteId === item.id;

                return (
                  <div
                    key={item.id}
                    onDoubleClick={() => {
                      if (isFolder) {
                        onNavigateToRealFolder(item.path);
                      } else {
                        onPreviewItem(toFileItem(item));
                      }
                    }}
                    className="grid grid-cols-12 gap-2 px-4 py-2 items-center text-xs hover:bg-blue-50/40 transition-colors group cursor-pointer"
                  >
                    {/* Col 1: Icon & Name */}
                    <div className="col-span-4 flex items-center gap-2.5 truncate">
                      {getFileIcon(item)}
                      <span className="truncate font-medium text-neutral-800" title={item.name}>
                        {item.name}
                      </span>
                    </div>

                    {/* Col 2: Original Path */}
                    <div className="col-span-3 flex items-center gap-1.5 text-neutral-500 text-[11px] truncate">
                      <span className="truncate font-mono" title={item.path}>
                        {item.path}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCopyPath(item);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-neutral-700 transition-opacity p-0.5"
                        title="Copy đường dẫn gốc"
                      >
                        {copiedPathId === item.id ? (
                          <Check className="w-3 h-3 text-emerald-600" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </div>

                    {/* Col 3: Size */}
                    <div className="col-span-1 text-right text-[11px] text-neutral-500">
                      {isFolder ? 'Thư mục' : formatFileSize(item.size)}
                    </div>

                    {/* Col 4: Note / Tag */}
                    <div className="col-span-2 pl-2">
                      {isEditingThisNote ? (
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveNote(item.id);
                              if (e.key === 'Escape') setEditingNoteId(null);
                            }}
                            autoFocus
                            placeholder="Ghi chú..."
                            className="w-full px-1.5 py-0.5 bg-white border border-blue-400 rounded text-[11px] outline-none"
                          />
                          <button
                            onClick={() => handleSaveNote(item.id)}
                            className="p-0.5 text-blue-600 hover:bg-blue-100 rounded"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            handleStartEditNote(item);
                          }}
                          className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-900 group/tag cursor-pointer truncate"
                          title="Bấm để chỉnh sửa ghi chú"
                        >
                          {item.note ? (
                            <span className="px-1.5 py-0.5 bg-neutral-100 group-hover/tag:bg-neutral-200 text-neutral-700 rounded text-[10px] truncate max-w-full">
                              {item.note}
                            </span>
                          ) : (
                            <span className="opacity-0 group-hover:opacity-100 text-[10px] text-neutral-400 italic flex items-center gap-0.5">
                              <Tag className="w-2.5 h-2.5" /> + Ghi chú
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Col 5: Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-1 text-neutral-500 pr-2">
                      {/* Open Source Location */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const parts = item.path.split(/[/|\\]/).filter(Boolean);
                          parts.pop();
                          const parentDir = parts.join('\\') || 'C:\\';
                          onNavigateToRealFolder(parentDir);
                        }}
                        className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Mở thư mục gốc chứa file này"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>

                      {/* Preview (if file) */}
                      {!isFolder && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onPreviewItem(toFileItem(item));
                          }}
                          className="p-1 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Xem nhanh file"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      )}

                      {/* Remove from this custom space */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onRemoveItemFromSpace(space.id, item.id);
                        }}
                        className="p-1 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Gỡ khỏi Không Gian này (không xóa file gốc trên máy)"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'grid' ? (
          /* GRID VIEW */
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
            {filteredAndSortedItems.map((item) => {
              const isFolder = item.isDir;
              return (
                <div
                  key={item.id}
                  onDoubleClick={() => {
                    if (isFolder) {
                      onNavigateToRealFolder(item.path);
                    } else {
                      onPreviewItem(toFileItem(item));
                    }
                  }}
                  className="group relative flex flex-col items-center justify-between p-3 rounded-xl border border-neutral-200 hover:border-blue-400 bg-white hover:bg-blue-50/20 hover:shadow-sm transition-all cursor-pointer text-center"
                >
                  {/* Top: Remove button on hover */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveItemFromSpace(space.id, item.id);
                    }}
                    className="absolute top-1.5 right-1.5 opacity-0 group-hover:opacity-100 p-1 text-neutral-400 hover:text-red-600 rounded-md hover:bg-neutral-100 transition-all"
                    title="Gỡ khỏi Không Gian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Icon */}
                  <div className="my-2">
                    {getFileIcon(item, 'w-10 h-10')}
                  </div>

                  {/* Name */}
                  <div className="w-full">
                    <div className="text-xs font-medium text-neutral-900 truncate" title={item.name}>
                      {item.name}
                    </div>
                    <div className="text-[10px] text-neutral-400 mt-0.5">
                      {isFolder ? 'Thư mục' : formatFileSize(item.size)}
                    </div>
                    {item.note && (
                      <span className="inline-block mt-1 px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded text-[9px] truncate max-w-full font-medium">
                        {item.note}
                      </span>
                    )}
                  </div>

                  {/* Bottom Hover Actions */}
                  <div className="mt-2 pt-2 border-t border-neutral-100 w-full flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isFolder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewItem(toFileItem(item));
                        }}
                        className="p-1 hover:text-blue-600 rounded"
                        title="Xem trước"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        const parts = item.path.split(/[/|\\]/).filter(Boolean);
                        parts.pop();
                        onNavigateToRealFolder(parts.join('\\') || 'C:\\');
                      }}
                      className="p-1 hover:text-blue-600 rounded"
                      title="Mở thư mục gốc"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* TILES VIEW */
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
            {filteredAndSortedItems.map((item) => {
              const isFolder = item.isDir;
              return (
                <div
                  key={item.id}
                  onDoubleClick={() => {
                    if (isFolder) {
                      onNavigateToRealFolder(item.path);
                    } else {
                      onPreviewItem(toFileItem(item));
                    }
                  }}
                  className="group flex items-center justify-between p-2.5 rounded-lg border border-neutral-200 hover:border-blue-400 bg-white hover:bg-blue-50/30 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {getFileIcon(item, 'w-6 h-6')}
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-neutral-900 truncate" title={item.name}>
                        {item.name}
                      </div>
                      <div className="text-[10px] text-neutral-500">
                        {isFolder ? 'Thư mục' : formatFileSize(item.size)}
                        {item.note && ` • ${item.note}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isFolder && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onPreviewItem(toFileItem(item));
                        }}
                        className="p-1 hover:text-blue-600 rounded"
                        title="Xem trước"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveItemFromSpace(space.id, item.id);
                      }}
                      className="p-1 hover:text-red-600 rounded"
                      title="Gỡ khỏi Không Gian"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
