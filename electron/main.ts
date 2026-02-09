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
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'new');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'open');
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
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
          accelerator: 'CmdOrCtrl+Z',
          click: () => {
            mainWindow?.webContents.send('menu-action', 'undo');
          }
        },
        {
          label: 'Redo',
          accelerator: 'CmdOrCtrl+Y',
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

// Window title
ipcMain.on('set-title', (_, title: string) => {
  if (mainWindow) {
    mainWindow.setTitle(title);
  }
});
