import { contextBridge, ipcRenderer } from 'electron';

// Expose process API to renderer
contextBridge.exposeInMainWorld('processAPI', {
  getAllProcesses: () => ipcRenderer.invoke('get-all-processes'),
  getGuiAppsOnly: () => ipcRenderer.invoke('get-gui-apps-only'),
  shutdown: () => ipcRenderer.invoke('shutdown-app'),
});

declare global {
  interface Window {
    processAPI: {
      getGuiAppsOnly: () => Promise<any>;
      getAllProcesses: () => Promise<any>;
      shutdown: () => void;
    };
  }
}
