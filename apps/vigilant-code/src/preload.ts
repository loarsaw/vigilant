import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  isDev: () => ipcRenderer.invoke('dev:isDev'),
  getAllProcesses: () => ipcRenderer.invoke('get-all-processes'),
});

declare global {
  interface Window {
    api: {
      isDev: () => Promise<{ isDev: boolean }>;
      getAllProcesses: () => Promise<any>;
    };
  }
}
