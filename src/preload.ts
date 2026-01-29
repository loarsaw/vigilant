import { contextBridge, ipcRenderer } from "electron";

// Expose process API to renderer
contextBridge.exposeInMainWorld("processAPI", {
    getAllProcesses: () => ipcRenderer.invoke("get-all-processes"),
    getUserApps: () => ipcRenderer.invoke("get-user-apps"),
    getGuiApps: () => ipcRenderer.invoke("get-gui-apps"),
    searchProcess: (query: string) =>
        ipcRenderer.invoke("search-process", query),
});

declare global {
    interface Window {
        processAPI: {
            getAllProcesses: () => Promise<any>;
        };
    }
}
