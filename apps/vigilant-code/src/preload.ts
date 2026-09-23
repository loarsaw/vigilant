// preload.ts
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  isDev: () => ipcRenderer.invoke("dev:isDev"),
  getAllProcesses: () => ipcRenderer.invoke("get-all-processes"),
  setAuthToken: (token: string) => ipcRenderer.invoke("auth:setToken", token),
  getAuthToken: () => ipcRenderer.invoke("auth:getToken"),
  clearAuthToken: () => ipcRenderer.invoke("auth:clearToken"),
});

declare global {
  interface Window {
    api: {
      isDev: () => Promise<{ isDev: boolean }>;
      getAllProcesses: () => Promise<any>;
      setAuthToken: (token: string) => Promise<void>;
      getAuthToken: () => Promise<string | null>;
      clearAuthToken: () => Promise<void>;
    };
  }
}