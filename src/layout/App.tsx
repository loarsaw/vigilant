import React, { useEffect, useState } from "react";
import { Code2, AppWindow, MessageSquare, AlertTriangle, Chrome, Send, Terminal, Box } from "lucide-react";

export interface Process {
    pid: number;
    name: string;
    cmd: string;
    memory: number;
    category: string;
    confidence?: number;
    username: string;
    isGuiApp?: boolean;
}

function getProcessMetadata(p: Process) {
    const cmd = p.cmd?.toLowerCase() || "";
    
    if (p.category === "editor" || cmd.includes("/code") || cmd.includes("vscode")) {
        return { name: "VS Code", icon: <Code2 size={16} className="text-blue-400" />, isUnknown: false };
    }

    if (cmd.includes("gnome-text-editor")) {
        return { name: "Text Editor", icon: <Code2 size={16} className="text-emerald-400" />, isUnknown: false };
    }

    if (cmd.includes("chrome") || cmd.includes("chromium") || cmd.includes("firefox")) {
        return { name: "Web Browser", icon: <Chrome size={16} className="text-amber-500" />, isUnknown: false };
    }

    if (cmd.includes("discord")) {
        return { name: "Discord", icon: <MessageSquare size={16} className="text-indigo-400" />, isUnknown: false };
    }
    if (cmd.includes("telegram")) {
        return { name: "Telegram", icon: <Send size={16} className="text-sky-400" />, isUnknown: false };
    }

    if (cmd.includes("npm") || cmd.includes("yarn") || cmd.includes("pnpm") || (cmd.includes("node ") && !cmd.includes("vscode"))) {
        return { name: "Node.js / NPM", icon: <Box size={16} className="text-yellow-500" />, isUnknown: false };
    }

    if (cmd.includes("gnome-shell")) {
        return { name: "Gnome Shell", icon: <AppWindow size={16} className="text-purple-400" />, isUnknown: false };
    }
    if (cmd.includes("gnome-terminal") || cmd.includes("bash") || cmd.includes("zsh")) {
        return { name: "Terminal", icon: <Terminal size={16} className="text-emerald-400" />, isUnknown: false };
    }

    const fallbackName = p.name?.trim() || p.cmd?.split(' ')[0].split('/').pop() || "Unknown App";
    return { 
        name: fallbackName, 
        icon: <AlertTriangle size={16} className="text-red-500" />, 
        isUnknown: true 
    };
}

export default function ProcessWidget() {
    const [processes, setProcesses] = useState<(Process & { isUnknown: boolean })[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProcesses() {
            try {
                const { data: guiApps } = await window.processAPI.getGuiAppsOnly();
                const { data: allApps } = await window.processAPI.getAllProcesses();
                
                const combinedRaw: Process[] = [...guiApps, ...allApps];
                const uniqueProcesses = new Map<string, Process & { isUnknown: boolean }>();

                combinedRaw
                    .filter(p => p.cmd?.trim())
                    .filter(p => !p.cmd.toLowerCase().includes("vigilant"))
                    .forEach(p => {
                        const metadata = getProcessMetadata(p);
                        const cmd = p.cmd.toLowerCase();

                        const isBlacklisted = 
                            cmd.includes("update-notifier") || 
                            cmd.includes("evolution-") || 
                            cmd.includes("snapd-desktop-integration") || 
                            cmd.includes("xwayland") ||
                            cmd.includes("/usr/libexec/");

                        const shouldShow = !metadata.isUnknown || (p.isGuiApp && !isBlacklisted);

                        if (shouldShow) {
                            const displayName = metadata.name;
                            if (uniqueProcesses.has(displayName)) {
                                const existing = uniqueProcesses.get(displayName)!;
                                existing.memory += p.memory;
                            } else {
                                uniqueProcesses.set(displayName, { 
                                    ...p, 
                                    name: displayName, 
                                    isUnknown: metadata.isUnknown 
                                });
                            }
                        }
                    });

                const sorted = Array.from(uniqueProcesses.values()).sort((a, b) => {
                    if (a.isUnknown !== b.isUnknown) return a.isUnknown ? 1 : -1;
                    return a.name.localeCompare(b.name);
                });

                setProcesses(sorted);
            } catch (error) {
                console.error("Failed to fetch processes:", error);
            } finally {
                setLoading(false);
            }
        }

        loadProcesses();
        const interval = setInterval(loadProcesses, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="max-w-md mx-auto bg-slate-900 text-white rounded-xl shadow-2xl border border-slate-700 overflow-hidden font-sans">
            <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
                <div className="flex flex-col">
                    <h2 className="font-bold tracking-tight text-slate-100">Live Monitor</h2>
                    <span className="text-[10px] text-slate-500 font-bold uppercase">{processes.length} Processes</span>
                </div>
                <div className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </div>
            </div>

            <div className="max-h-[500px] overflow-y-auto bg-slate-950/20 custom-scrollbar">
                {processes.length > 0 ? (
                    processes.map(p => {
                        const { icon } = getProcessMetadata(p);
                        const isHighMemUnknown = p.isUnknown && p.memory > 500;

                        return (
                            <div
                                key={p.name}
                                className={`group p-3 border-b border-slate-800/50 transition-all flex justify-between items-center
                                    ${p.isUnknown ? 'bg-red-500/5' : 'hover:bg-slate-800/40'}
                                    ${isHighMemUnknown ? 'bg-red-900/30 border-l-4 border-l-red-500' : ''}`}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className={`p-2 rounded-lg transition-transform group-hover:scale-110 
                                        ${p.isUnknown ? 'bg-red-500/20' : 'bg-slate-800'}`}>
                                        {icon}
                                    </div>
                                    <div className="flex flex-col overflow-hidden">
                                        <span className={`text-sm font-semibold truncate 
                                            ${isHighMemUnknown ? 'text-red-300 animate-pulse' : p.isUnknown ? 'text-red-400' : 'text-slate-100'}`}>
                                            {p.name}
                                        </span>
                                        <span className="text-[10px] text-slate-500 font-mono">PID: {p.pid}</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end min-w-[90px]">
                                    <span className={`text-xs font-mono font-bold 
                                        ${isHighMemUnknown ? 'text-red-400' : p.isUnknown ? 'text-red-300' : 'text-emerald-400'}`}>
                                        {p.memory > 1024 
                                            ? `${(p.memory / 1024).toFixed(1)} GB` 
                                            : `${Math.round(p.memory)} MB`}
                                    </span>
                                    {p.isUnknown && (
                                        <span className={`text-[8px] px-1.5 py-0.5 rounded mt-1 font-black uppercase tracking-wider
                                            ${isHighMemUnknown ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-red-900/40 text-red-400'}`}>
                                            {isHighMemUnknown ? 'Critical Unknown' : 'Unknown'}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })
                ) : (
                    <div className="p-10 text-center text-slate-500 italic text-sm">
                        {loading ? "Scanning hardware..." : "System idle"}
                    </div>
                )}
            </div>
        </div>
    );
}