import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';

import { findApps } from './main/utils/util';
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;

import started from 'electron-squirrel-startup';

let nativeAddon: any;
try {
  nativeAddon = require(
    path.join(__dirname, '../../build/Release/process_monitor.node')
  );
  console.log('✅ Native addon loaded successfully');
} catch (error) {
  console.error('❌ Failed to load native addon:', error);
}

if (started) {
  app.quit();
}
app.disableHardwareAcceleration();

if (process.platform === 'win32') {
  app.commandLine.appendSwitch('disable-gpu');
  app.commandLine.appendSwitch('disable-software-rasterizer');
}
const createWindow = () => {
  // Get primary display dimensions
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width: screenWidth, height: screenHeight } =
    primaryDisplay.workAreaSize;

  // Define window dimensions
  const windowWidth = 300;
  const windowHeight = 400;

  // Calculate position for top-right corner
  const x = screenWidth - windowWidth;
  const y = 0;

  // Create the browser window
  const mainWindow = new BrowserWindow({
    width: windowWidth,
    height: windowHeight,
    x: x,
    y: y,
    frame: false, // Frameless window
    transparent: true, // Optional: makes window background transparent
    alwaysOnTop: true, // Keeps window on top
    resizable: false, // Prevent resizing
    skipTaskbar: true, // Don't show in taskbar (optional)
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow);

ipcMain.handle('get-all-processes', async () => {
  try {
    if (!nativeAddon) {
      throw new Error('Native addon not loaded');
    }
    const processes = nativeAddon.getProcesses();
    // const values = findApps(processes);
    // console.log(values, "values");
    return { success: true, data: processes };
  } catch (error: any) {
    console.error('Error getting processes:', error);
    return { success: false, error: error.message };
  }
});
ipcMain.handle('shutdown-app', () => {
  console.log('Shutting down application...');
  app.quit();
});
ipcMain.handle('get-gui-apps-only', async () => {
  try {
    if (!nativeAddon) throw new Error('Native addon not loaded');
    const guiApps = nativeAddon.getGuiApps();
    const apps = findApps(guiApps);
    return { success: true, data: apps };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
});
// Add IPC handler to close the window
ipcMain.on('close-window', () => {
  const windows = BrowserWindow.getAllWindows();
  windows.forEach(window => window.close());
});

// Add IPC handler to minimize the window (optional)
ipcMain.on('minimize-window', () => {
  const focusedWindow = BrowserWindow.getFocusedWindow();
  if (focusedWindow) {
    focusedWindow.minimize();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// Quit when all windows are closed, except on macOS
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
