import { app, BrowserWindow, ipcMain, dialog, Menu, nativeTheme } from 'electron';
import { autoUpdater } from 'electron-updater';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';
import { isLinux, registerWindowAllClosed, logPlatformPaths, tryLinuxAppImageRelaunch } from './platform';

// Linux: disable sandbox to avoid SIGTRAP crash on Ubuntu 24.04+.
// AppArmor restricts unprivileged user namespaces, breaking Chromium's
// sandbox even with correct chrome-sandbox SUID permissions in .deb.
if (isLinux) {
  app.commandLine.appendSwitch('no-sandbox');
}

let mainWindow: BrowserWindow | null = null;
let splashWindow: BrowserWindow | null = null;
let splashCreatedAt = 0;
let currentTheme = 'auto';

// Ensure userData directory exists (defensive — Electron usually creates it, but
// on first-run Linux the dir may not exist yet when we try to write the marker)
try { fs.mkdirSync(app.getPath('userData'), { recursive: true }); } catch (_) {}

// Detect update restart via marker file
const updateMarkerPath = path.join(app.getPath('userData'), '.update-restart');
const isUpdateRestart = fs.existsSync(updateMarkerPath);
if (isUpdateRestart) {
  try { fs.unlinkSync(updateMarkerPath); } catch (_) {}
}
const SPLASH_MIN_MS = isUpdateRestart ? 2000 : 5000;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createSplashScreen() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    alwaysOnTop: true,
    transparent: false,
    backgroundColor: '#1e1e1e',
    resizable: false,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  const version = app.getVersion();
  const html = `<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <style>
      body {
        margin: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100vh;
        background: #1e1e1e;
        color: #fff;
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
        user-select: none;
      }
      .splash { text-align: center; padding: 40px; }
      h1 { margin: 0 0 16px 0; font-size: 28px; font-weight: 300; letter-spacing: 1px; }
      .version { font-size: 14px; color: #888; margin: 8px 0; }
      .copyright { font-size: 12px; color: #666; margin-top: 24px; }
      .author { font-size: 11px; color: #555; margin-top: 4px; }
    </style>
  </head>
  <body>
    <div class="splash">
      <h1>AC Map Editor</h1>
      <div class="version">Version ${version}</div>
      <div class="copyright">\u00A9 Arcbound Interactive 2026</div>
      <div class="author">by aTreYu (Jacob Albert)</div>
    </div>
  </body>
</html>`;

  splashWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`);
  splashWindow.center();
  splashCreatedAt = Date.now();
}

function buildMenu() {
  const menuTemplate: any = [
    {
      label: '&File',
      submenu: [
        {
          label: 'New',
          click: () => { mainWindow?.webContents.send('menu-action', 'new'); }
        },
        {
          label: 'Open...',
          click: () => { mainWindow?.webContents.send('menu-action', 'open'); }
        },
        {
          label: 'Save',
          click: () => { mainWindow?.webContents.send('menu-action', 'save'); }
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => { mainWindow?.webContents.send('menu-action', 'save-as'); }
        },
        { type: 'separator' },
        {
          label: 'Import Trace Image...',
          click: () => { mainWindow?.webContents.send('menu-action', 'import-trace-image'); }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => { app.quit(); }
        }
      ]
    },
    {
      label: '&Edit',
      submenu: [
        {
          label: 'Undo',
          click: () => { mainWindow?.webContents.send('menu-action', 'undo'); }
        },
        {
          label: 'Redo',
          click: () => { mainWindow?.webContents.send('menu-action', 'redo'); }
        },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'delete' },
        { type: 'separator' },
        { role: 'selectAll' }
      ]
    },
    {
      label: '&View',
      submenu: [
        {
          label: 'Center on Selection',
          accelerator: 'CmdOrCtrl+E',
          click: () => { mainWindow?.webContents.send('menu-action', 'center-selection'); }
        },
        { type: 'separator' },
        {
          label: 'Theme',
          submenu: [
            {
              label: 'Auto (System)',
              type: 'radio',
              checked: currentTheme === 'auto',
              click: () => {
                currentTheme = 'auto';
                mainWindow?.webContents.send('set-theme', 'auto');
              }
            },
            {
              label: 'Light',
              type: 'radio',
              checked: currentTheme === 'light',
              click: () => {
                currentTheme = 'light';
                mainWindow?.webContents.send('set-theme', 'light');
              }
            },
            {
              label: 'Dark',
              type: 'radio',
              checked: currentTheme === 'dark',
              click: () => {
                currentTheme = 'dark';
                mainWindow?.webContents.send('set-theme', 'dark');
              }
            },
            {
              label: 'Terminal',
              type: 'radio',
              checked: currentTheme === 'terminal',
              click: () => {
                currentTheme = 'terminal';
                mainWindow?.webContents.send('set-theme', 'terminal');
              }
            }
          ]
        }
      ]
    },
    {
      label: '&Window',
      submenu: [
        {
          label: 'Cascade',
          click: () => { mainWindow?.webContents.send('arrange-windows', 'cascade'); }
        },
        {
          label: 'Tile Horizontal',
          click: () => { mainWindow?.webContents.send('arrange-windows', 'tileHorizontal'); }
        },
        {
          label: 'Tile Vertical',
          click: () => { mainWindow?.webContents.send('arrange-windows', 'tileVertical'); }
        }
      ]
    },
    {
      label: '&Help',
      submenu: [
        {
          label: 'Check for Updates...',
          click: () => {
            if (!isDev) {
              manualCheckInProgress = true;
              mainWindow?.webContents.send('update-status', 'checking');
              autoUpdater.checkForUpdates().catch((err: Error) => {
                manualCheckInProgress = false;
                mainWindow?.webContents.send('update-status', 'idle');
                dialog.showMessageBoxSync(mainWindow!, {
                  type: 'error',
                  title: 'Update Error',
                  message: 'Failed to check for updates.',
                  detail: err.message,
                  buttons: ['OK']
                });
              });
            } else {
              dialog.showMessageBoxSync(mainWindow!, {
                type: 'info',
                title: 'Updates',
                message: 'Auto-update is disabled in development mode.',
                buttons: ['OK']
              });
            }
          }
        },
        { type: 'separator' },
        {
          label: 'About AC Map Editor',
          click: () => {
            dialog.showMessageBoxSync(mainWindow!, {
              type: 'info',
              title: 'About AC Map Editor',
              message: 'AC Map Editor',
              detail: `Version ${app.getVersion()}\n\n\u00A9 Arcbound Interactive 2026\nby aTreYu (Jacob Albert)`,
              buttons: ['OK']
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

function createWindow() {
  createSplashScreen();

  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '..', 'atom.png'),
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    },
    title: 'AC Map Editor'
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    const elapsed = Date.now() - splashCreatedAt;
    const remaining = Math.max(0, SPLASH_MIN_MS - elapsed);
    setTimeout(() => {
      if (splashWindow) {
        splashWindow.close();
        splashWindow = null;
      }
      mainWindow?.show();
    }, remaining);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  buildMenu();

  // Listen for theme-sync from renderer to update menu radio state
  ipcMain.on('theme-sync', (_, theme: string) => {
    currentTheme = theme;
    buildMenu();
  });

  // Forward OS theme changes to renderer when in auto mode
  nativeTheme.on('updated', () => {
    if (currentTheme === 'auto') {
      mainWindow?.webContents.send('set-theme', 'auto');
    }
  });
}

// ── Auto-updater setup ──────────────────────────────────────────────
let manualCheckInProgress = false;

function setupAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    mainWindow?.webContents.send('update-status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    manualCheckInProgress = false;
    mainWindow?.webContents.send('update-status', 'downloading', info.version);
  });

  autoUpdater.on('update-not-available', () => {
    mainWindow?.webContents.send('update-status', 'up-to-date');
    // Show dialog for manual checks (not on background timer checks)
    if (manualCheckInProgress) {
      manualCheckInProgress = false;
      dialog.showMessageBox(mainWindow!, {
        type: 'info',
        title: 'No Updates',
        message: `You're on the latest version (${app.getVersion()}).`,
        buttons: ['OK']
      });
    }
  });

  autoUpdater.on('download-progress', (progress) => {
    mainWindow?.webContents.send('update-status', 'progress', undefined, Math.round(progress.percent));
  });

  autoUpdater.on('update-downloaded', (info) => {
    mainWindow?.webContents.send('update-status', 'ready', info.version);
  });

  autoUpdater.on('error', (err) => {
    mainWindow?.webContents.send('update-status', 'error');
    if (manualCheckInProgress) {
      manualCheckInProgress = false;
      dialog.showMessageBox(mainWindow!, {
        type: 'error',
        title: 'Update Error',
        message: 'Failed to check for updates.',
        detail: err?.message || 'Unknown error',
        buttons: ['OK']
      });
    }
  });

  // User clicked "restart now" from renderer
  ipcMain.on('update-install', () => {
    try { fs.writeFileSync(updateMarkerPath, ''); } catch (_) {}
    if (!tryLinuxAppImageRelaunch()) {
      autoUpdater.quitAndInstall(true, true); // Windows/macOS: silent install + relaunch
    }
  });

  // Check on launch (delay to not compete with startup)
  setTimeout(() => autoUpdater.checkForUpdates(), 5000);

  // Re-check every 30 minutes
  setInterval(() => autoUpdater.checkForUpdates(), 30 * 60 * 1000);
}

