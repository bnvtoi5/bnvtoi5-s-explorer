import React from 'react';
import { Folder, File, X } from 'lucide-react';
import { FileItem } from '../types';
import { formatFileSize, formatWindowsDate } from '../services/fs';

interface PropertiesModalProps {
  item: FileItem | null;
  currentPath: string;
  onClose: () => void;
}

export const PropertiesModal: React.FC<PropertiesModalProps> = ({
  item,
  currentPath,
  onClose,
}) => {
  const isFolder = item ? item.isDir : true;
  const name = item ? item.name : currentPath.split(/[/|\\]/).pop() || currentPath;
  const location = item ? item.path : currentPath;

  return (
    <div
      id="properties-modal-overlay"
      className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none"
      onClick={onClose}
    >
      <div
        id="properties-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-neutral-300 w-full max-w-sm overflow-hidden text-xs text-neutral-800"
      >
        {/* Title bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-neutral-100 border-b border-neutral-200">
          <span className="font-semibold text-neutral-700">{name} Properties</span>
          <button
            id="btn-close-properties"
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-200"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Header */}
          <div className="flex items-center gap-3 pb-3 border-b border-neutral-200">
            {isFolder ? (
              <Folder className="w-10 h-10 text-amber-500 fill-amber-500/20" />
            ) : (
              <File className="w-10 h-10 text-blue-500" />
            )}
            <div className="truncate">
              <div className="font-semibold text-sm text-neutral-900 truncate">{name}</div>
              <div className="text-neutral-400 text-[11px]">
                {isFolder ? 'File folder' : `${item?.extension?.toUpperCase() || ''} File`}
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="space-y-2 text-[11px]">
            <div className="grid grid-cols-3 gap-2">
              <span className="text-neutral-500">Type of file:</span>
              <span className="col-span-2 text-neutral-800 font-medium">
                {isFolder ? 'File folder' : `${item?.extension?.toUpperCase() || ''} File`}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <span className="text-neutral-500">Location:</span>
              <span className="col-span-2 text-neutral-800 font-mono text-[10px] break-all">
                {location}
              </span>
            </div>

            {!isFolder && item && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-neutral-500">Size:</span>
                <span className="col-span-2 text-neutral-800 font-medium">
                  {formatFileSize(item.size)} ({item.size.toLocaleString()} bytes)
                </span>
              </div>
            )}

            {item && (
              <div className="grid grid-cols-3 gap-2">
                <span className="text-neutral-500">Modified:</span>
                <span className="col-span-2 text-neutral-800">
                  {formatWindowsDate(item.modifiedMs)}
                </span>
              </div>
            )}

            <div className="grid grid-cols-3 gap-2">
              <span className="text-neutral-500">Attributes:</span>
              <span className="col-span-2 text-neutral-800">
                {item?.isHidden ? 'Hidden' : 'Standard'}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 bg-neutral-50 border-t border-neutral-200">
          <button
            id="btn-properties-ok"
            onClick={onClose}
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium text-xs shadow-xs"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
};
