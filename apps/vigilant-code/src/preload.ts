import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  isDev: () => ipcRenderer.invoke("dev:isDev"),
  onDeepLink: (callback: (data: any) => void) => {
    ipcRenderer.on("deep-link", (_event, data) => callback(data));
  },
  removeDeepLinkListener: () => {
    ipcRenderer.removeAllListeners("deep-link");
  },
  getAllProcesses: () => ipcRenderer.invoke("get-all-processes"),
});

declare global {
  interface Window {
    api: {
      isDev: () => Promise<{ isDev: boolean }>;
      onDeepLink: (callback: (data: any) => void) => void;
      removeDeepLinkListener: () => void;
      getAllProcesses: () => Promise<any>;
    };
  }
}