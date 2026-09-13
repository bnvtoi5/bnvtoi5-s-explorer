import React, { useState, useEffect, useMemo } from 'react';
import {
  Folder,
  File,
  X,
  Share2,
  Shield,
  Users,
  History,
  Sliders,
  Check,
  CheckSquare,
  Square,
  Lock,
  Globe,
  HardDrive,
  Music,
  Video,
  Image as ImageIcon,
  Sparkles,
  Terminal,
  FolderLock,
  FileCode,
  Archive,
  Star,
  Download,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { FileItem } from '../types';
import { formatFileSize, formatWindowsDate, readDirectory } from '../services/fs';

export type PropertiesTab = 'general' | 'sharing' | 'security' | 'previous' | 'customize';

export interface PropertiesModalProps {
  item: FileItem | null;
  currentPath: string;
  initialTab?: PropertiesTab;
  onClose: () => void;
  onApplyNameChange?: (oldPath: string, newName: string) => void;
}

// Icon options for Windows 11 Change Icon dialog
const WINDOWS_ICONS = [
  { id: 'folder-default', label: 'Default Folder', icon: Folder, color: 'text-amber-400 fill-amber-400/30' },
  { id: 'folder-star', label: 'Starred Folder', icon: Star, color: 'text-yellow-400 fill-yellow-400/30' },
  { id: 'folder-music', label: 'Music Library', icon: Music, color: 'text-rose-400' },
  { id: 'folder-video', label: 'Video Library', icon: Video, color: 'text-purple-400' },
  { id: 'folder-pictures', label: 'Pictures', icon: ImageIcon, color: 'text-emerald-400' },
  { id: 'folder-code', label: 'Developer Code', icon: FileCode, color: 'text-blue-400' },
  { id: 'folder-lock', label: 'Secure Vault', icon: FolderLock, color: 'text-amber-500' },
  { id: 'folder-terminal', label: 'Terminal / Script', icon: Terminal, color: 'text-teal-400' },
  { id: 'folder-archive', label: 'Archive / Package', icon: Archive, color: 'text-orange-400' },
  { id: 'folder-download', label: 'Downloads', icon: Download, color: 'text-cyan-400' },
  { id: 'folder-drive', label: 'Local Volume', icon: HardDrive, color: 'text-neutral-300' },
  { id: 'folder-settings', label: 'Config / Tools', icon: Settings, color: 'text-slate-300' },
];

export const PropertiesModal: React.FC<PropertiesModalProps> = ({
  item,
  currentPath,
  initialTab = 'general',
  onClose,
  onApplyNameChange,
}) => {
  const isFolder = item ? item.isDir : true;
  const originalName = item ? item.name : currentPath.split(/[/|\\]/).filter(Boolean).pop() || currentPath;
  const location = item
    ? item.path.substring(0, Math.max(item.path.lastIndexOf('/'), item.path.lastIndexOf('\\'))) || item.path
    : currentPath;
  const fullPath = item ? item.path : currentPath;

  const [activeTab, setActiveTab] = useState<PropertiesTab>(initialTab);
  const [folderName, setFolderName] = useState<string>(originalName);

  // Folder contents stats (dynamically measured)
  const [folderStats, setFolderStats] = useState<{ filesCount: number; foldersCount: number; totalSize: number }>({
    filesCount: 2,
    foldersCount: 0,
    totalSize: item?.size || 10539299,
  });

  // General tab states
  const [isReadOnly, setIsReadOnly] = useState<boolean>(true); // Indeterminate or checked default in Windows folders
  const [isHidden, setIsHidden] = useState<boolean>(item?.isHidden || false);
  const [showAdvancedAttributes, setShowAdvancedAttributes] = useState<boolean>(false);
  const [isArchivingReady, setIsArchivingReady] = useState<boolean>(true);
  const [isIndexed, setIsIndexed] = useState<boolean>(true);
  const [isCompressed, setIsCompressed] = useState<boolean>(false);
  const [isEncrypted, setIsEncrypted] = useState<boolean>(false);

  // Sharing tab states
  const [isShared, setIsShared] = useState<boolean>(() => {
    try {
      const sharedList = JSON.parse(localStorage.getItem('explorer_shared_folders') || '[]');
      return sharedList.includes(fullPath);
    } catch {
      return false;
    }
  });
  const [showShareDialog, setShowShareDialog] = useState<boolean>(false);
  const [showAdvancedSharingDialog, setShowAdvancedSharingDialog] = useState<boolean>(false);
  const [shareUserLimit, setShareUserLimit] = useState<number>(20);
  const [shareComments, setShareComments] = useState<string>('');
  const [sharedUsers, setSharedUsers] = useState<Array<{ name: string; permission: 'Read' | 'Read/Write' }>>([
    { name: 'Admin (bnvtoi5@gmail.com)', permission: 'Read/Write' },
  ]);
  const [newShareUser, setNewShareUser] = useState<string>('Everyone');
  const [newSharePerm, setNewSharePerm] = useState<'Read' | 'Read/Write'>('Read');

  // Security tab states
  const [selectedUserIndex, setSelectedUserIndex] = useState<number>(0);
  const [showSecurityEditModal, setShowSecurityEditModal] = useState<boolean>(false);
  const usersList = [
    { id: 'system', name: 'SYSTEM', fullControl: true, modify: true, readExec: true, list: true, read: true, write: true },
    { id: 'admins', name: 'Administrators (DESKTOP-WIN11\\Administrators)', fullControl: true, modify: true, readExec: true, list: true, read: true, write: true },
    { id: 'users', name: 'Users (DESKTOP-WIN11\\Users)', fullControl: false, modify: false, readExec: true, list: true, read: true, write: false },
    { id: 'admin-current', name: 'Admin (bnvtoi5@gmail.com)', fullControl: true, modify: true, readExec: true, list: true, read: true, write: true },
  ];

  // Previous versions states
  const previousVersions = [
    { date: 'Hôm nay, 11 Tháng Chín 2026, 03:00 CH', type: 'Restore point' },
    { date: 'Hôm qua, 10 Tháng Chín 2026, 05:45 CH', type: 'File History' },
    { date: '08 Tháng Chín 2026, 09:20 SA', type: 'System Backup' },
  ];
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  // Customize tab states
  const [folderTemplate, setFolderTemplate] = useState<string>(() => {
    try {
      const customs = JSON.parse(localStorage.getItem('explorer_folder_customizations') || '{}');
      return customs[fullPath]?.template || 'General items';
    } catch {
      return 'General items';
    }
  });
  const [applyToSubfolders, setApplyToSubfolders] = useState<boolean>(true);
  const [selectedIconId, setSelectedIconId] = useState<string>(() => {
    try {
      const customs = JSON.parse(localStorage.getItem('explorer_folder_customizations') || '{}');
      return customs[fullPath]?.iconId || 'folder-default';
    } catch {
      return 'folder-default';
    }
  });
  const [showChangeIconDialog, setShowChangeIconDialog] = useState<boolean>(false);

  // Changes dirty flag for Apply button
  const [hasChanges, setHasChanges] = useState<boolean>(false);

  // Load real child stats if folder
  useEffect(() => {
    if (!isFolder) return;
    async function loadStats() {
      try {
        const children = await readDirectory(fullPath, false);
        const files = children.filter((c) => !c.isDir);
        const folders = children.filter((c) => c.isDir);
        const totalBytes = files.reduce((acc, f) => acc + (f.size || 0), 0);
        setFolderStats({
          filesCount: files.length,
          foldersCount: folders.length,
          totalSize: totalBytes || 10539299,
        });
      } catch {
        // Fallback default
      }
    }
    loadStats();
  }, [fullPath, isFolder]);

  // Handle Apply button
  const handleApply = () => {
    try {
      // Save folder customizations
      const customs = JSON.parse(localStorage.getItem('explorer_folder_customizations') || '{}');
      customs[fullPath] = {
        template: folderTemplate,
        iconId: selectedIconId,
        applyToSubfolders,
      };
      localStorage.setItem('explorer_folder_customizations', JSON.stringify(customs));

      // Save shared folders
      const sharedList: string[] = JSON.parse(localStorage.getItem('explorer_shared_folders') || '[]');
      if (isShared && !sharedList.includes(fullPath)) {
        sharedList.push(fullPath);
      } else if (!isShared && sharedList.includes(fullPath)) {
        const idx = sharedList.indexOf(fullPath);
        if (idx !== -1) sharedList.splice(idx, 1);
      }
      localStorage.setItem('explorer_shared_folders', JSON.stringify(sharedList));

      if (folderName.trim() && folderName.trim() !== originalName && onApplyNameChange) {
        onApplyNameChange(fullPath, folderName.trim());
      }

      setHasChanges(false);
      showToast('Đã áp dụng các thay đổi thành công.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleOK = () => {
    handleApply();
    onClose();
  };

  const showToast = (msg: string) => {
    setNotificationMsg(msg);
    setTimeout(() => setNotificationMsg(null), 3200);
  };

  const SelectedIconComponent = useMemo(() => {
    const found = WINDOWS_ICONS.find((i) => i.id === selectedIconId);
    return found ? found.icon : Folder;
  }, [selectedIconId]);

  const selectedIconColor = useMemo(() => {
    const found = WINDOWS_ICONS.find((i) => i.id === selectedIconId);
    return found ? found.color : 'text-amber-400 fill-amber-400/30';
  }, [selectedIconId]);

  return (
    <div
      id="properties-modal-overlay"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-2 sm:p-4 select-none"
      onClick={onClose}
    >
      {/* Main Dialog Window (Windows 11 Dark Aesthetic) */}
      <div
        id="properties-dialog"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-[#202020] border border-[#383838] rounded-lg shadow-2xl w-full max-w-[440px] text-xs text-[#e5e5e5] font-sans flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-100"
      >
        {/* Windows 11 Title Bar */}
        <div className="flex items-center justify-between pl-3 pr-1 py-1.5 bg-[#262626] border-b border-[#333333]">
          <div className="flex items-center gap-2 overflow-hidden">
            {isFolder ? (
              <SelectedIconComponent className={`w-4 h-4 ${selectedIconColor} shrink-0`} />
            ) : (
              <File className="w-4 h-4 text-blue-400 shrink-0" />
            )}
            <span className="font-normal text-[12px] text-neutral-200 truncate">
              {originalName} Properties
            </span>
          </div>
          <button
            id="btn-close-properties"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-6 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#c42b1c] rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Windows 11 Tab Header Bar */}
        <div className="flex items-center bg-[#242424] px-2 pt-1 border-b border-[#383838] overflow-x-auto gap-0.5 scrollbar-none">
          <button
            id="tab-general"
            onClick={() => setActiveTab('general')}
            className={`px-3 py-1.5 rounded-t text-xs font-medium border-t border-x transition-colors whitespace-nowrap ${
              activeTab === 'general'
                ? 'bg-[#2b2b2b] text-white border-[#444444] border-b-transparent relative after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-blue-500'
                : 'bg-transparent text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            General
          </button>

          {isFolder && (
            <button
              id="tab-sharing"
              onClick={() => setActiveTab('sharing')}
              className={`px-3 py-1.5 rounded-t text-xs font-medium border-t border-x transition-colors whitespace-nowrap ${
                activeTab === 'sharing'
                  ? 'bg-[#2b2b2b] text-white border-[#444444] border-b-transparent relative after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-blue-500'
                  : 'bg-transparent text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              Sharing
            </button>
          )}

          <button
            id="tab-security"
            onClick={() => setActiveTab('security')}
            className={`px-3 py-1.5 rounded-t text-xs font-medium border-t border-x transition-colors whitespace-nowrap ${
              activeTab === 'security'
                ? 'bg-[#2b2b2b] text-white border-[#444444] border-b-transparent relative after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-blue-500'
                : 'bg-transparent text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            Security
          </button>

          <button
            id="tab-previous-versions"
            onClick={() => setActiveTab('previous')}
            className={`px-3 py-1.5 rounded-t text-xs font-medium border-t border-x transition-colors whitespace-nowrap ${
              activeTab === 'previous'
                ? 'bg-[#2b2b2b] text-white border-[#444444] border-b-transparent relative after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-blue-500'
                : 'bg-transparent text-neutral-400 hover:text-neutral-200 border-transparent'
            }`}
          >
            Previous Versions
          </button>

          {isFolder && (
            <button
              id="tab-customize"
              onClick={() => setActiveTab('customize')}
              className={`px-3 py-1.5 rounded-t text-xs font-medium border-t border-x transition-colors whitespace-nowrap ${
                activeTab === 'customize'
                  ? 'bg-[#2b2b2b] text-white border-[#444444] border-b-transparent relative after:absolute after:bottom-[-1px] after:left-0 after:right-0 after:h-[2px] after:bg-blue-500'
                  : 'bg-transparent text-neutral-400 hover:text-neutral-200 border-transparent'
              }`}
            >
              Customize
            </button>
          )}
        </div>

        {/* Tab Body Contents */}
        <div className="p-4 min-h-[380px] max-h-[460px] overflow-y-auto bg-[#202020]">
          {/* ========================================================================= */}
          {/* TAB 1: GENERAL (Pixel-perfect replica of User's Screenshot 2)            */}
          {/* ========================================================================= */}
          {activeTab === 'general' && (
            <div className="space-y-3.5">
              {/* Top Row: Big Icon + Input Box */}
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  {isFolder ? (
                    <SelectedIconComponent className={`w-9 h-9 ${selectedIconColor}`} />
                  ) : (
                    <File className="w-9 h-9 text-blue-400" />
                  )}
                </div>
                <div className="flex-1">
                  <input
                    id="properties-name-input"
                    type="text"
                    value={folderName}
                    onChange={(e) => {
                      setFolderName(e.target.value);
                      setHasChanges(true);
                    }}
                    className="w-full px-2 py-1 bg-[#1c1c1c] border border-[#3c3c3c] rounded text-white text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-[#333333]" />

              {/* Info Rows */}
              <div className="space-y-2 text-[11.5px] leading-relaxed">
                <div className="flex items-baseline">
                  <span className="w-24 text-neutral-400 shrink-0">Type:</span>
                  <span className="text-white font-normal">
                    {isFolder ? 'File folder' : `${item?.extension?.toUpperCase() || ''} File`}
                  </span>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-neutral-400 shrink-0">Location:</span>
                  <span className="text-white font-mono text-[11px] break-all select-all">
                    {location}
                  </span>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-neutral-400 shrink-0">Size:</span>
                  <span className="text-white">
                    {formatFileSize(folderStats.totalSize)} ({folderStats.totalSize.toLocaleString()} bytes)
                  </span>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-neutral-400 shrink-0">Size on disk:</span>
                  <span className="text-white">
                    {formatFileSize(folderStats.totalSize + 3805)} ({(folderStats.totalSize + 3805).toLocaleString()} bytes)
                  </span>
                </div>

                {isFolder && (
                  <div className="flex items-baseline">
                    <span className="w-24 text-neutral-400 shrink-0">Contains:</span>
                    <span className="text-white">
                      {folderStats.filesCount} Files, {folderStats.foldersCount} Folders
                    </span>
                  </div>
                )}
              </div>

              {/* Separator */}
              <div className="border-t border-[#333333]" />

              {/* Timestamps */}
              <div className="space-y-2 text-[11.5px] leading-relaxed">
                <div className="flex items-baseline">
                  <span className="w-24 text-neutral-400 shrink-0">Created:</span>
                  <span className="text-white">
                    {formatWindowsDate(item?.modifiedMs ? item.modifiedMs - 86400000 : Date.now() - 86400000)}
                  </span>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-neutral-400 shrink-0">Modified:</span>
                  <span className="text-white">
                    {formatWindowsDate(item?.modifiedMs || Date.now())}
                  </span>
                </div>

                <div className="flex items-baseline">
                  <span className="w-24 text-neutral-400 shrink-0">Accessed:</span>
                  <span className="text-white">
                    Hôm nay, {formatWindowsDate(Date.now()).split(',')[0]}
                  </span>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-[#333333]" />

              {/* Attributes Section (Exact replica of Image 2) */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="w-24 text-neutral-400 shrink-0">Attributes:</span>

                  <div className="flex-1 space-y-2">
                    {/* Read-only with Windows 11 Square Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => {
                          setIsReadOnly((v) => !v);
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 rounded border border-[#555] bg-[#222] flex items-center justify-center cursor-pointer hover:border-blue-400"
                      >
                        {isReadOnly && (
                          <div className="w-2 h-2 bg-blue-500 rounded-xs" />
                        )}
                      </div>
                      <span className="text-white text-[11.5px]">
                        Read-only (Only applies to files in folder)
                      </span>
                    </label>

                    {/* Hidden Checkbox */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <div
                        onClick={() => {
                          setIsHidden((v) => !v);
                          setHasChanges(true);
                        }}
                        className="w-4 h-4 rounded border border-[#555] bg-[#222] flex items-center justify-center cursor-pointer hover:border-blue-400"
                      >
                        {isHidden && <Check className="w-3 h-3 text-blue-400 stroke-[3]" />}
                      </div>
                      <span className="text-white text-[11.5px]">Hidden</span>
                    </label>
                  </div>

                  <button
                    id="btn-advanced-attributes"
                    onClick={() => setShowAdvancedAttributes(true)}
                    className="px-3 py-1 bg-[#2d2d2d] hover:bg-[#383838] active:bg-[#404040] border border-[#484848] rounded text-white text-[11.5px] transition-colors"
                  >
                    Advanced...
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: SHARING                                                            */}
          {/* ========================================================================= */}
          {activeTab === 'sharing' && (
            <div className="space-y-4">
              {/* Network File and Folder Sharing */}
              <div className="space-y-2">
                <div className="font-semibold text-white text-xs">Network File and Folder Sharing</div>
                <div className="flex items-start gap-3 p-3 bg-[#262626] rounded border border-[#383838]">
                  <div className="w-10 h-10 rounded bg-blue-600/20 border border-blue-500/30 flex items-center justify-center shrink-0">
                    <Share2 className="w-5 h-5 text-blue-400" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <div className="text-white font-medium">
                      {isShared ? 'Shared' : 'Not Shared'}
                    </div>
                    <div className="text-neutral-400 text-[11px] font-mono select-all">
                      {isShared ? `\\\\DESKTOP-WIN11\\${originalName}` : '<Not Shared>'}
                    </div>
                  </div>
                  <button
                    id="btn-share-specific-people"
                    onClick={() => setShowShareDialog(true)}
                    className="px-3.5 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white font-medium text-xs transition-colors"
                  >
                    Share...
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-[#333333]" />

              {/* Advanced Sharing */}
              <div className="space-y-2">
                <div className="font-semibold text-white text-xs">Advanced Sharing</div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  Set advanced sharing settings such as permissions, caching, and concurrent user limits.
                </p>
                <div>
                  <button
                    id="btn-advanced-sharing"
                    onClick={() => setShowAdvancedSharingDialog(true)}
                    className="px-3.5 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white text-xs transition-colors"
                  >
                    Advanced Sharing...
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-[#333333]" />

              {/* Password Protection */}
              <div className="space-y-1 text-[11px] text-neutral-400">
                <div className="font-semibold text-white text-xs">Password Protection</div>
                <p className="leading-relaxed">
                  People without a user account and password for this computer cannot access network folders.
                </p>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: SECURITY                                                           */}
          {/* ========================================================================= */}
          {activeTab === 'security' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-xs">Group or user names:</span>
                <button
                  id="btn-edit-permissions"
                  onClick={() => setShowSecurityEditModal(true)}
                  className="px-3 py-1 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white text-[11px] transition-colors"
                >
                  Edit...
                </button>
              </div>

              {/* User Selection Box */}
              <div className="border border-[#383838] rounded bg-[#1b1b1b] p-1.5 max-h-28 overflow-y-auto space-y-0.5">
                {usersList.map((usr, idx) => (
                  <button
                    key={usr.id}
                    onClick={() => setSelectedUserIndex(idx)}
                    className={`w-full text-left px-2 py-1 rounded text-xs truncate flex items-center gap-2 ${
                      selectedUserIndex === idx
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-neutral-300 hover:bg-[#2a2a2a]'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5 shrink-0 opacity-70" />
                    <span className="truncate">{usr.name}</span>
                  </button>
                ))}
              </div>

              {/* Permissions for Selected User */}
              <div className="space-y-2 pt-1">
                <div className="text-white text-xs font-semibold">
                  Permissions for {usersList[selectedUserIndex]?.name.split(' ')[0]}
                </div>

                <div className="border border-[#383838] rounded bg-[#1b1b1b] overflow-hidden text-[11px]">
                  <div className="grid grid-cols-6 bg-[#252525] px-3 py-1 text-neutral-400 font-medium border-b border-[#333]">
                    <div className="col-span-4">Permissions</div>
                    <div className="col-span-1 text-center">Allow</div>
                    <div className="col-span-1 text-center">Deny</div>
                  </div>

                  <div className="divide-y divide-[#2a2a2a] p-1">
                    {[
                      { label: 'Full control', allow: usersList[selectedUserIndex]?.fullControl },
                      { label: 'Modify', allow: usersList[selectedUserIndex]?.modify },
                      { label: 'Read & execute', allow: usersList[selectedUserIndex]?.readExec },
                      { label: 'List folder contents', allow: usersList[selectedUserIndex]?.list },
                      { label: 'Read', allow: usersList[selectedUserIndex]?.read },
                      { label: 'Write', allow: usersList[selectedUserIndex]?.write },
                      { label: 'Special permissions', allow: false },
                    ].map((perm, idx) => (
                      <div key={idx} className="grid grid-cols-6 px-2 py-1 items-center hover:bg-[#222]">
                        <span className="col-span-4 text-neutral-200">{perm.label}</span>
                        <div className="col-span-1 flex justify-center">
                          <div className={`w-3.5 h-3.5 rounded border border-[#555] flex items-center justify-center ${perm.allow ? 'bg-blue-600 border-blue-500' : 'bg-[#222]'}`}>
                            {perm.allow && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                          </div>
                        </div>
                        <div className="col-span-1 flex justify-center">
                          <div className="w-3.5 h-3.5 rounded border border-[#555] bg-[#222]" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <span className="text-[11px] text-neutral-400">
                    For special permissions, click Advanced.
                  </span>
                  <button
                    onClick={() => showToast('Mở cấu hình bảo mật nâng cao (Advanced Security)')}
                    className="px-3 py-1 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white text-[11px]"
                  >
                    Advanced
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: PREVIOUS VERSIONS                                                  */}
          {/* ========================================================================= */}
          {activeTab === 'previous' && (
            <div className="space-y-4">
              <p className="text-neutral-300 text-[11.5px] leading-relaxed">
                Previous versions come from File History or from restore points.
              </p>

              <div className="border border-[#383838] rounded bg-[#1b1b1b] overflow-hidden">
                <div className="grid grid-cols-3 bg-[#252525] px-3 py-1.5 text-neutral-400 font-medium text-xs border-b border-[#333]">
                  <div className="col-span-2">Date modified</div>
                  <div>Type</div>
                </div>

                <div className="divide-y divide-[#2a2a2a] max-h-48 overflow-y-auto">
                  {previousVersions.map((v, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedVersionIndex(idx)}
                      className={`w-full grid grid-cols-3 px-3 py-2 text-left text-xs transition-colors ${
                        selectedVersionIndex === idx
                          ? 'bg-blue-600 text-white font-medium'
                          : 'text-neutral-200 hover:bg-[#252525]'
                      }`}
                    >
                      <div className="col-span-2 truncate">{v.date}</div>
                      <div className="truncate text-neutral-400">{v.type}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => showToast(`Xem phiên bản: ${previousVersions[selectedVersionIndex]?.date}`)}
                  className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white text-xs transition-colors"
                >
                  Open
                </button>
                <button
                  onClick={() => showToast(`Đã sao chép phiên bản vào Clipboard`)}
                  className="px-3 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white text-xs transition-colors"
                >
                  Copy...
                </button>
                <button
                  onClick={() => showToast(`Đã khôi phục thành công về phiên bản: ${previousVersions[selectedVersionIndex]?.date}`)}
                  className="px-4 py-1.5 bg-[#0067c0] hover:bg-[#1875d1] text-white font-medium rounded text-xs transition-colors shadow-xs"
                >
                  Restore
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: CUSTOMIZE (Crucial for user request)                              */}
          {/* ========================================================================= */}
          {activeTab === 'customize' && (
            <div className="space-y-4">
              {/* Folder optimization template */}
              <div className="space-y-2">
                <div className="font-semibold text-white text-xs">What kind of folder do you want?</div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-[11.5px] w-32 shrink-0">Optimize this folder for:</span>
                    <select
                      id="select-folder-template"
                      value={folderTemplate}
                      onChange={(e) => {
                        setFolderTemplate(e.target.value);
                        setHasChanges(true);
                      }}
                      className="flex-1 bg-[#1c1c1c] border border-[#3c3c3c] rounded px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-500"
                    >
                      <option value="General items">General items</option>
                      <option value="Documents">Documents</option>
                      <option value="Pictures">Pictures</option>
                      <option value="Music">Music (Âm thanh, .wav, .mp3)</option>
                      <option value="Videos">Videos</option>
                    </select>
                  </div>

                  <label className="flex items-center gap-2 pl-32 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={applyToSubfolders}
                      onChange={(e) => {
                        setApplyToSubfolders(e.target.checked);
                        setHasChanges(true);
                      }}
                      className="w-3.5 h-3.5 accent-blue-600 rounded"
                    />
                    <span className="text-neutral-300 text-[11px]">Also apply this template to all subfolders</span>
                  </label>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-[#333333]" />

              {/* Folder pictures */}
              <div className="space-y-2">
                <div className="font-semibold text-white text-xs">Folder pictures</div>
                <p className="text-neutral-400 text-[11px]">
                  Choose a picture file to show on this folder icon in Large Icons and Tiles view.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-choose-folder-pic"
                    onClick={() => showToast('Mở trình chọn ảnh bìa cho thư mục')}
                    className="px-3 py-1 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white text-xs transition-colors"
                  >
                    Choose File...
                  </button>
                  <button
                    id="btn-restore-folder-pic"
                    onClick={() => showToast('Đã khôi phục ảnh bìa mặc định')}
                    className="px-3 py-1 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white text-xs transition-colors"
                  >
                    Restore Default
                  </button>
                </div>
              </div>

              {/* Separator */}
              <div className="border-t border-[#333333]" />

              {/* Folder icons */}
              <div className="space-y-2">
                <div className="font-semibold text-white text-xs">Folder icons</div>
                <p className="text-neutral-400 text-[11px] leading-relaxed">
                  You can change the folder icon. If you change the icon, it will no longer show a preview of the folder contents.
                </p>

                <div className="flex items-center justify-between p-2.5 bg-[#252525] rounded border border-[#383838]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-[#1a1a1a] border border-[#444] flex items-center justify-center">
                      <SelectedIconComponent className={`w-6 h-6 ${selectedIconColor}`} />
                    </div>
                    <div>
                      <div className="text-white text-xs font-medium">
                        {WINDOWS_ICONS.find((i) => i.id === selectedIconId)?.label || 'Custom Folder'}
                      </div>
                      <div className="text-neutral-400 text-[10px]">Windows Shell32 Icon Asset</div>
                    </div>
                  </div>

                  <button
                    id="btn-change-folder-icon"
                    onClick={() => setShowChangeIconDialog(true)}
                    className="px-3.5 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white text-xs font-medium transition-colors"
                  >
                    Change Icon...
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Bottom Action Buttons (OK / Cancel / Apply) */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-[#252525] border-t border-[#333333]">
          <button
            id="btn-properties-ok"
            onClick={handleOK}
            className="px-4 py-1.5 bg-[#0067c0] hover:bg-[#1875d1] active:bg-[#005fb8] text-white font-medium text-xs rounded border border-[#005fb8] transition-colors shadow-xs"
          >
            OK
          </button>
          <button
            id="btn-properties-cancel"
            onClick={onClose}
            className="px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] active:bg-[#404040] text-neutral-200 text-xs rounded border border-[#484848] transition-colors"
          >
            Cancel
          </button>
          <button
            id="btn-properties-apply"
            disabled={!hasChanges}
            onClick={handleApply}
            className={`px-4 py-1.5 text-xs rounded border transition-colors ${
              hasChanges
                ? 'bg-[#2d2d2d] hover:bg-[#383838] text-white border-[#484848] cursor-pointer'
                : 'bg-[#202020] text-neutral-500 border-[#333333] cursor-not-allowed opacity-50'
            }`}
          >
            Apply
          </button>
        </div>

        {/* SUBDIALOG 1: ADVANCED ATTRIBUTES */}
        {showAdvancedAttributes && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-20"
            onClick={() => setShowAdvancedAttributes(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#262626] border border-[#444] rounded-md shadow-2xl p-4 w-full max-w-[340px] text-xs space-y-4"
            >
              <div className="flex items-center justify-between border-b border-[#383838] pb-2">
                <span className="font-semibold text-white">Advanced Attributes</span>
                <button
                  onClick={() => setShowAdvancedAttributes(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="font-semibold text-neutral-300">Archive and Index attributes</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isArchivingReady}
                      onChange={(e) => {
                        setIsArchivingReady(e.target.checked);
                        setHasChanges(true);
                      }}
                      className="accent-blue-600"
                    />
                    <span className="text-white text-[11px]">Folder is ready for archiving</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isIndexed}
                      onChange={(e) => {
                        setIsIndexed(e.target.checked);
                        setHasChanges(true);
                      }}
                      className="accent-blue-600"
                    />
                    <span className="text-white text-[11px]">Allow files in this folder to have contents indexed</span>
                  </label>
                </div>

                <div className="border-t border-[#383838]" />

                <div className="space-y-1.5">
                  <div className="font-semibold text-neutral-300">Compress or Encrypt attributes</div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isCompressed}
                      onChange={(e) => {
                        setIsCompressed(e.target.checked);
                        if (e.target.checked) setIsEncrypted(false);
                        setHasChanges(true);
                      }}
                      className="accent-blue-600"
                    />
                    <span className="text-white text-[11px]">Compress contents to save disk space</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isEncrypted}
                      onChange={(e) => {
                        setIsEncrypted(e.target.checked);
                        if (e.target.checked) setIsCompressed(false);
                        setHasChanges(true);
                      }}
                      className="accent-blue-600"
                    />
                    <span className="text-white text-[11px]">Encrypt contents to secure data</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAdvancedAttributes(false)}
                  className="px-4 py-1 bg-[#0067c0] text-white rounded font-medium hover:bg-[#1875d1]"
                >
                  OK
                </button>
                <button
                  onClick={() => setShowAdvancedAttributes(false)}
                  className="px-4 py-1 bg-[#2d2d2d] text-neutral-300 rounded hover:bg-[#383838]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBDIALOG 2: CHANGE ICON PICKER */}
        {showChangeIconDialog && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-20"
            onClick={() => setShowChangeIconDialog(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#262626] border border-[#444] rounded-md shadow-2xl p-4 w-full max-w-[360px] text-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#383838] pb-2">
                <span className="font-semibold text-white">Change Icon for Folder</span>
                <button
                  onClick={() => setShowChangeIconDialog(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-neutral-400">
                Select an icon from the list below:
              </p>

              {/* Icon Grid */}
              <div className="grid grid-cols-4 gap-2 bg-[#1b1b1b] p-2.5 rounded border border-[#383838] max-h-56 overflow-y-auto">
                {WINDOWS_ICONS.map((opt) => {
                  const IconComp = opt.icon;
                  const isSelected = selectedIconId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedIconId(opt.id);
                        setHasChanges(true);
                      }}
                      className={`flex flex-col items-center justify-center gap-1.5 p-2 rounded transition-colors ${
                        isSelected
                          ? 'bg-blue-600/30 border border-blue-500 text-white'
                          : 'hover:bg-[#2c2c2c] border border-transparent text-neutral-300'
                      }`}
                    >
                      <IconComp className={`w-7 h-7 ${opt.color}`} />
                      <span className="text-[9.5px] text-center leading-tight truncate w-full">
                        {opt.label.split(' ')[0]}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowChangeIconDialog(false)}
                  className="px-4 py-1 bg-[#0067c0] text-white rounded font-medium hover:bg-[#1875d1]"
                >
                  OK
                </button>
                <button
                  onClick={() => setShowChangeIconDialog(false)}
                  className="px-4 py-1 bg-[#2d2d2d] text-neutral-300 rounded hover:bg-[#383838]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBDIALOG 3: NETWORK ACCESS / SPECIFIC PEOPLE SHARING */}
        {showShareDialog && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-20"
            onClick={() => setShowShareDialog(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#262626] border border-[#444] rounded-md shadow-2xl p-4 w-full max-w-[380px] text-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#383838] pb-2">
                <span className="font-semibold text-white">File Sharing / Network Access</span>
                <button
                  onClick={() => setShowShareDialog(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-neutral-400">
                Choose people to share with. Enter a name or select from the list:
              </p>

              {/* Add User Row */}
              <div className="flex items-center gap-1.5">
                <select
                  value={newShareUser}
                  onChange={(e) => setNewShareUser(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#3c3c3c] rounded px-2 py-1 text-white text-xs"
                >
                  <option value="Everyone">Everyone (Mọi người trong mạng)</option>
                  <option value="Administrators">Administrators</option>
                  <option value="Authenticated Users">Authenticated Users</option>
                  <option value="Admin (bnvtoi5@gmail.com)">Admin (bnvtoi5@gmail.com)</option>
                </select>

                <select
                  value={newSharePerm}
                  onChange={(e) => setNewSharePerm(e.target.value as 'Read' | 'Read/Write')}
                  className="w-24 bg-[#1a1a1a] border border-[#3c3c3c] rounded px-2 py-1 text-white text-xs"
                >
                  <option value="Read">Read</option>
                  <option value="Read/Write">Read/Write</option>
                </select>

                <button
                  onClick={() => {
                    if (!sharedUsers.some((u) => u.name === newShareUser)) {
                      setSharedUsers([...sharedUsers, { name: newShareUser, permission: newSharePerm }]);
                    }
                  }}
                  className="px-3 py-1 bg-[#2d2d2d] hover:bg-[#383838] border border-[#444] rounded text-white font-medium"
                >
                  Add
                </button>
              </div>

              {/* Current Shared Users Table */}
              <div className="border border-[#383838] rounded bg-[#1b1b1b] overflow-hidden text-[11px]">
                <div className="grid grid-cols-6 bg-[#252525] px-2.5 py-1 text-neutral-400 font-medium border-b border-[#333]">
                  <span className="col-span-4">Name</span>
                  <span className="col-span-2">Permission</span>
                </div>
                <div className="divide-y divide-[#2a2a2a] max-h-32 overflow-y-auto">
                  {sharedUsers.map((u, idx) => (
                    <div key={idx} className="grid grid-cols-6 px-2.5 py-1.5 items-center">
                      <span className="col-span-4 text-neutral-200 truncate">{u.name}</span>
                      <span className="col-span-2 text-neutral-400">{u.permission}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Share Confirmation */}
              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsShared(true);
                    setHasChanges(true);
                    setShowShareDialog(false);
                    showToast(`Thư mục đã được chia sẻ mạng tại \\\\DESKTOP-WIN11\\${originalName}`);
                  }}
                  className="px-4 py-1.5 bg-[#0067c0] text-white font-medium rounded hover:bg-[#1875d1]"
                >
                  Share
                </button>
                <button
                  onClick={() => setShowShareDialog(false)}
                  className="px-4 py-1.5 bg-[#2d2d2d] text-neutral-300 rounded hover:bg-[#383838]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBDIALOG 4: ADVANCED SHARING */}
        {showAdvancedSharingDialog && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-20"
            onClick={() => setShowAdvancedSharingDialog(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#262626] border border-[#444] rounded-md shadow-2xl p-4 w-full max-w-[340px] text-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#383838] pb-2">
                <span className="font-semibold text-white">Advanced Sharing</span>
                <button
                  onClick={() => setShowAdvancedSharingDialog(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-white">
                  <input
                    type="checkbox"
                    checked={isShared}
                    onChange={(e) => {
                      setIsShared(e.target.checked);
                      setHasChanges(true);
                    }}
                    className="w-4 h-4 accent-blue-600 rounded"
                  />
                  <span>Share this folder</span>
                </label>

                <div className="space-y-1.5 pl-6">
                  <div>
                    <span className="text-neutral-400 text-[11px] block">Share name:</span>
                    <input
                      type="text"
                      disabled={!isShared}
                      value={originalName}
                      readOnly
                      className="w-full bg-[#1b1b1b] border border-[#3c3c3c] rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-neutral-400 text-[11px]">Limit simultaneous users to:</span>
                    <input
                      type="number"
                      disabled={!isShared}
                      value={shareUserLimit}
                      onChange={(e) => {
                        setShareUserLimit(parseInt(e.target.value) || 20);
                        setHasChanges(true);
                      }}
                      className="w-16 bg-[#1b1b1b] border border-[#3c3c3c] rounded px-2 py-1 text-white text-xs text-center disabled:opacity-50"
                    />
                  </div>

                  <div>
                    <span className="text-neutral-400 text-[11px] block">Comments:</span>
                    <input
                      type="text"
                      disabled={!isShared}
                      value={shareComments}
                      placeholder="Folder comments..."
                      onChange={(e) => {
                        setShareComments(e.target.value);
                        setHasChanges(true);
                      }}
                      className="w-full bg-[#1b1b1b] border border-[#3c3c3c] rounded px-2 py-1 text-white text-xs disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAdvancedSharingDialog(false)}
                  className="px-4 py-1 bg-[#0067c0] text-white rounded font-medium hover:bg-[#1875d1]"
                >
                  OK
                </button>
                <button
                  onClick={() => setShowAdvancedSharingDialog(false)}
                  className="px-4 py-1 bg-[#2d2d2d] text-neutral-300 rounded hover:bg-[#383838]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SUBDIALOG 5: SECURITY EDIT PERMISSIONS */}
        {showSecurityEditModal && (
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 z-20"
            onClick={() => setShowSecurityEditModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-[#262626] border border-[#444] rounded-md shadow-2xl p-4 w-full max-w-[340px] text-xs space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#383838] pb-2">
                <span className="font-semibold text-white">Permissions for {originalName}</span>
                <button
                  onClick={() => setShowSecurityEditModal(false)}
                  className="text-neutral-400 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="text-[11px] text-neutral-300">
                Editing NTFS security descriptors for user: {usersList[selectedUserIndex]?.name.split(' ')[0]}
              </p>

              <div className="border border-[#383838] rounded bg-[#1b1b1b] p-2 space-y-1.5 text-[11px]">
                {['Full control', 'Modify', 'Read & execute', 'List folder contents', 'Read', 'Write'].map((p, i) => (
                  <label key={i} className="flex items-center justify-between hover:bg-[#252525] p-1 rounded cursor-pointer">
                    <span className="text-white">{p}</span>
                    <input type="checkbox" defaultChecked={i < 5} className="accent-blue-600" />
                  </label>
                ))}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowSecurityEditModal(false);
                    showToast('Đã cập nhật quyền bảo mật Security Permissions');
                  }}
                  className="px-4 py-1 bg-[#0067c0] text-white rounded font-medium hover:bg-[#1875d1]"
                >
                  OK
                </button>
                <button
                  onClick={() => setShowSecurityEditModal(false)}
                  className="px-4 py-1 bg-[#2d2d2d] text-neutral-300 rounded hover:bg-[#383838]"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Action feedback toast */}
        {notificationMsg && (
          <div className="absolute bottom-14 left-4 right-4 bg-neutral-900 border border-blue-500/50 text-white px-3 py-2 rounded shadow-2xl text-[11px] flex items-center justify-between animate-in fade-in slide-in-from-bottom-2 z-30">
            <span>{notificationMsg}</span>
            <button onClick={() => setNotificationMsg(null)} className="text-neutral-400 hover:text-white ml-2">
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
