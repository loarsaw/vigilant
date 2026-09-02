import { contextBridge, ipcRenderer, shell } from "electron";

contextBridge.exposeInMainWorld("api", {
  isDev: () => ipcRenderer.invoke("dev:isDev"),
  openExternal: (url: string) => ipcRenderer.send("open-external-link", url),
});

declare global {
  interface Window {
    api: {
      isDev: () => Promise<{ isDev: boolean }>;
      openExternal: (url: string) => void;
    };
  }
}
