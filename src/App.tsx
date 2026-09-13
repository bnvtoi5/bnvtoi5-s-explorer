import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  FileItem,
  DriveInfo,
  KnownFolder,
  UserPreferences,
  ContextMenuState,
  SmartZone,
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
  openRealItem,
  moveOrCopyRealItems,
  renameRealItem,
} from './services/fs';
import { CommandBar } from './components/CommandBar';
import { AddressBar } from './components/AddressBar';
import { Sidebar } from './components/Sidebar';
import { FileListView } from './components/FileListView';
import { SmartZonesView } from './components/SmartZonesView';
import { ContextMenu } from './components/ContextMenu';
import { PropertiesModal } from './components/PropertiesModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { InputModal, ModalType } from './components/InputModal';
import { StatusBar } from './components/StatusBar';

export default function App() {
  // Navigation & Directory state
  const [currentPath, setCurrentPath] = useState<string>('C:\\Users\\Admin\\Downloads');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([]);

  // Clipboard state for Cut / Copy / Paste
  const [clipboard, setClipboard] = useState<{
    items: FileItem[];
    action: 'copy' | 'cut';
  } | null>(null);

  // Preferences state
  const [preferences, setPreferences] = useState<UserPreferences>({
    pinnedFolders: [],
    smartZones: [
      {
        id: 'zone_recent_downloads',
        name: 'Mới Tải Về & Sửa Đổi (24h)',
        color: 'blue',
        width: 'col-1',
        displayStyle: 'compact',
        collapsed: false,
        rule: { ruleType: 'recent', recentHours: 24 },
      },
      {
        id: 'zone_archives_setup',
        name: 'File Nén & Giải Nén (Zip, Rar, Exe)',
        color: 'purple',
        width: 'col-1',
        displayStyle: 'icons',
        collapsed: false,
        rule: { ruleType: 'category', category: 'archives' },
      },
      {
        id: 'zone_documents',
        name: 'Tài Liệu & Báo Cáo',
        color: 'emerald',
        width: 'col-1',
        displayStyle: 'details',
        collapsed: false,
        rule: { ruleType: 'category', category: 'documents' },
      },
    ],
    theme: 'light',
    viewMode: 'details',
    showHiddenFiles: false,
    sortBy: 'name',
    sortOrder: 'asc',
  });

  const [drives, setDrives] = useState<DriveInfo[]>([]);
  const [knownFolders, setKnownFolders] = useState<KnownFolder[]>([]);

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

  // Load initial settings and drives
  useEffect(() => {
    async function init() {
      const prefs = await loadUserPreferences();
      setPreferences(prefs);

      const sysDrives = await getSystemDrives();
      setDrives(sysDrives);

      const kf = await getKnownFolders();
      setKnownFolders(kf);

      if (isTauri() && sysDrives.length > 0) {
        navigateTo(sysDrives[0].path, false);
      } else if (prefs.lastVisitedPath) {
        navigateTo(prefs.lastVisitedPath, false);
      } else if (kf.length > 0) {
        navigateTo(kf[0].path, false);
      } else if (sysDrives.length > 0) {
        navigateTo(sysDrives[0].path, false);
      } else {
        navigateTo('C:\\Users\\Admin\\Downloads', false);
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
      updatePreferences((p) => ({ ...p, lastVisitedPath: newPath }));
    },
    [historyIndex, loadDirectory, updatePreferences]
  );

  // Current active Smart Zones based on currentPath (Folder-specific isolation)
  const activeSmartZones: SmartZone[] = useMemo(() => {
    if (currentPath && preferences.folderSmartZones && preferences.folderSmartZones[currentPath]) {
      return preferences.folderSmartZones[currentPath];
    }
    return preferences.smartZones;
  }, [currentPath, preferences.folderSmartZones, preferences.smartZones]);

  const isCustomFolderConfig = Boolean(
    currentPath && preferences.folderSmartZones && preferences.folderSmartZones[currentPath]
  );

  // Update Smart Zones (saves to folderSmartZones if currentPath exists, isolating each folder's setup)
  const handleUpdateSmartZones = (newZones: SmartZone[]) => {
    if (currentPath) {
      updatePreferences((prev) => ({
        ...prev,
        folderSmartZones: {
          ...(prev.folderSmartZones || {}),
          [currentPath]: newZones,
        },
      }));
    } else {
      updatePreferences((prev) => ({ ...prev, smartZones: newZones }));
    }
  };

  // Reset folder-specific configuration back to default
  const handleResetFolderZones = () => {
    if (currentPath && preferences.folderSmartZones && preferences.folderSmartZones[currentPath]) {
      updatePreferences((prev) => {
        const nextFolderMap = { ...(prev.folderSmartZones || {}) };
        delete nextFolderMap[currentPath];
        return {
          ...prev,
          folderSmartZones: nextFolderMap,
        };
      });
    }
  };

  // Assign item to a zone (Non-exclusive, saves to active folder's zone configuration)
  const handleAssignItemToZone = (zoneId: string, item: FileItem) => {
    const updatedZones = activeSmartZones.map((z) => {
      if (z.id === zoneId) {
        const cur = z.rule.manualItemPaths || [];
        return {
          ...z,
          rule: {
            ...z.rule,
            manualItemPaths: cur.includes(item.path) ? cur : [...cur, item.path],
          },
        };
      }
      return z;
    });

    handleUpdateSmartZones(updatedZones);
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
    if (!searchQuery.trim() || !currentPath) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      const results = await searchRealFiles(currentPath, searchQuery);
      setSearchResults(results);
    }, 150);

    return () => clearTimeout(timer);
  }, [searchQuery, currentPath]);

  // Sort and filter displayed items
  const displayedItems = useMemo(() => {
    const raw = searchQuery.trim() ? searchResults : items;
    const sorted = [...raw];

    sorted.sort((a, b) => {
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

  // Clipboard and Move handlers
  const handleCopy = useCallback((item?: FileItem) => {
    let targets: FileItem[] = [];
    if (item) {
      if (selectedItems.some((s) => s.id === item.id)) {
        targets = selectedItems;
      } else {
        targets = [item];
        setSelectedItems([item]);
      }
    } else {
      targets = selectedItems;
    }
    if (targets.length === 0) return;
    setClipboard({ items: targets, action: 'copy' });
    try {
      navigator.clipboard.writeText(targets.map((i) => i.path).join('\n'));
    } catch {}
  }, [selectedItems]);

  const handleCut = useCallback((item?: FileItem) => {
    let targets: FileItem[] = [];
    if (item) {
      if (selectedItems.some((s) => s.id === item.id)) {
        targets = selectedItems;
      } else {
        targets = [item];
        setSelectedItems([item]);
      }
    } else {
      targets = selectedItems;
    }
    if (targets.length === 0) return;
    setClipboard({ items: targets, action: 'cut' });
  }, [selectedItems]);

  const handlePaste = useCallback(async (targetDir?: string) => {
    if (!clipboard || clipboard.items.length === 0) return;
    const destDir = targetDir || currentPath;
    if (!destDir) return;
    try {
      const sourcePaths = clipboard.items.map((i) => i.path);
      const isCopy = clipboard.action === 'copy';
      const res = await moveOrCopyRealItems(sourcePaths, destDir, isCopy);

      if (contextMenu.targetZoneId) {
        const targetZone = activeSmartZones.find((z) => z.id === contextMenu.targetZoneId);
        if (targetZone) {
          const updatedZones = activeSmartZones.map((z) => {
            if (z.id === targetZone.id) {
              const currentPaths = z.rule.manualItemPaths || [];
              const combined = Array.from(new Set([...currentPaths, ...sourcePaths]));
              return {
                ...z,
                rule: {
                  ...z.rule,
                  manualItemPaths: combined,
                },
              };
            }
            return z;
          });
          handleUpdateSmartZones(updatedZones);
        }
      }

      if (clipboard.action === 'cut') {
        setClipboard(null);
      }
      await handleRefresh();

      // Automatically highlight the pasted items for immediate visual confirmation
      if (res && res.length > 0) {
        setSelectedItems(res);
      }
    } catch (err: unknown) {
      alert((err as Error).message || 'Dán tệp tin thất bại');
    }
  }, [clipboard, currentPath, contextMenu.targetZoneId, activeSmartZones, handleRefresh]);

  const handleMoveItemsToFolder = useCallback(
    async (sourcePaths: string[], targetFolderPath: string) => {
      try {
        await moveOrCopyRealItems(sourcePaths, targetFolderPath, false);
        handleRefresh();
      } catch (err: unknown) {
        alert((err as Error).message || 'Di chuyển tệp thất bại');
      }
    },
    [handleRefresh]
  );

  const handleDropExternalFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!currentPath) return;
      try {
        const rootDirHandle = (window as unknown as { _currentDirectoryHandle?: FileSystemDirectoryHandle })._currentDirectoryHandle;
        if (rootDirHandle) {
          for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const fileHandle = await rootDirHandle.getFileHandle(file.name, { create: true });
            if ('createWritable' in fileHandle) {
              const writable = await (fileHandle as unknown as { createWritable: () => Promise<{ write: (c: unknown) => Promise<void>; close: () => Promise<void> }> }).createWritable();
              await writable.write(file);
              await writable.close();
            }
          }
        }
        handleRefresh();
      } catch (err: unknown) {
        console.warn('Drop external files:', err);
      }
    },
    [currentPath, handleRefresh]
  );

  // Rename selected action
  const handleRenameSelected = useCallback(() => {
    if (selectedItems.length !== 1) return;
    const item = selectedItems[0];
    setInputModal({
      type: 'rename',
      initialValue: item.name,
      itemName: item.name,
      targetItem: item,
      isOpen: true,
    });
  }, [selectedItems]);

  // Delete selected action
  const handleDeleteSelected = useCallback(() => {
    if (selectedItems.length === 0) return;
    const firstItem = selectedItems[0];
    setInputModal({
      type: 'confirm-delete',
      itemName: selectedItems.length > 1 ? `${selectedItems.length} mục` : firstItem.name,
      targetItem: firstItem,
      isOpen: true,
    });
  }, [selectedItems]);

  // Keyboard shortcuts: Esc to deselect, Ctrl+A to select all, Ctrl+C, Ctrl+X, Ctrl+V, Delete, F2
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl as HTMLElement).isContentEditable);

      if (e.key === 'Escape') {
        setContextMenu((prev) => ({ ...prev, isOpen: false }));
        setPreviewItem(null);
        setSelectedItems([]);
      } else if (!isTyping) {
        if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
          e.preventDefault();
          setSelectedItems(displayedItems);
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c') {
          e.preventDefault();
          handleCopy();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'x') {
          e.preventDefault();
          handleCut();
        } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v') {
          e.preventDefault();
          handlePaste();
        } else if (e.key === 'Delete') {
          e.preventDefault();
          handleDeleteSelected();
        } else if (e.key === 'F2') {
          e.preventDefault();
          handleRenameSelected();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [displayedItems, handleCopy, handleCut, handlePaste, handleDeleteSelected, handleRenameSelected]);

  // Selection handlers
  const lastSelectedItemRef = useRef<FileItem | null>(null);

  const handleSelectItem = (item: FileItem, isMulti: boolean, isRange?: boolean) => {
    if (isRange && lastSelectedItemRef.current) {
      const lastIdx = displayedItems.findIndex((i) => i.id === lastSelectedItemRef.current?.id);
      const currIdx = displayedItems.findIndex((i) => i.id === item.id);
      if (lastIdx !== -1 && currIdx !== -1) {
        const start = Math.min(lastIdx, currIdx);
        const end = Math.max(lastIdx, currIdx);
        const range = displayedItems.slice(start, end + 1);
        if (isMulti) {
          const combined = new Map<string, FileItem>();
          selectedItems.forEach((i) => combined.set(i.id, i));
          range.forEach((i) => combined.set(i.id, i));
          setSelectedItems(Array.from(combined.values()));
        } else {
          setSelectedItems(range);
        }
        return;
      }
    }

    lastSelectedItemRef.current = item;

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

  // Open item (double click or Enter) -> Open natively with default system app
  const handleOpenItem = async (item: FileItem) => {
    if (item.isDir) {
      navigateTo(item.path);
    } else {
      try {
        await openRealItem(item.path);
      } catch (err) {
        console.warn('Cannot launch with native system app:', err);
        setPreviewItem(item);
      }
    }
  };

  // Multiple selection handler (e.g. marquee box drag selection)
  const handleSelectMultiple = useCallback((newSelected: FileItem[]) => {
    setSelectedItems(newSelected);
  }, []);

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
  const handleContextMenu = (
    e: React.MouseEvent,
    item: FileItem | null,
    targetZoneId?: string
  ) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      item,
      isOpen: true,
      targetZoneId,
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
        const isWindows = item.path.includes('\\');
        const sep = isWindows ? '\\' : '/';
        const lastSlash = Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\'));
        const parentPath = lastSlash >= 0 ? item.path.substring(0, lastSlash) : currentPath;
        const newPath = `${parentPath}${sep}${val.trim()}`;

        await renameRealItem(item.path, newPath);
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

  return (
    <div
      id="explorer-root-container"
      className="flex flex-col h-screen w-screen bg-white text-neutral-900 overflow-hidden font-sans selection:bg-blue-200"
    >
      {/* 1. Command Bar */}
      <CommandBar
        currentPath={currentPath}
        selectedItems={selectedItems}
        clipboard={clipboard}
        onCut={() => handleCut()}
        onCopy={() => handleCopy()}
        onPaste={() => handlePaste()}
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
      />

      {/* 3. Main Body: Sidebar + File List / Smart Zones View */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentPath={currentPath}
          pinnedFolders={preferences.pinnedFolders}
          drives={drives}
          knownFolders={knownFolders}
          onNavigateToPath={(path) => navigateTo(path)}
          onPinFolder={handlePinFolder}
          onUnpinFolder={handleUnpinFolder}
          onOpenFolderPicker={handleOpenFolderPicker}
          onMoveItemsToFolder={handleMoveItemsToFolder}
        />

        <main className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
          {loading && (
            <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-600 animate-pulse z-20" />
          )}

          {preferences.viewMode === 'zones' ? (
            /* SMART ZONES / DYNAMIC BOX VIEW */
            <SmartZonesView
              items={displayedItems}
              currentPath={currentPath}
              zones={activeSmartZones}
              isCustomFolderConfig={isCustomFolderConfig}
              onUpdateZones={handleUpdateSmartZones}
              onResetFolderZones={handleResetFolderZones}
              onRefresh={handleRefresh}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onSelectMultiple={handleSelectMultiple}
              onOpenItem={handleOpenItem}
              onContextMenu={handleContextMenu}
              onOpenFolderPicker={handleOpenFolderPicker}
              clipboard={clipboard}
              onMoveItemsToFolder={handleMoveItemsToFolder}
            />
          ) : (
            /* STANDARD EXPLORER LIST / GRID / TILES VIEW */
            <FileListView
              items={displayedItems}
              currentPath={currentPath}
              selectedItems={selectedItems}
              clipboard={clipboard}
              onSelectItem={handleSelectItem}
              onSelectMultiple={handleSelectMultiple}
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
              onMoveItemsToFolder={handleMoveItemsToFolder}
              onDropExternalFiles={handleDropExternalFiles}
            />
          )}
        </main>
      </div>

      {/* 4. Status Bar */}
      <StatusBar
        totalCount={displayedItems.length}
        selectedItems={selectedItems}
        viewMode={preferences.viewMode}
        onViewModeChange={(mode) => updatePreferences((p) => ({ ...p, viewMode: mode }))}
        isNative={isTauri()}
      />

      {/* 5. Context Menu */}
      {contextMenu.isOpen && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          currentPath={currentPath}
          item={contextMenu.item}
          targetZoneId={contextMenu.targetZoneId}
          pinnedFolders={preferences.pinnedFolders}
          smartZones={activeSmartZones}
          viewMode={preferences.viewMode}
          onViewModeChange={(mode) => updatePreferences((p) => ({ ...p, viewMode: mode }))}
          sortBy={preferences.sortBy}
          sortOrder={preferences.sortOrder}
          onSortChange={(field, order) =>
            updatePreferences((p) => ({ ...p, sortBy: field, sortOrder: order }))
          }
          clipboard={clipboard}
          onCopy={(item) => handleCopy(item)}
          onCut={(item) => handleCut(item)}
          onPaste={handlePaste}
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
          onAssignToZone={handleAssignItemToZone}
        />
      )}

      {/* 6. Properties Modal */}
      {propertiesItem.isOpen && (
        <PropertiesModal
          item={propertiesItem.item}
          currentPath={currentPath}
          onClose={() => setPropertiesItem({ item: null, isOpen: false })}
        />
      )}

      {/* 7. File Preview Modal */}
      {previewItem && (
        <FilePreviewModal
          item={previewItem}
          onClose={() => setPreviewItem(null)}
        />
      )}

      {/* 8. Input Modal (Rename, New Folder, Confirm Delete) */}
      <InputModal
        type={inputModal.type}
        initialValue={inputModal.initialValue}
        itemName={inputModal.itemName}
        isOpen={inputModal.isOpen}
        onClose={() => setInputModal((prev) => ({ ...prev, isOpen: false }))}
        onSubmit={handleModalSubmit}
        onConfirmDelete={handleConfirmDelete}
      />
    </div>
  );
}
