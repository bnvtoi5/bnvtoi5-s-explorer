import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  FileItem,
  DriveInfo,
  KnownFolder,
  UserPreferences,
  ViewMode,
  SortField,
  SortOrder,
  ContextMenuState,
  CustomSpace,
  CustomSpaceItem,
  SpaceColor,
  SpaceIcon,
} from './types';
import {
  isTauri,
  loadUserPreferences,
  saveUserPreferences,
  getSystemDrives,
  getKnownFolders,
  promptOpenFolder,
  readDirectoryItems,
  searchRealFiles,
  createRealFolder,
  deleteRealItem,
} from './services/fs';
import { CommandBar } from './components/CommandBar';
import { AddressBar } from './components/AddressBar';
import { Sidebar } from './components/Sidebar';
import { FileListView } from './components/FileListView';
import { CustomSpaceView } from './components/CustomSpaceView';
import { CustomSpaceModal } from './components/CustomSpaceModal';
import { ContextMenu } from './components/ContextMenu';
import { PropertiesModal } from './components/PropertiesModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { InstallerGuideModal } from './components/InstallerGuideModal';
import { InputModal, ModalType } from './components/InputModal';
import { StatusBar } from './components/StatusBar';
import { CheckCircle2, Layers } from 'lucide-react';

