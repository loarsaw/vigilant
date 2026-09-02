// preload.ts
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

  setAuthToken: (token: string) => ipcRenderer.invoke("auth:setToken", token),
  getAuthToken: () => ipcRenderer.invoke("auth:getToken"),
  clearAuthToken: () => ipcRenderer.invoke("auth:clearToken"),
});

declare global {
  interface Window {
    api: {
      isDev: () => Promise<{ isDev: boolean }>;
      onDeepLink: (callback: (data: any) => void) => void;
      removeDeepLinkListener: () => void;
      getAllProcesses: () => Promise<any>;
      setAuthToken: (token: string) => Promise<void>;
      getAuthToken: () => Promise<string | null>;
      clearAuthToken: () => Promise<void>;
    };
  }
}