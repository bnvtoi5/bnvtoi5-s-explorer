import React, { useState, useEffect } from 'react';
import { X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react';
import { FileItem } from '../types';
import { readFileContent, formatFileSize } from '../services/fs';

interface FilePreviewModalProps {
  item: FileItem;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ item, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState<string>('');
  const [previewType, setPreviewType] = useState<'text' | 'image' | 'binary'>('text');

  useEffect(() => {
    let isMounted = true;
    readFileContent(item)
      .then((res) => {
        if (isMounted) {
          setContent(res.content);
          setPreviewType(res.type);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setContent(`Error reading file: ${err.message}`);
          setPreviewType('text');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [item]);

  return (
    <div
      id="file-preview-overlay"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-6 select-none"
      onClick={onClose}
    >
      <div
        id="file-preview-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-2xl border border-neutral-300 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-xs text-neutral-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-neutral-100 border-b border-neutral-200">
          <div className="flex items-center gap-2 truncate">
            {previewType === 'image' ? (
              <ImageIcon className="w-4 h-4 text-purple-600 shrink-0" />
            ) : (
              <FileText className="w-4 h-4 text-blue-600 shrink-0" />
            )}
            <span className="font-semibold text-neutral-900 truncate">{item.name}</span>
            <span className="text-neutral-400 text-[11px]">({formatFileSize(item.size)})</span>
          </div>

          <button
            id="btn-close-preview"
            onClick={onClose}
            className="p-1 text-neutral-500 hover:text-neutral-800 rounded hover:bg-neutral-200 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto p-4 bg-neutral-50">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
              <span>Loading file preview...</span>
            </div>
          ) : previewType === 'image' ? (
            <div className="flex items-center justify-center min-h-[300px] bg-neutral-900/5 rounded-lg p-4">
              <img
                src={content}
                alt={item.name}
                className="max-h-[60vh] max-w-full object-contain rounded shadow-xs"
              />
            </div>
          ) : (
            <pre className="font-mono text-xs text-neutral-800 whitespace-pre-wrap bg-white p-4 rounded-lg border border-neutral-200 leading-relaxed overflow-x-auto selection:bg-blue-100">
              {content}
            </pre>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-t border-neutral-200 text-neutral-500 text-[11px]">
          <span className="truncate max-w-md font-mono text-[10px]">{item.path}</span>
          <button
            id="btn-preview-done"
            onClick={onClose}
            className="px-3 py-1 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 rounded font-medium text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
