import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [currentPath, setCurrentPath] = useState<string>('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<FileItem[]>([]);

  // Selection state
  const [selectedItems, setSelectedItems] = useState<FileItem[]>([]);

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

  // Update Smart Zones
  const handleUpdateSmartZones = (newZones: SmartZone[]) => {
    updatePreferences((prev) => ({ ...prev, smartZones: newZones }));
  };

  // Assign item to a zone
  const handleAssignItemToZone = (zoneId: string, item: FileItem) => {
    updatePreferences((prev) => ({
      ...prev,
      smartZones: prev.smartZones.map((z) => {
        if (z.id === zoneId) {
          const cur = z.rule.manualItemPaths || [];
          return {
            ...z,
            rule: {
              ...z.rule,
              ruleType: 'manual',
              manualItemPaths: cur.includes(item.path) ? cur : [...cur, item.path],
            },
          };
        }
        return z;
      }),
    }));
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
      itemName: selectedItems.length > 1 ? `${selectedItems.length} mục` : firstItem.name,
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
          onUnpinFolder={handleUnpinFolder}
          onOpenFolderPicker={handleOpenFolderPicker}
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
              zones={preferences.smartZones}
              onUpdateZones={handleUpdateSmartZones}
              selectedItems={selectedItems}
              onSelectItem={handleSelectItem}
              onOpenItem={handleOpenItem}
              onContextMenu={handleContextMenu}
              onOpenFolderPicker={handleOpenFolderPicker}
            />
          ) : (
            /* STANDARD EXPLORER LIST / GRID / TILES VIEW */
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
          item={contextMenu.item}
          pinnedFolders={preferences.pinnedFolders}
          smartZones={preferences.smartZones}
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
