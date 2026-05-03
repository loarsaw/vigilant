import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}
app.commandLine.appendSwitch('ignore-certificate-errors');
let nativeAddon: any;
try {
  nativeAddon = require(path.join(__dirname, "../../build/Release/process_monitor.node"));
} catch (error) {
  console.error("❌ Failed to load native addon:", error);
}

const PROTOCOL = "vigilant-code";
let pendingDeepLink: string | null = null;

if (process.platform === "win32" || process.platform === "linux") {
  if (process.defaultApp) {
    if (process.argv.length >= 2) {
      app.setAsDefaultProtocolClient(PROTOCOL, process.execPath, [path.resolve(process.argv[1])]);
    }
  } else {
    app.setAsDefaultProtocolClient(PROTOCOL);
  }
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", (event, commandLine) => {
    const url = commandLine.find((arg) => arg.startsWith(`${PROTOCOL}://`));

    if (url) {
      handleDeepLink(url);
    }

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

app.on("open-url", (event, url) => {
  event.preventDefault();
  console.log("Opened from URL (open-url):", url);

  const windows = BrowserWindow.getAllWindows();
  if (windows.length > 0) {
    handleDeepLink(url);
  } else {
    // Window not ready yet, store for later
    pendingDeepLink = url;
  }
});

function handleDeepLink(url: string) {
  console.log("Handling deep link:", url);

  try {
    const urlObj = new URL(url);
    const action = urlObj.hostname;
    const params = Object.fromEntries(urlObj.searchParams);

    console.log("Action:", action);
    console.log("Params:", params);

    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      windows[0].webContents.send("deep-link", { action, params, fullUrl: url });
    }
  } catch (error) {
    console.error("Error parsing deep link URL:", error);
  }
}

ipcMain.handle("dev:isDev", async (_event) => {
  return { isDev: !app.isPackaged };
});

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.setMenuBarVisibility(false);

  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  // if (!app.isPackaged) {
  mainWindow.webContents.openDevTools();
  // }

  // Handle pending deep link or command line args
  mainWindow.webContents.once("did-finish-load", () => {
    if (pendingDeepLink) {
      handleDeepLink(pendingDeepLink);
      pendingDeepLink = null;
    } else if (process.platform === "win32" || process.platform === "linux") {
      const url = process.argv.find((arg) => arg.startsWith(`${PROTOCOL}://`));
      if (url) {
        handleDeepLink(url);
      }
    }
  });
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

ipcMain.handle("get-all-processes", async () => {
  try {
    if (!nativeAddon) {
      throw new Error("Native addon not loaded");
    }
    const processes = nativeAddon.getProcesses();
    return { success: true, data: processes };
  } catch (error: any) {
    console.error("Error getting processes:", error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle("shutdown-app", () => {
  console.log("Shutting down application...");
  app.quit();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