app.whenReady().then(() => {
  createWindow();
  logPlatformPaths(isDev);
  if (!isDev) {
    setupAutoUpdater();
  }
});

registerWindowAllClosed(app);

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC Handlers for file operations

ipcMain.handle('dialog:openFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Map Files', extensions: ['map', 'lvl'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('dialog:openImageFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'bmp', 'webp', 'svg', 'gif'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('dialog:saveFile', async (_, defaultPath?: string) => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    defaultPath,
    filters: [
      { name: 'Map Files', extensions: ['map'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return result.filePath;
});

ipcMain.handle('file:writeText', async (_, filePath: string, text: string) => {
  try {
    fs.writeFileSync(filePath, text, 'utf8');
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('dialog:saveTextFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
    filters: [
      { name: 'Text Files', extensions: ['txt'] },
      { name: 'Markdown Files', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || !result.filePath) {
    return null;
  }

  return result.filePath;
});

ipcMain.handle('file:read', async (_, filePath: string) => {
  try {
    const buffer = fs.readFileSync(filePath);
    return { success: true, data: buffer.toString('base64') };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('file:write', async (_, filePath: string, data: string) => {
  try {
    const buffer = Buffer.from(data, 'base64');
    fs.writeFileSync(filePath, buffer);
    return { success: true };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('zlib:decompress', async (_, data: string) => {
  try {
    const inputBuffer = Buffer.from(data, 'base64');
    const result = zlib.inflateSync(inputBuffer);
    return { success: true, data: result.toString('base64') };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('zlib:compress', async (_, data: string) => {
  try {
    const inputBuffer = Buffer.from(data, 'base64');
    const result = zlib.deflateSync(inputBuffer, { level: 9 });
    return { success: true, data: result.toString('base64') };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

ipcMain.handle('dialog:openDllFile', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openFile'],
    filters: [
      { name: 'DLL Files', extensions: ['dll'] },
      { name: 'All Files', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('dialog:openPatchFolder', async () => {
  const patchesDir = isDev
    ? path.join(process.cwd(), 'public', 'assets', 'patches')
    : path.join(process.resourcesPath, 'patches');

  // Use patches dir as default if it exists, otherwise fall back to home
  const defaultPath = fs.existsSync(patchesDir) ? patchesDir : app.getPath('home');

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    defaultPath,
    title: 'Select Graphics Patch Folder'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return result.filePaths[0];
});

ipcMain.handle('file:listDir', async (_, dirPath: string) => {
  try {
    const entries = fs.readdirSync(dirPath);
    return { success: true, files: entries };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
});

// Window title
ipcMain.on('set-title', (_, title: string) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});

// Save confirmation dialog (Yes=0, No=1, Cancel=2)
ipcMain.handle('dialog:confirmSave', async (_, filename: string) => {
  const result = dialog.showMessageBoxSync(mainWindow!, {
    type: 'question',
    buttons: ['Yes', 'No', 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    title: 'Save Changes',
    message: `Save changes to ${filename}?`
  });
  return result; // 0=Yes, 1=No, 2=Cancel
});
