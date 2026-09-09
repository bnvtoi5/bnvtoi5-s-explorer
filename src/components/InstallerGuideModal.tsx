import React, { useState } from 'react';
import {
  X,
  PackageCheck,
  CheckCircle2,
  Terminal,
  Download,
  ShieldCheck,
  HardDrive,
  Copy,
  Check,
  Layers,
} from 'lucide-react';

interface InstallerGuideModalProps {
  onClose: () => void;
}

export const InstallerGuideModal: React.FC<InstallerGuideModalProps> = ({ onClose }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'build' | 'install_ux' | 'safety'>('overview');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div
      id="installer-guide-overlay"
      className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4 select-none"
      onClick={onClose}
    >
      <div
        id="installer-guide-dialog"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl border border-neutral-300 w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden text-neutral-800"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-blue-900 to-indigo-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md">
              <PackageCheck className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <h2 className="font-semibold text-base">Windows 11 Installer &amp; Packaging</h2>
              <p className="text-blue-200 text-xs">Standard double-click installer &amp; portable application</p>
            </div>
          </div>
          <button
            id="btn-close-installer-guide"
            onClick={onClose}
            className="p-1.5 text-blue-200 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-neutral-200 bg-neutral-50 px-6 pt-2 text-xs">
          {[
            { id: 'overview' as const, label: 'Deliverables' },
            { id: 'build' as const, label: 'One-Command Build' },
            { id: 'install_ux' as const, label: 'Installer UX' },
            { id: 'safety' as const, label: 'Update Safety' },
          ].map((tab) => (
            <button
              key={tab.id}
              id={`tab-installer-${tab.id}`}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 font-medium border-b-2 transition-all ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600 bg-white'
                  : 'border-transparent text-neutral-600 hover:text-neutral-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 text-xs">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 leading-relaxed">
                <strong>Configured for Ordinary Windows 11 Users:</strong> The end user simply double-clicks the <code>.exe</code> to install or run. No Node.js, Python, Rust, terminal commands, or debugging required!
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Deliverable 1: Installer */}
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2.5">
                  <div className="flex items-center gap-2 text-blue-700 font-semibold text-sm">
                    <Download className="w-4 h-4" />
                    <span>1. ExplorerApp-Setup.exe</span>
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    Standard Windows NSIS setup package. Double-click to install into <code>C:\Program Files\Explorer App\</code> with Start Menu and Desktop shortcuts.
                  </p>
                  <div className="text-[11px] text-neutral-500 space-y-1">
                    <div>• Generates uninstaller in Windows Settings &gt; Apps</div>
                    <div>• Self-contained: includes all WebView2 hooks and native binary</div>
                  </div>
                </div>

                {/* Deliverable 2: Portable */}
                <div className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/50 space-y-2.5">
                  <div className="flex items-center gap-2 text-indigo-700 font-semibold text-sm">
                    <Layers className="w-4 h-4" />
                    <span>2. ExplorerApp-Portable.exe</span>
                  </div>
                  <p className="text-neutral-600 leading-relaxed">
                    Standalone portable executable. Runs immediately from any USB flash drive or folder without installing.
                  </p>
                  <div className="text-[11px] text-neutral-500 space-y-1">
                    <div>• No installation or admin rights required</div>
                    <div>• Keeps settings in user profile, completely clean</div>
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-200 pt-3">
                <div className="font-semibold text-neutral-800 mb-2">Automated Cloud Releases (GitHub Actions)</div>
                <p className="text-neutral-600 leading-relaxed">
                  A complete GitHub Actions workflow is pre-configured in <code>.github/workflows/build-windows.yml</code>. Whenever you push code, GitHub builds <code>ExplorerApp-Setup.exe</code> and <code>ExplorerApp-Portable.exe</code> on Microsoft Windows runners and provides instant 1-click download links under the Actions/Releases tab!
                </p>
              </div>
            </div>
          )}

          {activeTab === 'build' && (
            <div className="space-y-4">
              <div className="font-semibold text-neutral-800">
                Exact One-Command Build Process
              </div>

              <div className="space-y-3">
                <div className="p-3 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                    <span>1. Build Windows NSIS Installer &amp; Portable Executable</span>
                    <button
                      onClick={() => copyToClipboard('npm run build:windows', 1)}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedIndex === 1 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIndex === 1 ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-emerald-400">npm run build:windows</div>
                </div>

                <div className="p-3 bg-neutral-900 text-neutral-100 rounded-xl font-mono text-xs space-y-2">
                  <div className="flex items-center justify-between text-neutral-400 text-[10px]">
                    <span>2. Or Double-Click Batch Script on Windows</span>
                    <button
                      onClick={() => copyToClipboard('.\\scripts\\build-windows.bat', 2)}
                      className="hover:text-white flex items-center gap-1"
                    >
                      {copiedIndex === 2 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedIndex === 2 ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                  <div className="text-amber-400">.\scripts\build-windows.bat</div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <div className="font-semibold text-neutral-800">Exact Locations of Generated Files:</div>
                <div className="space-y-1.5 font-mono text-[11px] text-neutral-700">
                  <div className="p-2 bg-neutral-100 rounded-md">
                    <strong>Installer:</strong> src-tauri\target\release\bundle\nsis\ExplorerApp-Setup.exe (or .\release\ExplorerApp-Setup.exe)
                  </div>
                  <div className="p-2 bg-neutral-100 rounded-md">
                    <strong>Portable:</strong> src-tauri\target\release\ExplorerApp-Portable.exe (or .\release\ExplorerApp-Portable.exe)
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'install_ux' && (
            <div className="space-y-4">
              <div className="font-semibold text-neutral-800">
                End-User Installer Experience:
              </div>

              {/* Mockup of Installer Window */}
              <div className="border border-neutral-300 rounded-xl p-5 bg-neutral-50 shadow-md space-y-4 max-w-md mx-auto">
                <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
                  <span className="font-semibold text-sm text-neutral-800">Explorer App Setup</span>
                  <span className="text-[10px] text-neutral-400">v1.0.0</span>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="text-neutral-500 block mb-1">Installation folder:</label>
                    <div className="px-3 py-1.5 bg-white border border-neutral-300 rounded text-neutral-800 font-mono text-[11px]">
                      C:\Program Files\Explorer App\
                    </div>
                  </div>

                  <div className="space-y-1.5 pt-1">
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
                      <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                      <span>Create Desktop shortcut</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer text-neutral-700">
                      <input type="checkbox" defaultChecked className="rounded text-blue-600" />
                      <span>Launch Explorer App after installation</span>
                    </label>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200">
                  <button className="px-3 py-1 bg-neutral-200 text-neutral-600 rounded text-xs">
                    Cancel
                  </button>
                  <button className="px-5 py-1 bg-blue-600 text-white font-medium rounded text-xs shadow-xs">
                    Install
                  </button>
                </div>
              </div>

              <div className="text-[11px] text-neutral-500 text-center">
                Clean native NSIS wizard requiring zero command line interaction.
              </div>
            </div>
          )}

          {activeTab === 'safety' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-emerald-700 font-semibold text-sm">
                <ShieldCheck className="w-5 h-5" />
                <span>Update &amp; Reinstall Safety Guaranteed</span>
              </div>

              <p className="text-neutral-600 leading-relaxed">
                As strictly requested, user preferences and state are <strong>never stored inside the installation folder</strong>.
              </p>

              <div className="p-3 bg-neutral-50 border border-neutral-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-medium text-neutral-800">
                  <HardDrive className="w-4 h-4 text-blue-600" />
                  <span>Isolated Data Separation:</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-white rounded border border-neutral-200">
                    <div className="font-semibold text-neutral-700">Application Binaries:</div>
                    <code className="text-blue-600 break-all">C:\Program Files\Explorer App\</code>
                    <div className="text-neutral-400 mt-1">Replaced cleanly during updates</div>
                  </div>
                  <div className="p-2 bg-white rounded border border-neutral-200">
                    <div className="font-semibold text-neutral-700">User Data &amp; Preferences:</div>
                    <code className="text-emerald-700 break-all">%APPDATA%\ExplorerApp\settings.json</code>
                    <div className="text-neutral-400 mt-1">Preserved forever across updates</div>
                  </div>
                </div>
              </div>

              <div className="space-y-1.5 text-neutral-600">
                <div className="font-semibold text-neutral-800">What is safely preserved:</div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pinned folders in Quick Access</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>User preferences (View mode, Sort options, Show hidden files)</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Window dimensions and search index cache</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3 bg-neutral-50 border-t border-neutral-200">
          <span className="text-[11px] text-neutral-400">
            Explorer App v1.0.0 • Designed for Windows 11
          </span>
          <button
            id="btn-close-installer-guide-footer"
            onClick={onClose}
            className="px-4 py-1.5 bg-neutral-800 hover:bg-neutral-900 text-white rounded-lg text-xs font-medium transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
