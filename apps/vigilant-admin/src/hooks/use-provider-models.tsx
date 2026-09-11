import { useState, useCallback } from "react";

type ProviderKey = "openai" | "gemini" | "claude";

async function fetchModels(provider: ProviderKey, apiKey: string): Promise<string[]> {
  if (provider === "openai") {
    const res = await fetch("https://api.openai.com/v1/models", {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) throw new Error(res.status === 401 ? "Invalid API key" : `Request failed (${res.status})`);
    const data = await res.json();
    return data.data
      .map((m: { id: string }) => m.id)
      .filter((id: string) => id.startsWith("gpt-") || id.startsWith("o1") || id.startsWith("o3"))
      .sort();
  }

  if (provider === "gemini") {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!res.ok) throw new Error(res.status === 400 || res.status === 403 ? "Invalid API key" : `Request failed (${res.status})`);
    const data = await res.json();
    return data.models
      .filter((m: { supportedGenerationMethods?: string[] }) =>
        m.supportedGenerationMethods?.includes("generateContent")
      )
      .map((m: { name: string }) => m.name.replace(/^models\//, ""))
      .sort();
  }

  // claude
  const res = await fetch("https://api.anthropic.com/v1/models", {
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
  });
  if (!res.ok) throw new Error(res.status === 401 ? "Invalid API key" : `Request failed (${res.status})`);
  const data = await res.json();
  return data.data.map((m: { id: string }) => m.id);
}

export function useProviderModels(provider: ProviderKey) {
  const [models, setModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadModels = useCallback(
    async (apiKey: string) => {
      if (!apiKey) {
        setModels([]);
        setError(null);
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const list = await fetchModels(provider, apiKey);
        setModels(list);
        if (list.length === 0) setError("No models returned for this key");
      } catch (err) {
        setModels([]);
        setError(err instanceof Error ? err.message : "Failed to fetch models");
      } finally {
        setIsLoading(false);
      }
    },
    [provider]
  );

  return { models, isLoading, error, loadModels };
}