import {
  Code2,
  AppWindow,
  MessageSquare,
  AlertTriangle,
  Chrome,
  Send,
  Terminal,
  Box,
  X,
  Zap,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';

export interface Process {
  pid: number;
  name: string;
  cmd: string;
  memory: number;
  category: string;
  confidence?: number;
  username: string;
  isGuiApp?: boolean;
  path?: string;
}

function isElectronProcess(p: Process): boolean {
  const cmd = p.cmd?.toLowerCase() || '';
  const name = p.name?.toLowerCase() || '';
  const path = (p.path || '').toLowerCase();

  return (
    cmd.includes('electron') ||
    name === 'electron' ||
    path.includes('electron') ||
    cmd.includes('--type=renderer') ||
    cmd.includes('--type=gpu-process') ||
    cmd.includes('--type=utility') ||
    cmd.includes('--type=zygote') ||
    p.category === 'app_framework' ||
    p.category === 'electron_app'
  );
}

function getProcessMetadata(p: Process) {
  const cmd = p.cmd?.toLowerCase() || '';
  const name = p.name?.toLowerCase() || '';
  const isElectron = isElectronProcess(p);

  if (
    p.category === 'editor' ||
    cmd.includes('code') ||
    cmd.includes('vscode')
  ) {
    return {
      name: 'VS Code',
      icon: <Code2 size={16} className="text-blue-400" />,
      isUnknown: false,
      isElectron: true,
    };
  }

  if (
    cmd.includes('chrome') ||
    cmd.includes('chromium') ||
    cmd.includes('firefox') ||
    cmd.includes('msedge')
  ) {
    return {
      name: 'Web Browser',
      icon: <Chrome size={16} className="text-amber-500" />,
      isUnknown: false,
      isElectron: false,
    };
  }

  const isWinShell =
    cmd.includes('explorer.exe') ||
    cmd.includes('searchapp.exe') ||
    cmd.includes('shellexperiencehost.exe') ||
    cmd.includes('startmenuexperiencehost.exe') ||
    cmd.includes('taskmgr.exe');

  if (isWinShell) {
    let displayName = 'Windows Shell';
    if (cmd.includes('explorer')) displayName = 'File Explorer';
    if (cmd.includes('search')) displayName = 'Windows Search';

    return {
      name: displayName,
      icon: <AppWindow size={16} className="text-blue-300" />,
      isUnknown: false,
      isElectron: false,
    };
  }

  if (cmd.includes('discord')) {
    return {
      name: 'Discord',
      icon: <MessageSquare size={16} className="text-indigo-400" />,
      isUnknown: false,
      isElectron: true,
    };
  }
  if (cmd.includes('telegram')) {
    return {
      name: 'Telegram',
      icon: <Send size={16} className="text-sky-400" />,
      isUnknown: false,
      isElectron: false,
    };
  }

  if (cmd.includes('slack')) {
    return {
      name: 'Slack',
      icon: <MessageSquare size={16} className="text-purple-400" />,
      isUnknown: false,
      isElectron: true,
    };
  }

  if (
    cmd.includes('gnome-terminal') ||
    cmd.includes('bash') ||
    cmd.includes('zsh') ||
    cmd.includes('powershell.exe') ||
    cmd.includes('cmd.exe')
  ) {
    return {
      name: 'Terminal',
      icon: <Terminal size={16} className="text-emerald-400" />,
      isUnknown: false,
      isElectron: false,
    };
  }

  if (
    cmd.includes('npm') ||
    cmd.includes('yarn') ||
    cmd.includes('pnpm') ||
    (cmd.includes('node ') && !cmd.includes('vscode'))
  ) {
    return {
      name: 'Node.js / NPM',
      icon: <Box size={16} className="text-yellow-500" />,
      isUnknown: false,
      isElectron: false,
    };
  }

  if (cmd.includes('nautilus')) {
    return {
      name: 'File Explorer',
      icon: <AppWindow size={16} className="text-blue-300" />,
      isUnknown: false,
      isElectron: false,
    };
  }

  if (cmd.includes('gnome-shell') || cmd.includes('gnome-text-editor')) {
    return {
      name: cmd.includes('shell') ? 'Gnome Shell' : 'Text Editor',
      icon: <AppWindow size={16} className="text-purple-400" />,
      isUnknown: false,
      isElectron: false,
    };
  }

  if (p.category && !['unknown', 'cli_tool'].includes(p.category)) {
    const rawName =
      p.name?.trim() || p.cmd?.split(' ')[0].split('/').pop() || 'App';
    const cleanName = rawName.replace(/\.exe/gi, '');

    return {
      name: cleanName,
      icon: isElectron ? (
        <Zap size={16} className="text-indigo-400" />
      ) : (
        <AppWindow size={16} className="text-blue-400" />
      ),
      isUnknown: false,
      isElectron: isElectron,
    };
  }

  const rawName =
    p.name?.trim() || p.cmd?.split(' ')[0].split('/').pop() || 'Unknown App';
  const cleanName = rawName.replace(/\.exe/gi, '');

  return {
    name: cleanName,
    icon: isElectron ? (
      <Zap size={16} className="text-red-500" />
    ) : (
      <AlertTriangle
        size={16}
        className={p.memory > 500 ? 'text-red-500' : 'text-yellow-500'}
      />
    ),
    isUnknown: true,
    isElectron: isElectron,
  };
}

export default function ProcessWidget() {
  const [processes, setProcesses] = useState<
    (Process & { isUnknown: boolean; isElectron: boolean })[]
  >([]);
  const [loading, setLoading] = useState(true);
  console.log(processes, 'proccs');
  useEffect(() => {
    async function loadProcesses() {
      try {
        const { data: allApps } = await window.processAPI.getAllProcesses();

        const combinedRaw: Process[] = [...allApps];
        const uniqueProcesses = new Map<
          string,
          Process & { isUnknown: boolean; isElectron: boolean }
        >();

        combinedRaw
          .filter(p => p.cmd?.trim())
          .filter(p => !p.cmd.toLowerCase().includes('vigilant'))
          .forEach(p => {
            const metadata = getProcessMetadata(p);
            const cmd = p.cmd.toLowerCase();

            const isBlacklisted =
              cmd.includes('update-notifier') ||
              cmd.includes('evolution-') ||
              cmd.includes('snapd-desktop-integration') ||
              cmd.includes('xwayland') ||
              cmd.includes('/usr/libexec/');

            const shouldShow =
              !metadata.isUnknown || (p.isGuiApp && !isBlacklisted);

            if (shouldShow) {
              const displayName = metadata.name;
              if (uniqueProcesses.has(displayName)) {
                const existing = uniqueProcesses.get(displayName)!;
                existing.memory += p.memory;
              } else {
                uniqueProcesses.set(displayName, {
                  ...p,
                  name: displayName,
                  isUnknown: metadata.isUnknown,
                  isElectron: metadata.isElectron,
                });
              }
            }
          });

        const sorted = Array.from(uniqueProcesses.values()).sort((a, b) => {
          if (a.isUnknown && a.isElectron && !(b.isUnknown && b.isElectron))
            return -1;
          if (!(a.isUnknown && a.isElectron) && b.isUnknown && b.isElectron)
            return 1;
          if (a.isUnknown !== b.isUnknown) return a.isUnknown ? -1 : 1;
          return a.name.localeCompare(b.name);
        });

        setProcesses(sorted);
      } catch (error) {
        console.error('Failed to fetch processes:', error);
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
          <h2 className="font-bold tracking-tight text-slate-100">
            Live Monitor
          </h2>
          <span className="text-[10px] text-slate-500 font-bold uppercase">
            {processes.length} Processes
          </span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase hidden sm:inline">
              Live
            </span>
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </div>
          </div>

          <button
            onClick={() => {
              window.processAPI.shutdown();
            }}
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            title="Close Monitor"
          >
            <X size={18} />
          </button>
        </div>
      </div>
      <div className="max-h-[500px] overflow-y-auto bg-slate-950/20 custom-scrollbar">
        {processes.length > 0 ? (
          processes.map(p => {
            const { icon } = getProcessMetadata(p);
            const isUnknownElectron = p.isUnknown && p.isElectron;
            const isHighMemUnknown =
              p.isUnknown && !p.isElectron && p.memory > 500;
            const isLowMemUnknown =
              p.isUnknown && !p.isElectron && p.memory <= 500;

            return (
              <div
                key={p.name}
                className={`group p-3 border-b border-slate-800/50 transition-all flex justify-between items-center
                  ${isUnknownElectron ? 'bg-red-500/10' : p.isUnknown ? (isHighMemUnknown ? 'bg-red-500/5' : 'bg-yellow-500/5') : 'hover:bg-slate-800/40'}
                  ${isUnknownElectron ? 'border-l-4 border-l-red-600' : isHighMemUnknown ? 'border-l-4 border-l-red-500' : isLowMemUnknown ? 'border-l-4 border-l-yellow-500' : ''}`}
              >
                <div className="flex items-center gap-3 overflow-hidden">
                  <div
                    className={`p-2 rounded-lg transition-transform group-hover:scale-110
                      ${isUnknownElectron ? 'bg-red-600/30' : p.isUnknown ? (isHighMemUnknown ? 'bg-red-500/20' : 'bg-yellow-500/20') : 'bg-slate-800'}`}
                  >
                    {icon}
                  </div>
                  <div className="flex flex-col overflow-hidden">
                    <span
                      className={`text-sm font-semibold truncate
                        ${isUnknownElectron ? 'text-red-400' : isHighMemUnknown ? 'text-red-300' : isLowMemUnknown ? 'text-yellow-300' : p.isUnknown ? 'text-yellow-400' : 'text-slate-100'}`}
                    >
                      {p.name}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      PID: {p.pid}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end min-w-[90px]">
                  <span
                    className={`text-xs font-mono font-bold
                      ${isUnknownElectron ? 'text-red-400' : isHighMemUnknown ? 'text-red-400' : isLowMemUnknown ? 'text-yellow-400' : p.isUnknown ? 'text-yellow-300' : 'text-emerald-400'}`}
                  >
                    {p.memory > 1024
                      ? `${(p.memory / 1024).toFixed(1)} GB`
                      : `${Math.round(p.memory)} MB`}
                  </span>
                  {p.isUnknown && (
                    <span
                      className={`text-[8px] px-1.5 py-0.5 rounded mt-1 font-black uppercase tracking-wider
                        ${isUnknownElectron ? 'bg-red-600 text-white ring-2 ring-red-500' : isHighMemUnknown ? 'bg-red-600 text-white ring-2 ring-red-400' : 'bg-yellow-600 text-white'}`}
                    >
                      {isUnknownElectron
                        ? '⚡ Unknown Electron'
                        : isHighMemUnknown
                          ? 'Critical Unknown'
                          : 'Unknown'}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-10 text-center text-slate-500 italic text-sm">
            {loading ? 'Scanning hardware...' : 'System idle'}
          </div>
        )}
      </div>
    </div>
  );
}
