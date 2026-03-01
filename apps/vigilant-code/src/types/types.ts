export type FrameworkId = 'react' | 'vue' | 'vanilla' | 'svelte' | 'nextjs' | 'github';

export type SandpackTemplateType = 'react' | 'vue' | 'vanilla' | 'svelte' | 'nextjs';

export type PanelId = 'preview' | 'code' | 'console' | 'files';

export interface Panel {
  id: PanelId;
  label: string;
  icon: string;
}

export interface FrameworkConfig {
  label: string;
  icon: string;
  color: string;
  glow: string;
  border: string;
  tag: string;
  version: string;
  description: string;
  features: string[];
  template: SandpackTemplateType;
  files?: Record<string, string>;
}

export type FrameworkMap = Record<string, FrameworkConfig>;

export interface ActiveFramework {
  id: FrameworkId | string;
  defaultPanel: PanelId;
  files: Record<string, string> | null;
  template: SandpackTemplateType | null;
  fw?: FrameworkConfig;
}

export type AppView = 'browse' | 'sandbox';
