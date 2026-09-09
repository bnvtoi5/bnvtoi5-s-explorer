import React, { useState, useEffect } from 'react';
import { X, FolderPlus, FilePlus, Edit2, Trash2 } from 'lucide-react';

export type ModalType = 'new-folder' | 'new-file' | 'rename' | 'confirm-delete' | null;

interface InputModalProps {
  type: ModalType;
  initialValue?: string;
  itemName?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (value: string) => void;
  onConfirmDelete: () => void;
}

export const InputModal: React.FC<InputModalProps> = ({
  type,
  initialValue = '',
  itemName = '',
  isOpen,
  onClose,
  onSubmit,
  onConfirmDelete,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, isOpen]);

  if (!isOpen || !type) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'confirm-delete') {
      onConfirmDelete();
    } else if (value.trim()) {
      onSubmit(value.trim());
    }
    onClose();
  };

  const getTitle = () => {
    switch (type) {
      case 'new-folder':
        return 'New Folder';
      case 'new-file':
        return 'New Text Document';
      case 'rename':
        return 'Rename';
      case 'confirm-delete':
        return 'Delete File or Folder';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'new-folder':
        return <FolderPlus className="w-5 h-5 text-amber-500" />;
      case 'new-file':
        return <FilePlus className="w-5 h-5 text-blue-500" />;
      case 'rename':
        return <Edit2 className="w-5 h-5 text-neutral-600" />;
      case 'confirm-delete':
        return <Trash2 className="w-5 h-5 text-red-500" />;
    }
  };

  return (
    <div
      id="input-modal-overlay"
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none"
      onClick={onClose}
    >
      <div
        id="input-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-neutral-300 w-full max-w-sm overflow-hidden text-xs text-neutral-800 animate-in fade-in zoom-in-95 duration-75"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            {getIcon()}
            <span className="font-semibold text-neutral-800">{getTitle()}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit}>
          <div className="p-4 space-y-3">
            {type === 'confirm-delete' ? (
              <p className="text-neutral-600 leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <strong className="text-neutral-900">{itemName}</strong>?
              </p>
            ) : (
              <div>
                <label className="block text-neutral-500 mb-1 text-[11px]">
                  {type === 'rename' ? 'New name:' : 'Item name:'}
                </label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  autoFocus
                  required
                  className="w-full px-3 py-1.5 bg-neutral-50 border border-neutral-300 focus:border-blue-500 focus:bg-white rounded-md text-xs outline-none text-neutral-900"
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 px-4 py-2.5 bg-neutral-50 border-t border-neutral-200">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 bg-neutral-200 hover:bg-neutral-300 text-neutral-700 rounded-md font-medium text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-1.5 rounded-md font-medium text-xs text-white shadow-xs transition-colors ${
                type === 'confirm-delete'
                  ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {type === 'confirm-delete' ? 'Delete' : 'OK'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
