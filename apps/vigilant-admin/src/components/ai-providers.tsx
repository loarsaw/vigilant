import { useState, useEffect } from "react";
import {
  Bot,
  Eye,
  EyeOff,
  AlertCircle,
  Edit3,
  Save,
  Loader2,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAIProvider } from "@/hooks/use-ai-provider";
import { useProviderModels } from "@/hooks/use-provider-models";
import { AIProviderConfigForm } from "@/hooks/types";

type ProviderKey = "openai" | "gemini" | "claude";

const PROVIDERS: { key: ProviderKey; label: string; defaultModel: string; placeholder: string }[] =
  [
    { key: "openai", label: "OpenAI", defaultModel: "gpt-4o", placeholder: "sk-xxxxxxxxxxxxxxxx" },
    {
      key: "gemini",
      label: "Gemini",
      defaultModel: "gemini-1.5-pro",
      placeholder: "AIzaxxxxxxxxxxxxxxxx",
    },
    {
      key: "claude",
      label: "Claude",
      defaultModel: "claude-sonnet-4-6",
      placeholder: "sk-ant-xxxxxxxxxxxxxxxx",
    },
  ];

const MODEL_FETCH_DEBOUNCE_MS = 600;

function ProviderPanel({ providerKey }: { providerKey: ProviderKey }) {
  const meta = PROVIDERS.find((p) => p.key === providerKey)!;

  const {
    providerConfig: fetchedConfig,
    isProviderConfigured,
    isLoadingProvider,
    saveProviderConfig,
    isSavingProvider,
    saveProviderError,
    saveProviderSuccess,
  } = useAIProvider(providerKey);

  const {
    models,
    isLoading: isLoadingModels,
    error: modelsError,
    loadModels,
  } = useProviderModels(providerKey);

  const [isEditingLocal, setIsEditingLocal] = useState(true);
  const [form, setForm] = useState<AIProviderConfigForm>({
    apiKey: "",
    model: meta.defaultModel,
  });
  const [showSecret, setShowSecret] = useState(false);

  const isEditing = isEditingLocal || !isProviderConfigured;

  useEffect(() => {
    setIsEditingLocal(!fetchedConfig);
  }, [fetchedConfig, providerKey]);

  useEffect(() => {
    if (saveProviderSuccess) {
      setIsEditingLocal(false);
    }
  }, [saveProviderSuccess]);

  useEffect(() => {
    if (!isEditing) return;

    setForm((prev) => (prev.model ? { ...prev, model: "" } : prev));

    if (!form.apiKey) {
      loadModels("");
      return;
    }

    const timeout = setTimeout(() => {
      loadModels(form.apiKey);
    }, MODEL_FETCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [form.apiKey, isEditing]);

  const handleChange = (field: keyof AIProviderConfigForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveProviderConfig({
      provider: providerKey,
      api_key: form.apiKey,
      model: form.model,
    });
  };

  if (isLoadingProvider) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Loading {meta.label} configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-muted-foreground">
          {isProviderConfigured && !isEditingLocal
            ? "Configured • Click Edit to modify"
            : `Add your ${meta.label} API credentials`}
        </p>
        {isProviderConfigured && (
          <button
            onClick={() => setIsEditingLocal((p) => !p)}
            className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2 shrink-0 font-display font-semibold tracking-wide"
          >
            <Edit3 className="h-4 w-4" />
            {isEditingLocal ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      {isEditing ? (
        <>
          <div>
            <Label
              htmlFor={`${providerKey}-api-key`}
              className="text-sm font-medium text-foreground"
            >
              API Key
            </Label>
            <div className="relative mt-2">
              <Input
                id={`${providerKey}-api-key`}
                type={showSecret ? "text" : "password"}
                placeholder={meta.placeholder}
                value={form.apiKey}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                className="w-full bg-input border border-border text-foreground placeholder:text-muted-foreground/60 text-sm pr-10 py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecret((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {isProviderConfigured && (
              <p className="mt-1.5 text-xs text-muted-foreground/70">
                Re-enter your key to load available models and change the config.
              </p>
            )}
          </div>

          <div>
            <Label htmlFor={`${providerKey}-model`} className="text-sm font-medium text-foreground">
              Default Model
            </Label>

            {!form.apiKey ? (
              <div className="w-full mt-2 px-3.5 py-2.5 bg-input/30 border border-dashed border-border rounded-md text-muted-foreground text-sm">
                Enter an API key to load available models
              </div>
            ) : isLoadingModels ? (
              <div className="w-full mt-2 flex items-center gap-2 px-3.5 py-2.5 bg-input border border-border rounded-md text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading models...
              </div>
            ) : modelsError ? (
              <div className="mt-2 flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {modelsError}
              </div>
            ) : models.length > 0 ? (
              <Select value={form.model} onValueChange={(value) => handleChange("model", value)}>
                <SelectTrigger
                  id={`${providerKey}-model`}
                  className="w-full mt-2 bg-input border border-border text-foreground text-sm py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
                >
                  <SelectValue placeholder="Select a model" />
                </SelectTrigger>
                <SelectContent>
                  {models.map((modelId) => (
                    <SelectItem key={modelId} value={modelId}>
                      {modelId}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="w-full mt-2 px-3.5 py-2.5 bg-input/30 border border-dashed border-border rounded-md text-muted-foreground text-sm">
                No models found for this key
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div>
            <Label className="text-sm font-medium text-foreground">API Key</Label>
            <div className="relative mt-2">
              <Input
                type={showSecret ? "text" : "password"}
                value="••••••••••••••••"
                readOnly
                className="w-full bg-input/50 border border-border text-foreground text-sm py-2.5 px-3.5 rounded-md pr-10 cursor-default"
              />
              <button
                type="button"
                onClick={() => setShowSecret((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-foreground">Default Model</Label>
            <div className="w-full mt-2 px-3.5 py-2.5 bg-input/50 border border-border rounded-md text-foreground text-sm">
              {fetchedConfig?.model || "—"}
            </div>
          </div>
        </>
      )}

      {saveProviderError && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveProviderError}
        </div>
      )}

      {isEditing && (
        <button
          onClick={handleSave}
          disabled={isSavingProvider || !form.apiKey || !form.model}
          className="w-full mt-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-display font-semibold tracking-wide text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
        >
          {isSavingProvider ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save {meta.label} Config
            </>
          )}
        </button>
      )}
    </div>
  );
}

export function AIProvidersCard() {
  const [activeProvider, setActiveProvider] = useState<ProviderKey>("openai");

  const openaiStatus = useAIProvider("openai");
  const geminiStatus = useAIProvider("gemini");
  const claudeStatus = useAIProvider("claude");

  const statusMap: Record<ProviderKey, boolean> = {
    openai: openaiStatus.isProviderConfigured,
    gemini: geminiStatus.isProviderConfigured,
    claude: claudeStatus.isProviderConfigured,
  };

  return (
    <Card className="border rounded-xl p-6 bg-card/80 border-border">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0 border border-primary/20">
          <Bot className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
            AI Provider
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Choose which LLM powers scenario prompts, and store its credentials
          </p>
        </div>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {PROVIDERS.map(({ key, label }) => {
          const isActive = activeProvider === key;
          const isConfigured = statusMap[key];
          return (
            <button
              key={key}
              onClick={() => setActiveProvider(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-display font-semibold tracking-wide border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
              {isConfigured ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
            </button>
          );
        })}
      </div>

      <ProviderPanel key={activeProvider} providerKey={activeProvider} />
    </Card>
  );
}
