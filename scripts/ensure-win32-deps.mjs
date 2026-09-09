import { execSync } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

/**
 * Ensures Windows x64 native binary packages are installed.
 * Works around npm bug #4828 where npm fails to install optionalDependencies
 * on Windows when a cross-platform lockfile or cache is used.
 */
if (process.platform === 'win32' && process.arch === 'x64') {
  const win32Packages = [
    '@rollup/rollup-win32-x64-msvc@4.63.1',
    'lightningcss-win32-x64-msvc@1.32.0',
    '@tailwindcss/oxide-win32-x64-msvc@4.3.3',
    '@esbuild/win32-x64@0.25.12',
    '@tauri-apps/cli-win32-x64-msvc@2.11.4',
  ];

  let missing = false;
  for (const pkg of win32Packages) {
    const pkgName = pkg.startsWith('@')
      ? pkg.split('@').slice(0, 2).join('@').split('@')[1] ? `@${pkg.split('@')[1]}` : pkg
      : pkg.split('@')[0];

    const targetDir = path.join(projectRoot, 'node_modules', pkgName);
    if (!existsSync(targetDir)) {
      missing = true;
      break;
    }
  }

  if (missing) {
    console.log('[ExplorerApp] Windows x64 detected: Installing native build binaries to bypass npm bug #4828...');
    try {
      execSync(`npm install --no-save --no-audit ${win32Packages.join(' ')}`, {
        cwd: projectRoot,
        stdio: 'inherit',
      });
      console.log('[ExplorerApp] Successfully installed native Windows x64 build binaries.');
    } catch (err) {
      console.warn('[ExplorerApp] Warning: Failed to auto-install some optional dependencies:', err.message);
    }
  }
}
