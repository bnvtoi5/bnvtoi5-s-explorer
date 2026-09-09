import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RefreshCw,
  Search,
  X,
  Copy,
  Check,
  Folder,
} from 'lucide-react';

interface AddressBarProps {
  currentPath: string;
  canGoBack: boolean;
  canGoForward: boolean;
  canGoUp: boolean;
  onNavigateBack: () => void;
  onNavigateForward: () => void;
  onNavigateUp: () => void;
  onRefresh: () => void;
  onNavigateToPath: (path: string) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const AddressBar: React.FC<AddressBarProps> = ({
  currentPath,
  canGoBack,
  canGoForward,
  canGoUp,
  onNavigateBack,
  onNavigateForward,
  onNavigateUp,
  onRefresh,
  onNavigateToPath,
  searchQuery,
  onSearchChange,
}) => {
  const [isEditingPath, setIsEditingPath] = useState(false);
  const [typedPath, setTypedPath] = useState(currentPath);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setTypedPath(currentPath);
  }, [currentPath]);

  // Break currentPath into breadcrumb segments
  const segments = currentPath
    ? currentPath.split(/[/|\\]/).filter(Boolean)
    : [];

  const handleSegmentClick = (index: number) => {
    if (!currentPath) return;
    const isWindowsPath = currentPath.includes('\\') || /^[a-zA-Z]:/.test(currentPath);
    const separator = isWindowsPath ? '\\' : '/';
    const newPath = segments.slice(0, index + 1).join(separator);
    onNavigateToPath(newPath);
  };

  const handleCopyPath = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (currentPath) {
      navigator.clipboard.writeText(currentPath);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handlePathSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (typedPath.trim()) {
      onNavigateToPath(typedPath.trim());
    }
    setIsEditingPath(false);
  };

  return (
    <div
      id="explorer-address-bar-container"
      className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-neutral-200 select-none text-neutral-800"
    >
      {/* Navigation Buttons */}
      <div className="flex items-center gap-0.5">
        <button
          id="btn-nav-back"
          onClick={onNavigateBack}
          disabled={!canGoBack}
          className={`p-1.5 rounded-md transition-colors ${
            canGoBack
              ? 'hover:bg-neutral-100 text-neutral-700'
              : 'text-neutral-300 cursor-not-allowed'
          }`}
          title="Back (Alt+Left Arrow)"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        <button
          id="btn-nav-forward"
          onClick={onNavigateForward}
          disabled={!canGoForward}
          className={`p-1.5 rounded-md transition-colors ${
            canGoForward
              ? 'hover:bg-neutral-100 text-neutral-700'
              : 'text-neutral-300 cursor-not-allowed'
          }`}
          title="Forward (Alt+Right Arrow)"
        >
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          id="btn-nav-up"
          onClick={onNavigateUp}
          disabled={!canGoUp}
          className={`p-1.5 rounded-md transition-colors ${
            canGoUp
              ? 'hover:bg-neutral-100 text-neutral-700'
              : 'text-neutral-300 cursor-not-allowed'
          }`}
          title="Up to parent folder (Alt+Up Arrow)"
        >
          <ArrowUp className="w-4 h-4" />
        </button>

        <button
          id="btn-nav-refresh"
          onClick={onRefresh}
          className="p-1.5 rounded-md hover:bg-neutral-100 text-neutral-700 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Breadcrumb / Address Bar */}
      <div className="flex-1 relative">
        {isEditingPath ? (
          <form onSubmit={handlePathSubmit} className="w-full">
            <input
              id="input-address-path"
              type="text"
              value={typedPath}
              onChange={(e) => setTypedPath(e.target.value)}
              onBlur={() => setIsEditingPath(false)}
              autoFocus
              className="w-full px-3 py-1.5 text-xs bg-neutral-50 border border-blue-500 rounded-md outline-none text-neutral-800"
            />
          </form>
        ) : (
          <div
            id="breadcrumbs-bar"
            onClick={() => setIsEditingPath(true)}
            className="flex items-center justify-between w-full px-2 py-1 bg-neutral-50 hover:bg-neutral-100/80 border border-neutral-200 rounded-md cursor-text text-xs min-h-[30px] transition-colors"
          >
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
              <Folder className="w-3.5 h-3.5 text-amber-500 shrink-0" />

              {segments.length === 0 ? (
                <span className="text-neutral-400 italic">No folder open</span>
              ) : (
                segments.map((segment, idx) => (
                  <React.Fragment key={idx}>
                    <button
                      id={`breadcrumb-segment-${idx}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSegmentClick(idx);
                      }}
                      className="px-1.5 py-0.5 rounded hover:bg-neutral-200 text-neutral-700 hover:text-neutral-900 transition-colors"
                    >
                      {segment}
                    </button>
                    {idx < segments.length - 1 && (
                      <span className="text-neutral-400 text-[10px]">&gt;</span>
                    )}
                  </React.Fragment>
                ))
              )}
            </div>

            {currentPath && (
              <button
                id="btn-copy-address"
                onClick={handleCopyPath}
                className="p-1 text-neutral-400 hover:text-neutral-700 rounded hover:bg-neutral-200/60 ml-1 transition-colors"
                title="Copy path"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Real-time Search Box */}
      <div className="w-64 relative">
        <div className="flex items-center px-2.5 py-1 bg-neutral-50 border border-neutral-200 focus-within:border-blue-500 focus-within:bg-white rounded-md transition-all">
          <Search className="w-3.5 h-3.5 text-neutral-400 shrink-0 mr-1.5" />
          <input
            id="input-file-search"
            type="text"
            placeholder={segments.length > 0 ? `Search ${segments[segments.length - 1]}` : 'Search files...'}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full bg-transparent text-xs text-neutral-800 placeholder-neutral-400 outline-none"
          />
          {searchQuery && (
            <button
              id="btn-clear-search"
              onClick={() => onSearchChange('')}
              className="p-0.5 text-neutral-400 hover:text-neutral-700"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
