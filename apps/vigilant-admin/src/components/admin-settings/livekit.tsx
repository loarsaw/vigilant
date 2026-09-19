import { useState, useEffect } from "react";
import { Video, AlertCircle, Edit3, Save, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useLiveKit } from "@/hooks/use-livekit";
import { LiveKitConfigForm } from "@/hooks/types";

import { TextField, PasswordField, ReadonlyField, ReadonlySecretField } from "./form-field";

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

  if (isLoadingLiveKit) {
    return (
      <Card className="border rounded-xl p-6 bg-card/40 border-primary/30">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Loading LiveKit configuration...</span>
        </div>
      </Card>
    );
  }

  const isEditing = editMode.livekit || !isLiveKitConfigured;

  return (
    <Card
      className={`border rounded-xl p-6 transition-colors ${
        isEditing ? "bg-card/80 border-border" : "bg-card/40 border-primary/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0 border border-primary/20">
          <Video className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
            LiveKit Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isLiveKitConfigured && !editMode.livekit
              ? "Configured • Click Edit to modify"
              : "Configure LiveKit for real-time rooms"}
          </p>
        </div>
        {isLiveKitConfigured && (
          <button
            onClick={() => setEditMode((prev: any) => ({ ...prev, livekit: !prev.livekit }))}
            className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2 font-display font-semibold tracking-wide"
          >
            <Edit3 className="h-4 w-4" />
            {editMode.livekit ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        {isEditing ? (
          <>
            <TextField
              id="livekit-host"
              label="Host URL"
              value={form.host}
              onChange={(v) => handleChange("host", v)}
              placeholder="wss://your-project.livekit.cloud"
            />
            <TextField
              id="livekit-api-key"
              label="API Key"
              value={form.apiKey}
              onChange={(v) => handleChange("apiKey", v)}
              placeholder="APIxxxxxxxxxxxxxxxx"
            />
            <PasswordField
              id="livekit-api-secret"
              label="API Secret"
              value={form.apiSecret}
              onChange={(v) => handleChange("apiSecret", v)}
              showSecret={showSecret}
              toggleShow={() => setShowSecret((p) => !p)}
              placeholder="your api secret"
            />
          </>
        ) : (
          <>
            <ReadonlyField label="Host URL" value={form.host} />
            <ReadonlyField label="API Key" value={form.apiKey} />
            <ReadonlySecretField
              id="livekit-secret-readonly"
              label="API Secret"
              value=""
              showSecret={showSecret}
              toggleShow={() => setShowSecret((p) => !p)}
            />
          </>
        )}

        {saveLiveKitError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveLiveKitError}
          </div>
        )}

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSavingLiveKit}
            className="w-full mt-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-display font-semibold tracking-wide text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
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
