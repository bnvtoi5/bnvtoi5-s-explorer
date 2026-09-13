import React, { useState } from 'react';
import { X, Users, Share2, Check, Copy, Shield, ShieldOff } from 'lucide-react';

interface NetworkAccessModalProps {
  folderName: string;
  folderPath: string;
  isOpen: boolean;
  onClose: () => void;
  onShareComplete?: (networkPath: string) => void;
}

export const NetworkAccessModal: React.FC<NetworkAccessModalProps> = ({
  folderName,
  folderPath,
  isOpen,
  onClose,
  onShareComplete,
}) => {
  const [selectedUser, setSelectedUser] = useState('Everyone');
  const [selectedPerm, setSelectedPerm] = useState<'Read' | 'Read/Write'>('Read');
  const [people, setPeople] = useState<Array<{ name: string; permission: string; isOwner?: boolean }>>([
    { name: 'Admin (bnvtoi5@gmail.com)', permission: 'Owner', isOwner: true },
    { name: 'Administrators', permission: 'Read/Write' },
  ]);
  const [isSharedStep, setIsSharedStep] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const networkPath = `\\\\DESKTOP-WIN11\\${folderName}`;

  const handleAddPerson = () => {
    if (!people.some((p) => p.name === selectedUser)) {
      setPeople([...people, { name: selectedUser, permission: selectedPerm }]);
    }
  };

  const handleRemovePerson = (name: string) => {
    setPeople(people.filter((p) => p.name !== name));
  };

  const handleShare = () => {
    try {
      const sharedList: string[] = JSON.parse(localStorage.getItem('explorer_shared_folders') || '[]');
      if (!sharedList.includes(folderPath)) {
        sharedList.push(folderPath);
        localStorage.setItem('explorer_shared_folders', JSON.stringify(sharedList));
      }
    } catch {
      // Ignore
    }
    setIsSharedStep(true);
    if (onShareComplete) {
      onShareComplete(networkPath);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(networkPath);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div
      id="network-access-overlay"
      className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none animate-in fade-in duration-100"
      onClick={onClose}
    >
      <div
        id="network-access-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-[#202020] border border-[#383838] rounded-lg shadow-2xl w-full max-w-[440px] text-xs text-[#e5e5e5] font-sans flex flex-col overflow-hidden"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between pl-3 pr-1 py-1.5 bg-[#262626] border-b border-[#333333]">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-400" />
            <span className="font-medium text-[12px] text-white">Network Access - File Sharing</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-6 flex items-center justify-center text-neutral-400 hover:text-white hover:bg-[#c42b1c] rounded transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3.5">
          {!isSharedStep ? (
            <>
              <div>
                <h3 className="text-sm font-semibold text-white">
                  Choose people to share with
                </h3>
                <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                  Type a name and then click Add, or click the arrow to find someone on your local network.
                </p>
              </div>

              {/* Add person input bar */}
              <div className="flex items-center gap-1.5 pt-1">
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="flex-1 bg-[#1a1a1a] border border-[#3c3c3c] rounded px-2.5 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="Everyone">Everyone (Mọi người trong mạng nội bộ)</option>
                  <option value="Authenticated Users">Authenticated Users</option>
                  <option value="Guest">Guest Account</option>
                  <option value="Administrators">Administrators</option>
                </select>

                <select
                  value={selectedPerm}
                  onChange={(e) => setSelectedPerm(e.target.value as 'Read' | 'Read/Write')}
                  className="w-24 bg-[#1a1a1a] border border-[#3c3c3c] rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
                >
                  <option value="Read">Read</option>
                  <option value="Read/Write">Read/Write</option>
                </select>

                <button
                  id="btn-add-share-user"
                  onClick={handleAddPerson}
                  className="px-3.5 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] border border-[#484848] rounded text-white font-medium text-xs transition-colors"
                >
                  Add
                </button>
              </div>

              {/* People Table */}
              <div className="border border-[#383838] rounded bg-[#1b1b1b] overflow-hidden text-[11px]">
                <div className="grid grid-cols-6 bg-[#252525] px-3 py-1.5 text-neutral-400 font-medium border-b border-[#333]">
                  <span className="col-span-3">Name</span>
                  <span className="col-span-2">Permission Level</span>
                  <span className="col-span-1 text-right">Action</span>
                </div>

                <div className="divide-y divide-[#2a2a2a] max-h-40 overflow-y-auto">
                  {people.map((p, idx) => (
                    <div key={idx} className="grid grid-cols-6 px-3 py-2 items-center hover:bg-[#222]">
                      <div className="col-span-3 flex items-center gap-1.5 truncate">
                        <Users className="w-3 h-3 text-neutral-400 shrink-0" />
                        <span className="text-white truncate">{p.name}</span>
                      </div>
                      <span className="col-span-2 text-neutral-300 font-mono text-[10px]">
                        {p.permission}
                      </span>
                      <div className="col-span-1 text-right">
                        {!p.isOwner && (
                          <button
                            onClick={() => handleRemovePerson(p.name)}
                            className="text-neutral-400 hover:text-rose-400 text-[10px]"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Step 2: Shared successfully */
            <div className="space-y-4 py-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center shrink-0">
                  <Check className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-white">Your folder is shared</h3>
                  <p className="text-[11.5px] text-neutral-400">
                    People on your network can view or modify files based on their permissions.
                  </p>
                </div>
              </div>

              {/* Shared folder link box */}
              <div className="p-3 bg-[#1a1a1a] rounded border border-[#383838] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-neutral-400 text-[11px]">Network Path:</span>
                  <button
                    onClick={handleCopyLink}
                    className="flex items-center gap-1 text-blue-400 hover:text-blue-300 text-[11px]"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied!' : 'Copy Link'}</span>
                  </button>
                </div>
                <div className="text-white font-mono text-xs select-all bg-[#242424] px-2.5 py-1.5 rounded border border-[#333]">
                  {networkPath}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dialog Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-2.5 bg-[#252525] border-t border-[#333333]">
          {!isSharedStep ? (
            <>
              <button
                id="btn-confirm-share"
                onClick={handleShare}
                className="px-4 py-1.5 bg-[#0067c0] hover:bg-[#1875d1] text-white font-medium text-xs rounded border border-[#005fb8] transition-colors shadow-xs"
              >
                Share
              </button>
              <button
                onClick={onClose}
                className="px-4 py-1.5 bg-[#2d2d2d] hover:bg-[#383838] text-neutral-300 text-xs rounded border border-[#484848] transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              id="btn-done-share"
              onClick={onClose}
              className="px-5 py-1.5 bg-[#0067c0] hover:bg-[#1875d1] text-white font-medium text-xs rounded border border-[#005fb8] transition-colors shadow-xs"
            >
              Done
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
