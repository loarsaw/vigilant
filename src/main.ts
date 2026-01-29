import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
declare const MAIN_WINDOW_VITE_DEV_SERVER_URL: string;
declare const MAIN_WINDOW_VITE_NAME: string;
import started from "electron-squirrel-startup";
// Handle creating/removing shortcuts on Windows when installing/uninstalling.

let nativeAddon: any;
try {
    nativeAddon = require(
        path.join(__dirname, "../../build/Release/process_monitor.node")
    );
    console.log(" Native addon loaded successfully");
} catch (error) {
    console.error(" Failed to load native addon:", error);
}

if (started) {
    app.quit();
}

const createWindow = () => {
    // Create the browser window.
    const mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
        },
    });

    // and load the index.html of the app.
    if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(
            path.join(
                __dirname,
                `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`
            )
        );
    }

    // Open the DevTools.
    mainWindow.webContents.openDevTools();
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

ipcMain.handle("get-user-apps", async () => {
    try {
        if (!nativeAddon) {
            throw new Error("Native addon not loaded");
        }
        const processes = nativeAddon.getProcesses();
        const userApps = processes.filter((p: any) => p.isUserApp);
        return { success: true, data: userApps };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("get-gui-apps", async () => {
    try {
        if (!nativeAddon) {
            throw new Error("Native addon not loaded");
        }
        const processes = nativeAddon.getProcesses();
        const guiApps = processes.filter((p: any) => p.isGuiApp);
        return { success: true, data: guiApps };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
});

ipcMain.handle("search-process", async (event, query: string) => {
    try {
        if (!nativeAddon) {
            throw new Error("Native addon not loaded");
        }
        const processes = nativeAddon.getProcesses();
        const results = processes.filter(
            (p: any) =>
                p.name.toLowerCase().includes(query.toLowerCase()) ||
                p.cmd.toLowerCase().includes(query.toLowerCase()) ||
                (p.username &&
                    p.username.toLowerCase().includes(query.toLowerCase()))
        );
        return { success: true, data: results };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
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

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