export default function App() {
  // Navigation & Directory state
  const [currentPath, setCurrentPath] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([]);

  // System & Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    pinnedFolders: [],
    customSpaces: [
      {
        id: 'space_default_hub',
        name: 'Khu vực làm việc chính',
        color: 'blue',
        icon: 'sparkles',
        description: 'Gom các file quan trọng từ nhiều thư mục khác nhau vào đây để truy cập nhanh',
        createdAt: Date.now(),
        items: [],
      },
    ],
    theme: 'light',
    viewMode: 'details',
    showHiddenFiles: false,
    sortBy: 'name',
    sortOrder: 'asc',
    activeSpaceId: null,
  });
  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [knownFolders, setKnownFolders] = useState<KnownFolder[]>([]);

  // Active Custom Space State
  const [activeSpaceId, setActiveSpaceId] = useState<string | null>(null);
  const [isSpaceModalOpen, setIsSpaceModalOpen] = useState<boolean>(false);
  const [editingSpace, setEditingSpace] = useState<CustomSpace | null>(null);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<{ id: number; title: string; desc: string } | null>(null);

  // Context Menu state
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({
    x: 0,
    y: 0,
    item: null,
    isOpen: false,
  });

  // Modal dialog states
  const [propertiesItem, setPropertiesItem] = useState<{ item: FileItem | null; isOpen: boolean }>({
    item: null,
    isOpen: false,
  });
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  const [inputModal, setInputModal] = useState<{
    type: ModalType;
    initialValue?: string;
    itemName?: string;
    targetItem?: FileItem | null;
    isOpen: boolean;
  }>({
    type: null,
    isOpen: false,
  });
  const [isInstallerGuideOpen, setIsInstallerGuideOpen] = useState<boolean>(false);

  const showToast = (title: string, desc: string) => {
    const id = Date.now();
    setToastMessage({ id, title, desc });
    setTimeout(() => {
      setToastMessage((cur) => (cur?.id === id ? null : cur));
    }, 3500);
  };

  // Load initial settings and drives
  useEffect(() => {
    async function init() {
      const prefs = await loadUserPreferences();
      setPreferences(prefs);
      if (prefs.activeSpaceId) {
        setActiveSpaceId(prefs.activeSpaceId);
      }

      const sysDrives = await getSystemDrives();
      setDrives(sysDrives);

      const kf = await getKnownFolders();
      setKnownFolders(kf);

      // In Tauri or if lastVisitedPath is set, open initial folder if no space active
      if (!prefs.activeSpaceId) {
        if (isTauri() && sysDrives.length > 0) {
          navigateTo(sysDrives[0].path, false);
        } else if (prefs.lastVisitedPath) {
          navigateTo(prefs.lastVisitedPath, false);
        }
      }
    }
    init();
  }, []);

  // Update preferences helper
  const updatePreferences = useCallback(
    (updater: (prev: UserPreferences) => UserPreferences) => {
      setPreferences((prev) => {
        const next = updater(prev);
        saveUserPreferences(next);
        return next;
      });
    },
    []
  );

  // Load directory items
  const loadDirectory = useCallback(
    async (path: string) => {
      if (!path) {
        setItems([]);
        return;
      }

      setLoading(true);
      try {
        const fileItems = await readDirectoryItems(path, preferences.showHiddenFiles);
        setItems(fileItems);
        setSelectedItems([]);
      } catch {
        setItems([]);
      } finally {
        setLoading(false);
      }
    },
    [preferences.showHiddenFiles]
  );

  // Reload current directory
  const handleRefresh = useCallback(() => {
    if (currentPath) {
      loadDirectory(currentPath);
    }
  }, [currentPath, loadDirectory]);

  // Navigate to path with history tracking
  const navigateTo = useCallback(
    (newPath: string, pushHistory = true) => {
      if (!newPath) return;

      // Exiting space when navigating to path
      setActiveSpaceId(null);
      updatePreferences((p) => ({ ...p, activeSpaceId: null }));

      if (pushHistory) {
        setHistory((prev) => {
          const updated = prev.slice(0, historyIndex + 1);
          return [...updated, newPath];
        });
        setHistoryIndex((prev) => prev + 1);
      }

      setCurrentPath(newPath);
      setSearchQuery('');
      loadDirectory(newPath);
    },
    [historyIndex, loadDirectory, updatePreferences]
  );

  // Custom Space navigation
  const handleSelectSpace = (spaceId: string) => {
    setActiveSpaceId(spaceId);
    updatePreferences((p) => ({ ...p, activeSpaceId: spaceId }));
  };

  const handleExitSpace = () => {
    setActiveSpaceId(null);
    updatePreferences((p) => ({ ...p, activeSpaceId: null }));
    if (currentPath) {
      loadDirectory(currentPath);
    }
  };

  // Custom Space Management: Create, Edit, Delete
  const handleOpenCreateSpace = () => {
    setEditingSpace(null);
    setIsSpaceModalOpen(true);
  };

  const handleOpenEditSpace = (space: CustomSpace) => {
    setEditingSpace(space);
    setIsSpaceModalOpen(true);
  };

  const handleSaveSpace = (data: {
    name: string;
    description: string;
    color: SpaceColor;
    icon: SpaceIcon;
  }) => {
    if (editingSpace) {
      // Edit existing
      updatePreferences((prev) => ({
        ...prev,
        customSpaces: prev.customSpaces.map((s) =>
          s.id === editingSpace.id ? { ...s, ...data } : s
        ),
      }));
      showToast('Đã lưu thay đổi', `Không gian "${data.name}" đã được cập nhật`);
    } else {
      // Create new
      const newSpace: CustomSpace = {
        id: 'space_' + Date.now(),
        name: data.name,
        description: data.description,
        color: data.color,
        icon: data.icon,
        createdAt: Date.now(),
        items: [],
      };
      updatePreferences((prev) => ({
        ...prev,
        customSpaces: [...prev.customSpaces, newSpace],
        activeSpaceId: newSpace.id,
      }));
      setActiveSpaceId(newSpace.id);
      showToast('Đã tạo Không Gian Mới', `Đã tạo "${data.name}". Hãy gôm các file bạn muốn vào đây!`);
    }
  };

  const handleDeleteSpace = (spaceId: string) => {
    const space = preferences.customSpaces.find((s) => s.id === spaceId);
    if (!space) return;

    if (confirm(`Bạn có chắc muốn xóa không gian "${space.name}"? (Các file gốc trên máy tính sẽ KHÔNG bị xóa)`)) {
      updatePreferences((prev) => ({
        ...prev,
        customSpaces: prev.customSpaces.filter((s) => s.id !== spaceId),
        activeSpaceId: prev.activeSpaceId === spaceId ? null : prev.activeSpaceId,
      }));

      if (activeSpaceId === spaceId) {
        setActiveSpaceId(null);
      }
      showToast('Đã xóa không gian', `Không gian "${space.name}" đã được gỡ bỏ`);
    }
  };

  // Add Item(s) to Space
  const handleAddItemToSpace = (spaceId: string, item: FileItem) => {
    const targetSpace = preferences.customSpaces.find((s) => s.id === spaceId);
    if (!targetSpace) return;

    // Check if already in space
    const alreadyExists = targetSpace.items.some((it) => it.path === item.path);
    if (alreadyExists) {
      showToast('Mục đã có trong Không Gian', `"${item.name}" đã nằm trong "${targetSpace.name}"`);
      return;
    }

    const newItem: CustomSpaceItem = {
      id: 'it_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      name: item.name,
      path: item.path,
      isDir: item.isDir,
      size: item.size,
      modifiedMs: item.modifiedMs,
      extension: item.extension,
      addedAt: Date.now(),
      handle: item.handle,
    };

    updatePreferences((prev) => ({
      ...prev,
      customSpaces: prev.customSpaces.map((s) =>
        s.id === spaceId ? { ...s, items: [newItem, ...s.items] } : s
      ),
    }));

    showToast('Đã gôm vào Không Gian', `Đã thêm "${item.name}" vào "${targetSpace.name}"`);
  };

  const handleAddMultipleSelectedToSpace = (spaceId: string) => {
    if (selectedItems.length === 0) return;
    const targetSpace = preferences.customSpaces.find((s) => s.id === spaceId);
    if (!targetSpace) return;

    let addedCount = 0;
    const newItems: CustomSpaceItem[] = [];

    for (const item of selectedItems) {
      if (!targetSpace.items.some((it) => it.path === item.path)) {
        newItems.push({
          id: 'it_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
          name: item.name,
          path: item.path,
          isDir: item.isDir,
          size: item.size,
          modifiedMs: item.modifiedMs,
          extension: item.extension,
          addedAt: Date.now(),
          handle: item.handle,
        });
        addedCount++;
      }
    }

    if (newItems.length > 0) {
      updatePreferences((prev) => ({
        ...prev,
        customSpaces: prev.customSpaces.map((s) =>
          s.id === spaceId ? { ...s, items: [...newItems, ...s.items] } : s
        ),
      }));
    }

    showToast(
      'Gôm file thành công',
      `Đã gom ${addedCount} mục vào không gian "${targetSpace.name}"`
    );
  };

  const handleRemoveItemFromSpace = (spaceId: string, itemId: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customSpaces: prev.customSpaces.map((s) =>
        s.id === spaceId
          ? { ...s, items: s.items.filter((it) => it.id !== itemId) }
          : s
      ),
    }));
  };

  const handleUpdateItemNote = (spaceId: string, itemId: string, note: string) => {
    updatePreferences((prev) => ({
      ...prev,
      customSpaces: prev.customSpaces.map((s) =>
        s.id === spaceId
          ? {
              ...s,
              items: s.items.map((it) =>
                it.id === itemId ? { ...it, note } : it
              ),
            }
          : s
      ),
    }));
  };

  // Drop files directly from desktop / browser into active space
  const handleDropFilesIntoSpace = (files: FileList) => {
    if (!activeSpaceId) return;
    const targetSpace = preferences.customSpaces.find((s) => s.id === activeSpaceId);
    if (!targetSpace) return;

    const newItems: CustomSpaceItem[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      newItems.push({
        id: 'it_drop_' + Date.now() + '_' + i,
        name: file.name,
        path: (file as unknown as { webkitRelativePath?: string }).webkitRelativePath || file.name,
        isDir: false,
        size: file.size,
        modifiedMs: file.lastModified,
        extension: file.name.split('.').pop() || '',
        addedAt: Date.now(),
      });
    }

    updatePreferences((prev) => ({
      ...prev,
      customSpaces: prev.customSpaces.map((s) =>
        s.id === activeSpaceId ? { ...s, items: [...newItems, ...s.items] } : s
      ),
    }));

    showToast(
      'Đã thả file vào Không Gian',
      `Đã gôm ${files.length} file vào "${targetSpace.name}"`
    );
  };

  // History navigation
  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex < history.length - 1;
  const canGoUp = Boolean(
    currentPath &&
      (currentPath.includes('/') || currentPath.includes('\\')) &&
      currentPath !== 'C:\\' &&
      currentPath !== '/'
  );

  const handleNavigateBack = () => {
    if (canGoBack) {
      const nextIdx = historyIndex - 1;
      const target = history[nextIdx];
      setHistoryIndex(nextIdx);
      setCurrentPath(target);
      setSearchQuery('');
      loadDirectory(target);
    }
  };

  const handleNavigateForward = () => {
    if (canGoForward) {
      const nextIdx = historyIndex + 1;
      const target = history[nextIdx];
      setHistoryIndex(nextIdx);
      setCurrentPath(target);
      setSearchQuery('');
      loadDirectory(target);
    }
  };

  const handleNavigateUp = () => {
    if (!canGoUp) return;
    const isWindows = currentPath.includes('\\');
    const separator = isWindows ? '\\' : '/';
    const parts = currentPath.split(separator).filter(Boolean);
    parts.pop();
    const parentPath = parts.join(separator) || (isWindows ? 'C:\\' : '/');
    navigateTo(parentPath);
  };

  // Open real folder picker (Web API or Tauri)
  const handleOpenFolderPicker = async () => {
    try {
      const res = await promptOpenFolder();
      if (res) {
        navigateTo(res.path);
        const sysDrives = await getSystemDrives();
        setDrives(sysDrives);
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to open directory');
    }
  };

  // Search real files
  useEffect(() => {
    if (!searchQuery.trim() || !currentPath || activeSpaceId) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchRealFiles(currentPath, searchQuery);
      setSearchResults(results);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPath, activeSpaceId]);

  // Sort and filter displayed items in normal explorer
  const displayedItems = useMemo(() => {
    const raw = searchQuery.trim() ? searchResults : items;
    const sorted = [...raw];

    sorted.sort((a, b) => {
      // Folders always first
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;

      let comparison = 0;
      switch (preferences.sortBy) {
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

      return preferences.sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [items, searchResults, searchQuery, preferences.sortBy, preferences.sortOrder]);

  // Selection handlers
  const handleSelectItem = (item: FileItem, isMulti: boolean) => {
    if (isMulti) {
      setSelectedItems((prev) =>
        prev.some((s) => s.id === item.id)
          ? prev.filter((s) => s.id !== item.id)
          : [...prev, item]
      );
    } else {
      setSelectedItems([item]);
    }
  };

  // Open item (double click or Enter)
  const handleOpenItem = (item: FileItem) => {
    if (item.isDir) {
      navigateTo(item.path);
    } else {
      setPreviewItem(item);
    }
  };

  // Pin / Unpin folder handlers
  const handlePinFolder = (path: string) => {
    updatePreferences((prev) => {
      if (prev.pinnedFolders.includes(path)) return prev;
      return { ...prev, pinnedFolders: [...prev.pinnedFolders, path] };
    });
  };

  const handleUnpinFolder = (path: string) => {
    updatePreferences((prev) => ({
      ...prev,
      pinnedFolders: prev.pinnedFolders.filter((p) => p !== path),
    }));
  };

  // Context Menu trigger
  const handleContextMenu = (e: React.MouseEvent, item: FileItem | null) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      isOpen: true,
    });
    if (item && !selectedItems.some((s) => s.id === item.id)) {
      setSelectedItems([item]);
    }
  };

  // Create folder action
  const handleCreateFolder = () => {
    setInputModal({
      type: 'new-folder',
      initialValue: 'New folder',
      isOpen: true,
    });
  };

  // Create file action
  const handleCreateFile = () => {
    setInputModal({
      type: 'new-file',
      initialValue: 'New Text Document.txt',
      isOpen: true,
    });
  };

  // Rename selected action
  const handleRenameSelected = () => {
    if (selectedItems.length !== 1) return;
    const item = selectedItems[0];
    setInputModal({
      type: 'rename',
      initialValue: item.name,
      itemName: item.name,
      targetItem: item,
      isOpen: true,
    });
  };

  // Delete selected action
  const handleDeleteSelected = () => {
    if (selectedItems.length === 0) return;
    const firstItem = selectedItems[0];
    setInputModal({
      type: 'confirm-delete',
      itemName: selectedItems.length > 1 ? `${selectedItems.length} items` : firstItem.name,
      targetItem: firstItem,
      isOpen: true,
    });
  };

  // Modal Submit (New folder, New file, Rename)
  const handleModalSubmit = async (val: string) => {
    if (!currentPath || !val.trim()) return;

    try {
      if (inputModal.type === 'new-folder') {
        await createRealFolder(currentPath, val.trim());
        handleRefresh();
      } else if (inputModal.type === 'new-file') {
        const isWindows = currentPath.includes('\\');
        const sep = isWindows ? '\\' : '/';
        const newFilePath = `${currentPath}${sep}${val.trim()}`;

        if (isTauri()) {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('write_file_content', { path: newFilePath, content: '' });
        } else {
          try {
            const rootDirHandle = (window as unknown as { _currentDirectoryHandle?: FileSystemDirectoryHandle })._currentDirectoryHandle;
            if (rootDirHandle) {
              await rootDirHandle.getFileHandle(val.trim(), { create: true });
            }
          } catch {
            // Ignore error
          }
        }
        handleRefresh();
      } else if (inputModal.type === 'rename' && inputModal.targetItem) {
        const item = inputModal.targetItem;
        const isWindows = currentPath.includes('\\');
        const sep = isWindows ? '\\' : '/';
        const newPath = `${currentPath}${sep}${val.trim()}`;

        if (isTauri()) {
          const { invoke } = await import('@tauri-apps/api/core');
          await invoke('rename_file_or_dir', { oldPath: item.path, newPath });
        } else {
          alert('Renaming requires Tauri native desktop mode');
        }
        handleRefresh();
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Operation failed');
    }
  };

  // Confirm delete handler
  const handleConfirmDelete = async () => {
    try {
      for (const item of selectedItems) {
        await deleteRealItem(item.path, item.isDir);
      }
      setSelectedItems([]);
      handleRefresh();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete item(s)');
    }
  };

  // Active space object
  const activeCustomSpace = useMemo(() => {
    if (!activeSpaceId) return null;
    return preferences.customSpaces.find((s) => s.id === activeSpaceId) || null;
  }, [activeSpaceId, preferences.customSpaces]);

  return (
    <div
      id="explorer-root-container"
      className="flex flex-col h-screen w-screen bg-white text-neutral-900 overflow-hidden font-sans selection:bg-blue-200"
    >
      {/* 1. Command Bar */}
      <CommandBar
        currentPath={currentPath}
        selectedItems={selectedItems}
        viewMode={preferences.viewMode}
        onViewModeChange={(mode) => updatePreferences((p) => ({ ...p, viewMode: mode }))}
        sortBy={preferences.sortBy}
        sortOrder={preferences.sortOrder}
        onSortChange={(field, order) =>
          updatePreferences((p) => ({ ...p, sortBy: field, sortOrder: order }))
        }
        showHidden={preferences.showHiddenFiles}
        onToggleShowHidden={() =>
          updatePreferences((p) => ({ ...p, showHiddenFiles: !p.showHiddenFiles }))
        }
        onOpenFolderPicker={handleOpenFolderPicker}
        onCreateFolder={handleCreateFolder}
        onCreateFile={handleCreateFile}
        onDeleteSelected={handleDeleteSelected}
        onRenameSelected={handleRenameSelected}
        onRefresh={handleRefresh}
        onOpenInstallerGuide={() => setIsInstallerGuideOpen(true)}
        customSpaces={preferences.customSpaces}
        onAddSelectedToSpace={handleAddMultipleSelectedToSpace}
        onCreateNewSpace={handleOpenCreateSpace}
        activeSpaceId={activeSpaceId}
      />

      {/* 2. Address & Search Bar */}
      <AddressBar
        currentPath={currentPath}
        canGoBack={canGoBack}
        canGoForward={canGoForward}
        canGoUp={canGoUp}
        onNavigateBack={handleNavigateBack}
        onNavigateForward={handleNavigateForward}
        onNavigateUp={handleNavigateUp}
        onRefresh={handleRefresh}
        onNavigateToPath={(path) => navigateTo(path)}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        activeSpace={activeCustomSpace}
        onExitSpace={handleExitSpace}
      />

      {/* 3. Main Body: Sidebar + Main Content (Explorer FileListView or CustomSpaceView) */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentPath={currentPath}
          pinnedFolders={preferences.pinnedFolders}
          drives={drives}
          knownFolders={knownFolders}
          customSpaces={preferences.customSpaces}
          activeSpaceId={activeSpaceId}
          onNavigateToPath={(path) => navigateTo(path)}
          onSelectSpace={handleSelectSpace}
          onCreateSpace={handleOpenCreateSpace}
          onEditSpace={handleOpenEditSpace}
          onDeleteSpace={handleDeleteSpace}
          onUnpinFolder={handleUnpinFolder}
          onOpenFolderPicker={handleOpenFolderPicker}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 animate-pulse z-20" />
          )}

          {activeCustomSpace ? (
            /* ACTIVE CUSTOM SPACE VIEW */
            <CustomSpaceView
              space={activeCustomSpace}
              viewMode={preferences.viewMode}
              sortBy={preferences.sortBy}
              sortOrder={preferences.sortOrder}
              onSortChange={(field, order) =>
                updatePreferences((p) => ({ ...p, sortBy: field, sortOrder: order }))
              }
              onNavigateToRealFolder={(path) => navigateTo(path)}
              onPreviewItem={(item) => setPreviewItem(item)}
              onRemoveItemFromSpace={handleRemoveItemFromSpace}
              onUpdateItemNote={handleUpdateItemNote}
              onEditSpace={handleOpenEditSpace}
              onDeleteSpace={handleDeleteSpace}
              onOpenFolderToCollect={handleOpenFolderPicker}
              onDropFilesIntoSpace={handleDropFilesIntoSpace}
            />
          ) : (
            /* STANDARD EXPLORER FILE LIST VIEW */
            <FileListView
              items={displayedItems}
              currentPath={currentPath}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onOpenItem={handleOpenItem}
              onContextMenu={handleContextMenu}
              viewMode={preferences.viewMode}
              sortBy={preferences.sortBy}
              sortOrder={preferences.sortOrder}
              onSortChange={(field, order) =>
                updatePreferences((p) => ({ ...p, sortBy: field, sortOrder: order }))
              }
              onOpenFolderPicker={handleOpenFolderPicker}
              isSearching={Boolean(searchQuery.trim())}
            />
          )}
        </main>
      </div>

      {/* 4. Status Bar */}
      <StatusBar
        totalCount={activeCustomSpace ? activeCustomSpace.items.length : displayedItems.length}
        selectedItems={activeCustomSpace ? [] : selectedItems}
        viewMode={preferences.viewMode}
        onViewModeChange={(mode) => updatePreferences((p) => ({ ...p, viewMode: mode }))}
        isNative={isTauri()}
      />

      {/* 5. Floating Toast Notification */}
      {toastMessage && (
        <div
          id="explorer-toast-notification"
          className="fixed bottom-10 right-6 z-50 flex items-center gap-3 bg-neutral-900/95 text-white px-4 py-3 rounded-xl shadow-2xl border border-neutral-700/60 backdrop-blur-md animate-in slide-in-from-bottom-5 fade-in duration-150 max-w-md"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-semibold text-neutral-100">{toastMessage.title}</div>
            <div className="text-neutral-300 text-[11px] truncate mt-0.5">{toastMessage.desc}</div>
          </div>
        </div>
      )}

      {/* 6. Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          item={contextMenu.item}
          pinnedFolders={preferences.pinnedFolders}
          customSpaces={preferences.customSpaces}
          onClose={() => setContextMenu((prev) => ({ ...prev, isOpen: false }))}
          onOpen={(item) => handleOpenItem(item)}
          onPin={handlePinFolder}
          onUnpin={handleUnpinFolder}
          onRename={(item) => {
            setInputModal({
              type: 'rename',
              initialValue: item.name,
              itemName: item.name,
              targetItem: item,
              isOpen: true,
            });
          }}
          onDelete={(item) => {
            setInputModal({
              type: 'confirm-delete',
              itemName: item.name,
              targetItem: item,
              isOpen: true,
            });
          }}
          onShowProperties={(item) => setPropertiesItem({ item, isOpen: true })}
          onCreateFolder={handleCreateFolder}
          onCreateFile={handleCreateFile}
          onRefresh={handleRefresh}
          onAddItemToSpace={handleAddItemToSpace}
          onCreateNewSpace={handleOpenCreateSpace}
        />
      )}

      {/* 7. Custom Space Modal (Create / Edit Space) */}
      <CustomSpaceModal
        isOpen={isSpaceModalOpen}
        editingSpace={editingSpace}
        onClose={() => setIsSpaceModalOpen(false)}
        onSave={handleSaveSpace}
      />

      {/* 8. Properties Modal */}
      {propertiesItem.isOpen && (
        <PropertiesModal
          item={propertiesItem.item}
          currentPath={currentPath}
          onClose={() => setPropertiesItem({ item: null, isOpen: false })}
        />
      )}

      {/* 9. File Preview Modal */}
      {previewItem && (
        <FilePreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* 10. Input Modal (Rename, New Folder, Confirm Delete) */}
      <InputModal
        type={inputModal.type}
        initialValue={inputModal.initialValue}
        itemName={inputModal.itemName}
        isOpen={inputModal.isOpen}
        onClose={() => setInputModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleModalSubmit}
        onConfirmDelete={handleConfirmDelete}
      />

      {/* 11. Windows Installer & Packaging Guide Modal */}
      {isInstallerGuideOpen && (
        <InstallerGuideModal onClose={() => setIsInstallerGuideOpen(false)} />
      )}
    </div>
  );
}
