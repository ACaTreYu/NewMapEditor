import { app, BrowserWindow, ipcMain, dialog, Menu } from 'electron';
import path from 'path';
import fs from 'fs';
import zlib from 'zlib';

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    icon: path.join(__dirname, '..', 'atom.png'),
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

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Set up application menu
  const menuTemplate: any = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'new');
          }
        },
        {
          label: 'Open...',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'open');
          }
        },
        {
          label: 'Save',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'save');
          }
        },
        { type: 'separator' },
        {
          label: 'Exit',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'undo');
          }
        },
        {
          label: 'Redo',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'redo');
          }
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
      label: 'View',
      submenu: [
        {
          label: 'Center on Selection',
          accelerator: 'CmdOrCtrl+E',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'center-selection');
          }
        }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'Cascade',
          click: () => {
            mainWindow?.webContents.send('arrange-windows', 'cascade');
          }
        },
        {
          label: 'Tile Horizontal',
          click: () => {
            mainWindow?.webContents.send('arrange-windows', 'tileHorizontal');
          }
        },
        {
          label: 'Tile Vertical',
          click: () => {
            mainWindow?.webContents.send('arrange-windows', 'tileVertical');
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

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

ipcMain.handle('dialog:saveFile', async () => {
  const result = await dialog.showSaveDialog(mainWindow!, {
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
    : path.join(path.dirname(app.getPath('exe')), 'resources', 'assets', 'patches');

  // Ensure the patches directory exists
  if (!fs.existsSync(patchesDir)) {
    fs.mkdirSync(patchesDir, { recursive: true });
  }

  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
    defaultPath: patchesDir,
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
