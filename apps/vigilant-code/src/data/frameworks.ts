import { FrameworkMap } from '@/types/types';

export const FRAMEWORKS: FrameworkMap = {
  react: {
    label: 'React',
    icon: '⚛️',
    color: '#61DAFB',
    glow: 'rgba(97,218,251,0.15)',
    border: 'rgba(97,218,251,0.25)',
    tag: 'UI Library',
    version: '18.x',
    description:
      'Build encapsulated components that manage their own state, then compose them to make complex UIs.',
    features: ['Hooks & State', 'JSX Syntax', 'Component Model', 'Virtual DOM'],
    template: 'react',
  },
  vue: {
    label: 'Vue',
    icon: '💚',
    color: '#42B883',
    glow: 'rgba(66,184,131,0.15)',
    border: 'rgba(66,184,131,0.25)',
    tag: 'Framework',
    version: '3.x',
    description:
      'An approachable, performant and versatile framework for building web user interfaces.',
    features: [
      'Composition API',
      'Reactive Data',
      'Single File Components',
      'Directives',
    ],
    template: 'vue',
  },
  vanilla: {
    label: 'Vanilla JS',
    icon: '🟨',
    color: '#F7DF1E',
    glow: 'rgba(247,223,30,0.12)',
    border: 'rgba(247,223,30,0.25)',
    tag: 'No Framework',
    version: 'ES2024',
    description:
      'Raw JavaScript power — no dependencies, no build step overhead. Just the web platform.',
    features: [
      'Zero Dependencies',
      'Native DOM API',
      'ES Modules',
      'Fastest Load',
    ],
    template: 'vanilla',
  },
  svelte: {
    label: 'Svelte',
    icon: '🔥',
    color: '#FF3E00',
    glow: 'rgba(255,62,0,0.15)',
    border: 'rgba(255,62,0,0.25)',
    tag: 'Compiler',
    version: '4.x',
    description:
      'Svelte shifts the work to compile time, producing vanilla JS with no runtime overhead.',
    features: [
      'No Virtual DOM',
      'Compiled Output',
      'Reactive Declarations',
      'Tiny Bundle',
    ],
    template: 'svelte',
  }
  
};

export const PANELS = [
  { id: 'preview' as const, label: 'Preview', icon: '🖥' },
  { id: 'code' as const, label: 'Code', icon: '📝' },
  { id: 'console' as const, label: 'Console', icon: '🖨' },
  { id: 'files' as const, label: 'Files', icon: '📁' },
];
