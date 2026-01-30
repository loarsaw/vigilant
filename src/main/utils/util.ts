export interface ProcessInfo {
  pid: number;
  name: string;
  cmd: string;
  memory: number;
  category: string;
  confidence: number;
  username: string;
}

const ELECTRON_INDICATORS = [
  'electron',
  'electron-forge',
  'electron-builder',
  '@electron',
  'app.asar',
  'resources/app',
  'electron-forge-start',
  'electron.exe',
];

export function isElectronProcess(process: ProcessInfo): boolean {
  if (!process.cmd) return false;

  const cmd = process.cmd.toLowerCase();
  return ELECTRON_INDICATORS.some(indicator => cmd.includes(indicator));
}

export function findApps(processes: ProcessInfo[]): ProcessInfo[] {
  return processes.filter(isElectronProcess);
}
