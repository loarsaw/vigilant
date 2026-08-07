import { useState, useEffect } from "react";
import { Video, Eye, EyeOff, AlertCircle, Edit3, Save, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useLiveKit } from "@/hooks/use-livekit";
import { LiveKitConfigForm } from "@/hooks/types";

export function LiveKitCard({
  editMode,
  setEditMode,
}: {
  editMode: { livekit: boolean };
  setEditMode: React.Dispatch<React.SetStateAction<any>>;
}) {
  const {
    livekitConfig: fetchedConfig,
    isLiveKitConfigured,
    isLoadingLiveKit,
    saveLiveKitConfig,
    isSavingLiveKit,
    saveLiveKitError,
    saveLiveKitSuccess,
  } = useLiveKit();

  const [form, setForm] = useState<LiveKitConfigForm>({
    host: "",
    apiKey: "",
    apiSecret: "",
  });

  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (fetchedConfig) {
      setForm((prev) => ({
        ...prev,
        host: fetchedConfig.host ?? "",
        apiKey: fetchedConfig.api_key ?? "",
      }));
    }
  }, [fetchedConfig]);

  useEffect(() => {
    if (saveLiveKitSuccess) {
      setEditMode((prev: any) => ({ ...prev, livekit: false }));
    }
  }, [saveLiveKitSuccess, setEditMode]);

  const handleChange = (field: keyof LiveKitConfigForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveLiveKitConfig({
      host: form.host,
      api_key: form.apiKey,
      api_secret: form.apiSecret,
    });
  };

  const renderTextField = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    placeholder: string,
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-200">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 bg-[#0f1419] border border-gray-700 text-white placeholder:text-gray-600 text-sm py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
      />
    </div>
  );

  const renderPasswordField = (
    id: string,
    label: string,
    value: string,
    onChange: (v: string) => void,
    show: boolean,
    toggle: () => void,
    placeholder: string,
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-200">
        {label}
      </Label>
      <div className="relative mt-2">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0f1419] border border-gray-700 text-white placeholder:text-gray-600 text-sm pr-10 py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  const renderReadonlyField = (label: string, value: string) => (
    <div>
      <Label className="text-sm font-medium text-gray-200">{label}</Label>
      <div className="w-full mt-2 px-3.5 py-2.5 bg-[#0f1419]/50 border border-gray-700 rounded-lg text-white text-sm">
        {value || "—"}
      </div>
    </div>
  );

  const renderReadonlySecretField = (id: string, label: string) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-200">
        {label}
      </Label>
      <div className="relative mt-2">
        <Input
          id={id}
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
  );

  if (isLoadingLiveKit) {
    return (
      <Card className="backdrop-blur-sm border rounded-xl p-6 bg-[#1a1f2e]/40 border-cyan-400/30">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-sm">Loading LiveKit configuration...</span>
        </div>
      </Card>
    );
  }

  const isEditing = editMode.livekit || !isLiveKitConfigured;

  return (
    <Card
      className={`backdrop-blur-sm border rounded-xl p-6 transition-colors ${
        isEditing ? "bg-[#1a1f2e]/80 border-gray-700/50" : "bg-[#1a1f2e]/40 border-cyan-400/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-cyan-400/10 rounded-lg shrink-0">
          <Video className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">LiveKit Configuration</h2>
          <p className="text-sm text-gray-400 mt-1">
            {isLiveKitConfigured && !editMode.livekit
              ? "Configured • Click Edit to modify"
              : "Configure LiveKit for real-time rooms"}
          </p>
        </div>
        {isLiveKitConfigured && (
          <button
            onClick={() => setEditMode((prev: any) => ({ ...prev, livekit: !prev.livekit }))}
            className="px-3 py-1.5 text-sm bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 rounded-lg transition-colors flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            {editMode.livekit ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      <div className="space-y-4 border-t border-gray-700/50 pt-6">
        {isEditing ? (
          <>
            {renderTextField(
              "livekit-host",
              "Host URL",
              form.host,
              (v) => handleChange("host", v),
              "wss://your-project.livekit.cloud",
            )}
            {renderTextField(
              "livekit-api-key",
              "API Key",
              form.apiKey,
              (v) => handleChange("apiKey", v),
              "APIxxxxxxxxxxxxxxxx",
            )}
            {renderPasswordField(
              "livekit-api-secret",
              "API Secret",
              form.apiSecret,
              (v) => handleChange("apiSecret", v),
              showSecret,
              () => setShowSecret((p) => !p),
              "your api secret",
            )}
          </>
        ) : (
          <>
            {renderReadonlyField("Host URL", form.host)}
            {renderReadonlyField("API Key", form.apiKey)}
            {renderReadonlySecretField("livekit-secret-readonly", "API Secret")}
          </>
        )}

        {saveLiveKitError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveLiveKitError}
          </div>
        )}

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSavingLiveKit}
            className="w-full mt-2 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-400/50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSavingLiveKit ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save LiveKit Config
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}
