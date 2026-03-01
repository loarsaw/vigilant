import { useState, useEffect } from 'react';
import { TEMPLATE_MANIFEST } from '@/data/template-manifest';
import { SandpackTemplateType } from '@/types/types';

export interface LoadedTemplate {
  files: Record<string, string>;
  template: SandpackTemplateType;
}

interface UseTemplateLoaderResult {
  data: LoadedTemplate | null;
  loading: boolean;
  error: string | null;
}

const cache = new Map<string, LoadedTemplate>();

export function useTemplateLoader(frameworkId: string): UseTemplateLoaderResult {
  const [data, setData] = useState<LoadedTemplate | null>(
    () => cache.get(frameworkId) ?? null
  );
  const [loading, setLoading] = useState(!cache.has(frameworkId));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!frameworkId) return;

    if (cache.has(frameworkId)) {
      setData(cache.get(frameworkId)!);
      setLoading(false);
      return;
    }

    const manifest = TEMPLATE_MANIFEST[frameworkId];
    if (!manifest) {
      setError(`No template manifest entry for "${frameworkId}"`);
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const entries = await Promise.all(
          manifest.files.map(async ({ rawUrl, sandpackPath }) => {
            const res = await fetch(rawUrl);
            if (!res.ok) throw new Error(`Failed to fetch ${rawUrl}: ${res.status}`);
            const content = await res.text(); // raw GitHub returns plain text
            return [sandpackPath, content] as [string, string];
          })
        );

        const result: LoadedTemplate = {
          template: manifest.template,
          files: Object.fromEntries(entries),
        };

        cache.set(frameworkId, result);

        if (!cancelled) {
          setData(result);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Failed to load template');
          setLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [frameworkId]);

  return { data, loading, error };
}