import { ipcMain } from "electron";
export function vigilant() {
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
}
