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
import { useAIProvider } from "@/hooks/use-ai-provider";
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

  const [isEditingLocal, setIsEditingLocal] = useState(true);
  const [form, setForm] = useState<AIProviderConfigForm>({
    apiKey: "",
    model: meta.defaultModel,
    baseUrl: "",
  });
  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (fetchedConfig) {
      setForm((prev) => ({
        ...prev,
        model: fetchedConfig.model ?? meta.defaultModel,
        baseUrl: fetchedConfig.base_url ?? "",
      }));
      setIsEditingLocal(false);
    } else {
      setIsEditingLocal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchedConfig, providerKey]);

  useEffect(() => {
    if (saveProviderSuccess) {
      setIsEditingLocal(false);
    }
  }, [saveProviderSuccess]);

  const handleChange = (field: keyof AIProviderConfigForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveProviderConfig({
      provider: providerKey,
      api_key: form.apiKey,
      model: form.model,
      base_url: form.baseUrl || undefined,
    });
  };

  if (isLoadingProvider) {
    return (
      <div className="flex items-center gap-3 text-gray-400 py-8">
        <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
        <span className="text-sm">Loading {meta.label} configuration...</span>
      </div>
    );
  }

  const isEditing = isEditingLocal || !isProviderConfigured;

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <p className="text-sm text-gray-400">
          {isProviderConfigured && !isEditingLocal
            ? "Configured • Click Edit to modify"
            : `Add your ${meta.label} API credentials`}
        </p>
        {isProviderConfigured && (
          <button
            onClick={() => setIsEditingLocal((p) => !p)}
            className="px-3 py-1.5 text-sm bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 rounded-lg transition-colors flex items-center gap-2 shrink-0"
          >
            <Edit3 className="h-4 w-4" />
            {isEditingLocal ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      {isEditing ? (
        <>
          <div>
            <Label htmlFor={`${providerKey}-api-key`} className="text-sm font-medium text-gray-200">
              API Key
            </Label>
            <div className="relative mt-2">
              <Input
                id={`${providerKey}-api-key`}
                type={showSecret ? "text" : "password"}
                placeholder={meta.placeholder}
                value={form.apiKey}
                onChange={(e) => handleChange("apiKey", e.target.value)}
                className="w-full bg-[#0f1419] border border-gray-700 text-white placeholder:text-gray-600 text-sm pr-10 py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowSecret((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor={`${providerKey}-model`} className="text-sm font-medium text-gray-200">
              Default Model
            </Label>
            <Input
              id={`${providerKey}-model`}
              type="text"
              placeholder={meta.defaultModel}
              value={form.model}
              onChange={(e) => handleChange("model", e.target.value)}
              className="w-full mt-2 bg-[#0f1419] border border-gray-700 text-white placeholder:text-gray-600 text-sm py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
            />
          </div>

          <div>
            <Label
              htmlFor={`${providerKey}-base-url`}
              className="text-sm font-medium text-gray-200"
            >
              Base URL <span className="text-gray-500 font-normal">(optional)</span>
            </Label>
            <Input
              id={`${providerKey}-base-url`}
              type="text"
              placeholder="Leave blank to use the default endpoint"
              value={form.baseUrl}
              onChange={(e) => handleChange("baseUrl", e.target.value)}
              className="w-full mt-2 bg-[#0f1419] border border-gray-700 text-white placeholder:text-gray-600 text-sm py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
            />
          </div>
        </>
      ) : (
        <>
          <div>
            <Label className="text-sm font-medium text-gray-200">API Key</Label>
            <div className="relative mt-2">
              <Input
                type={showSecret ? "text" : "password"}
                value="••••••••••••••••"
                readOnly
                className="w-full bg-[#0f1419]/50 border border-gray-700 text-white text-sm py-2.5 px-3.5 rounded-lg pr-10 cursor-default"
              />
              <button
                type="button"
                onClick={() => setShowSecret((p) => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
              >
                {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-200">Default Model</Label>
            <div className="w-full mt-2 px-3.5 py-2.5 bg-[#0f1419]/50 border border-gray-700 rounded-lg text-white text-sm">
              {form.model || "—"}
            </div>
          </div>
          <div>
            <Label className="text-sm font-medium text-gray-200">Base URL</Label>
            <div className="w-full mt-2 px-3.5 py-2.5 bg-[#0f1419]/50 border border-gray-700 rounded-lg text-white text-sm">
              {form.baseUrl || "Default"}
            </div>
          </div>
        </>
      )}

      {saveProviderError && (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {saveProviderError}
        </div>
      )}

      {isEditing && (
        <button
          onClick={handleSave}
          disabled={isSavingProvider || !form.apiKey || !form.model}
          className="w-full mt-2 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-400/50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
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

  // Lightweight status check per provider so tabs can show a dot —
  // each hook call is cheap since react-query caches by queryKey.
  const openaiStatus = useAIProvider("openai");
  const geminiStatus = useAIProvider("gemini");
  const claudeStatus = useAIProvider("claude");

  const statusMap: Record<ProviderKey, boolean> = {
    openai: openaiStatus.isProviderConfigured,
    gemini: geminiStatus.isProviderConfigured,
    claude: claudeStatus.isProviderConfigured,
  };

  return (
    <Card className="backdrop-blur-sm border rounded-xl p-6 bg-[#1a1f2e]/80 border-gray-700/50">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-cyan-400/10 rounded-lg shrink-0">
          <Bot className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">AI Provider</h2>
          <p className="text-sm text-gray-400 mt-1">
            Choose which LLM powers scenario prompts, and store its credentials
          </p>
        </div>
      </div>

      {/* Provider tabs */}
      <div className="flex gap-1 mb-6 border-b border-gray-700/50">
        {PROVIDERS.map(({ key, label }) => {
          const isActive = activeProvider === key;
          const isConfigured = statusMap[key];
          return (
            <button
              key={key}
              onClick={() => setActiveProvider(key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                isActive
                  ? "border-cyan-400 text-cyan-400"
                  : "border-transparent text-gray-400 hover:text-gray-200"
              }`}
            >
              {label}
              {isConfigured ? (
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
              ) : (
                <Circle className="h-3.5 w-3.5 text-gray-600" />
              )}
            </button>
          );
        })}
      </div>

      <ProviderPanel key={activeProvider} providerKey={activeProvider} />
    </Card>
  );
}
