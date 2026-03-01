import { SandpackTemplateType } from '@/types/types';

export interface TemplateFileEntry {
  rawUrl: string;
  sandpackPath: string;
}

export interface TemplateManifestEntry {
  template: SandpackTemplateType;
  files: TemplateFileEntry[];
}

const GITHUB_USER = 'loarsaw';
const GITHUB_REPO = 'vigilant';
const GITHUB_BRANCH = 'master';

const raw = (path: string) =>
  `https://raw.githubusercontent.com/${GITHUB_USER}/${GITHUB_REPO}/${GITHUB_BRANCH}/${path}`;

export const TEMPLATE_MANIFEST: Record<string, TemplateManifestEntry> = {
  react: {
    template: 'react',
    files: [{ rawUrl: raw('templates/react/App.js'), sandpackPath: '/App.js' }],
  },
  vue: {
    template: 'vue',
    files: [
      { rawUrl: raw('templates/vue/App.vue'), sandpackPath: '/src/App.vue' },
    ],
  },
  vanilla: {
    template: 'vanilla',
    files: [
      {
        rawUrl: raw('templates/vanilla/index.html'),
        sandpackPath: '/index.html',
      },
      { rawUrl: raw('templates/vanilla/index.js'), sandpackPath: '/index.js' },
    ],
  },
  svelte: {
    template: 'svelte',
    files: [
      {
        rawUrl: raw('templates/svelte/App.svelte'),
        sandpackPath: '/App.svelte',
      },
    ],
  },
};
