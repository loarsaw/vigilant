import { type ClassValue, clsx } from "clsx";
import { Chrome, Code2 } from "lucide-react";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

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
  const cmd = p.cmd?.toLowerCase() || "";
  const name = p.name?.toLowerCase() || "";
  const path = (p.path || "").toLowerCase();

  return (
    cmd.includes("electron") ||
    name === "electron" ||
    path.includes("electron") ||
    cmd.includes("--type=renderer") ||
    cmd.includes("--type=gpu-process") ||
    cmd.includes("--type=utility") ||
    cmd.includes("--type=zygote") ||
    p.category === "app_framework" ||
    p.category === "electron_app"
  );
}

export function getProcessMetadata(p: Process) {
  const cmd = p.cmd?.toLowerCase() || "";
  const name = p.name?.toLowerCase() || "";
  const isElectron = isElectronProcess(p);

  if (p.category === "editor" || cmd.includes("code") || cmd.includes("vscode")) {
    return {
      name: "VS Code",

      isUnknown: false,
      isElectron: true,
    };
  }

  if (
    cmd.includes("chrome") ||
    cmd.includes("chromium") ||
    cmd.includes("firefox") ||
    cmd.includes("msedge")
  ) {
    return {
      name: "Web Browser",

      isUnknown: false,
      isElectron: false,
    };
  }

  const isWinShell =
    cmd.includes("explorer.exe") ||
    cmd.includes("searchapp.exe") ||
    cmd.includes("shellexperiencehost.exe") ||
    cmd.includes("startmenuexperiencehost.exe") ||
    cmd.includes("taskmgr.exe");

  if (isWinShell) {
    let displayName = "Windows Shell";
    if (cmd.includes("explorer")) displayName = "File Explorer";
    if (cmd.includes("search")) displayName = "Windows Search";

    return {
      name: displayName,

      isUnknown: false,
      isElectron: false,
    };
  }

  if (cmd.includes("discord")) {
    return {
      name: "Discord",

      isUnknown: false,
      isElectron: true,
    };
  }
  if (cmd.includes("telegram")) {
    return {
      name: "Telegram",

      isUnknown: false,
      isElectron: false,
    };
  }

  if (cmd.includes("slack")) {
    return {
      name: "Slack",

      isUnknown: false,
      isElectron: true,
    };
  }

  if (
    cmd.includes("gnome-terminal") ||
    cmd.includes("bash") ||
    cmd.includes("zsh") ||
    cmd.includes("powershell.exe") ||
    cmd.includes("cmd.exe")
  ) {
    return {
      name: "Terminal",

      isUnknown: false,
      isElectron: false,
    };
  }

  if (
    cmd.includes("npm") ||
    cmd.includes("yarn") ||
    cmd.includes("pnpm") ||
    (cmd.includes("node ") && !cmd.includes("vscode"))
  ) {
    return {
      name: "Node.js / NPM",

      isUnknown: false,
      isElectron: false,
    };
  }

  if (cmd.includes("nautilus")) {
    return {
      name: "File Explorer",

      isUnknown: false,
      isElectron: false,
    };
  }

  if (cmd.includes("gnome-shell") || cmd.includes("gnome-text-editor")) {
    return {
      name: cmd.includes("shell") ? "Gnome Shell" : "Text Editor",

      isUnknown: false,
      isElectron: false,
    };
  }

  if (p.category && !["unknown", "cli_tool"].includes(p.category)) {
    const rawName = p.name?.trim() || p.cmd?.split(" ")[0].split("/").pop() || "App";
    const cleanName = rawName.replace(/\.exe/gi, "");

    return {
      name: cleanName,

      isUnknown: false,
      isElectron: isElectron,
    };
  }

  const rawName = p.name?.trim() || p.cmd?.split(" ")[0].split("/").pop() || "Unknown App";
  const cleanName = rawName.replace(/\.exe/gi, "");

  return {
    name: cleanName,

    isUnknown: true,
    isElectron: isElectron,
  };
}
