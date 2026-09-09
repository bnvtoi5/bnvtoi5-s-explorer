import React, { useState, useEffect } from 'react';
import {
  X,
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
} from 'lucide-react';
import { CustomSpace, SpaceColor, SpaceIcon } from '../types';

interface CustomSpaceModalProps {
  isOpen: boolean;
  editingSpace?: CustomSpace | null;
  onClose: () => void;
  onSave: (spaceData: {
    name: string;
    description: string;
    color: SpaceColor;
    icon: SpaceIcon;
  }) => void;
}

const AVAILABLE_COLORS: { id: SpaceColor; label: string; bg: string; ring: string; text: string }[] = [
  { id: 'blue', label: 'Blue', bg: 'bg-blue-500', ring: 'ring-blue-500', text: 'text-blue-600' },
  { id: 'purple', label: 'Purple', bg: 'bg-purple-500', ring: 'ring-purple-500', text: 'text-purple-600' },
  { id: 'emerald', label: 'Emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500', text: 'text-emerald-600' },
  { id: 'amber', label: 'Amber', bg: 'bg-amber-500', ring: 'ring-amber-500', text: 'text-amber-600' },
  { id: 'rose', label: 'Rose', bg: 'bg-rose-500', ring: 'ring-rose-500', text: 'text-rose-600' },
  { id: 'indigo', label: 'Indigo', bg: 'bg-indigo-500', ring: 'ring-indigo-500', text: 'text-indigo-600' },
  { id: 'cyan', label: 'Cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-500', text: 'text-cyan-600' },
  { id: 'slate', label: 'Slate', bg: 'bg-slate-500', ring: 'ring-slate-500', text: 'text-slate-600' },
];

const AVAILABLE_ICONS: { id: SpaceIcon; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'sparkles', label: 'Nổi bật', icon: Sparkles },
  { id: 'briefcase', label: 'Công việc', icon: Briefcase },
  { id: 'folder', label: 'Thư mục', icon: Folder },
  { id: 'star', label: 'Quan trọng', icon: Star },
  { id: 'bookmark', label: 'Đánh dấu', icon: Bookmark },
  { id: 'layers', label: 'Dự án', icon: Layers },
  { id: 'palette', label: 'Thiết kế', icon: Palette },
  { id: 'code', label: 'Kỹ thuật', icon: Code },
  { id: 'zap', label: 'Tác vụ nhanh', icon: Zap },
  { id: 'box', label: 'Lưu trữ', icon: Box },
];

export const CustomSpaceModal: React.FC<CustomSpaceModalProps> = ({
  isOpen,
  editingSpace,
  onClose,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState<SpaceColor>('blue');
  const [icon, setIcon] = useState<SpaceIcon>('sparkles');

  useEffect(() => {
    if (editingSpace) {
      setName(editingSpace.name);
      setDescription(editingSpace.description || '');
      setColor(editingSpace.color);
      setIcon(editingSpace.icon);
    } else {
      setName('');
      setDescription('');
      setColor('blue');
      setIcon('sparkles');
    }
  }, [editingSpace, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      description: description.trim(),
      color,
      icon,
    });
    onClose();
  };

  const selectedColorDef = AVAILABLE_COLORS.find((c) => c.id === color) || AVAILABLE_COLORS[0];
  const selectedIconDef = AVAILABLE_ICONS.find((i) => i.id === icon) || AVAILABLE_ICONS[0];
  const SelectedIconComponent = selectedIconDef.icon;

  return (
    <div
      id="custom-space-modal-overlay"
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none"
      onClick={onClose}
    >
      <div
        id="custom-space-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-neutral-300 w-full max-w-md overflow-hidden text-xs text-neutral-800 animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-neutral-100/80 border-b border-neutral-200">
          <div className="flex items-center gap-2.5">
            <div className={`w-7 h-7 rounded-lg ${selectedColorDef.bg} flex items-center justify-center text-white shadow-xs`}>
              <SelectedIconComponent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-neutral-900 text-sm">
                {editingSpace ? 'Chỉnh sửa Không Gian' : 'Tạo Không Gian Tùy Chỉnh Mới'}
              </h3>
              <p className="text-[11px] text-neutral-500">
                Gom nhóm các file, thư mục từ nhiều nơi vào một khu vực tập trung
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-800 rounded-md hover:bg-neutral-200/80 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Form */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Space Name */}
          <div>
            <label className="block text-neutral-700 font-medium mb-1.5 text-xs">
              Tên Không Gian <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Dự Án 2026, Tài Liệu Thuế, Media Thiết Kế..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none text-neutral-900 transition-colors shadow-2xs"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-neutral-700 font-medium mb-1.5 text-xs">
              Mô tả / Ghi chú nhanh (Tùy chọn)
            </label>
            <input
              type="text"
              placeholder="VD: Chứa toàn bộ hợp đồng và bản vẽ cần bàn giao"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 focus:border-blue-500 focus:bg-white rounded-lg text-xs outline-none text-neutral-900 transition-colors shadow-2xs"
            />
          </div>

          {/* Color Chooser */}
          <div>
            <label className="block text-neutral-700 font-medium mb-1.5 text-xs">
              Màu sắc đại diện
            </label>
            <div className="flex items-center gap-2.5 flex-wrap">
              {AVAILABLE_COLORS.map((c) => {
                const isSelected = color === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setColor(c.id)}
                    className={`w-7 h-7 rounded-full ${c.bg} transition-all duration-150 flex items-center justify-center ${
                      isSelected ? 'ring-3 ring-offset-2 ring-neutral-400 scale-110 shadow-sm' : 'hover:scale-105 opacity-80 hover:opacity-100'
                    }`}
                    title={c.label}
                  />
                );
              })}
            </div>
          </div>

          {/* Icon Chooser */}
          <div>
            <label className="block text-neutral-700 font-medium mb-1.5 text-xs">
              Biểu tượng
            </label>
            <div className="grid grid-cols-5 gap-2">
              {AVAILABLE_ICONS.map((i) => {
                const isSelected = icon === i.id;
                const IconCmp = i.icon;
                return (
                  <button
                    key={i.id}
                    type="button"
                    onClick={() => setIcon(i.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${
                      isSelected
                        ? 'border-blue-500 bg-blue-50/80 text-blue-700 shadow-2xs'
                        : 'border-neutral-200 hover:border-neutral-300 hover:bg-neutral-50 text-neutral-600'
                    }`}
                  >
                    <IconCmp className="w-4 h-4 mb-1" />
                    <span className="text-[10px] truncate max-w-full font-medium">{i.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Preview Card */}
          <div className="bg-neutral-50 border border-neutral-200/80 rounded-xl p-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl ${selectedColorDef.bg} flex items-center justify-center text-white shadow-xs shrink-0`}>
              <SelectedIconComponent className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold text-neutral-900 truncate">
                {name.trim() || 'Tên Không Gian Của Bạn'}
              </div>
              <div className="text-[11px] text-neutral-500 truncate">
                {description.trim() || 'Khu vực gom các file theo nhu cầu'}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-lg font-medium text-xs transition-colors"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium text-xs shadow-xs transition-colors"
            >
              {editingSpace ? 'Lưu Thay Đổi' : 'Tạo Không Gian'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
