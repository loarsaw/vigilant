import { app, BrowserWindow, ipcMain, safeStorage, session, desktopCapturer } from "electron";
import path from "path";
import Store from "electron-store";
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
import started from "electron-squirrel-startup";

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

process.on("unhandledRejection", (reason) => {
  console.error("[main] Unhandled promise rejection:", reason);
});

app.commandLine.appendSwitch('ignore-certificate-errors');
let nativeAddon: any;
try {
  nativeAddon = require(path.join(__dirname, "../../build/Release/process_monitor.node"));
} catch (error) {
  console.error("❌ Failed to load native addon:", error);
}

const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
  app.quit();
} else {
  app.on("second-instance", () => {
    const windows = BrowserWindow.getAllWindows();
    if (windows.length > 0) {
      const mainWindow = windows[0];
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const store = new Store();

ipcMain.handle("auth:setToken", (_event, token: string) => {
  const encrypted = safeStorage.encryptString(token);
  store.set("authToken", encrypted.toString("base64"));
});

ipcMain.handle("auth:getToken", () => {
  const stored = store.get("authToken") as string | undefined;
  if (!stored) return null;
  return safeStorage.decryptString(Buffer.from(stored, "base64"));
});

ipcMain.handle("auth:clearToken", () => {
  store.delete("authToken");
});

ipcMain.handle("dev:isDev", async (_event) => {
  return { isDev: !app.isPackaged };
});

function setupDisplayMediaHandler() {
  session.defaultSession.setDisplayMediaRequestHandler(
    (_request, callback) => {
      desktopCapturer
        .getSources({ types: ["screen"] })
        .then((sources) => {
          if (!sources.length) {
            callback({});
            return;
          }
          callback({ video: sources[0], audio: "loopback" });
        })
        .catch((err) => {
          console.error("[main] desktopCapturer failed:", err);
          callback({});
        });
    },
    { useSystemPicker: false },
  );
}

const createWindow = () => {
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
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
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", () => {
  setupDisplayMediaHandler();
  createWindow();
});

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