import { useState, useEffect } from "react";
import { Phone, Eye, EyeOff, AlertCircle, Edit3, Save, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useTwilio } from "@/hooks/use-twilio";
import { TwilioConfigForm } from "@/types/types";

export function CallCard({
  editMode,
  setEditMode,
}: {
  editMode: { twilio: boolean };
  setEditMode: React.Dispatch<React.SetStateAction<any>>;
}) {
  const {
    twilioConfig: fetchedConfig,
    isTwilioConfigured,
    isLoadingTwilio,
    saveTwilioConfig,
    isSavingTwilio,
    saveTwilioError,
    saveTwilioSuccess,
  } = useTwilio();

  const [form, setForm] = useState<TwilioConfigForm>({
    accountSid: "",
    apiKeySid: "",
    apiKeySecret: "",
    twimlAppSid: "",
    fromNumber: "",
  });

  const [showSecret, setShowSecret] = useState(false);

  useEffect(() => {
    if (fetchedConfig) {
      setForm((prev) => ({
        ...prev,
        accountSid: fetchedConfig.account_sid ?? "",
        apiKeySid: fetchedConfig.api_key_sid ?? "",
        twimlAppSid: fetchedConfig.twiml_app_sid ?? "",
        fromNumber: fetchedConfig.from_number ?? "",
      }));
    }
  }, [fetchedConfig]);

  useEffect(() => {
    if (saveTwilioSuccess) {
      setEditMode((prev: any) => ({ ...prev, twilio: false }));
    }
  }, [saveTwilioSuccess, setEditMode]);

  const handleChange = (field: keyof TwilioConfigForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    saveTwilioConfig({
      account_sid: form.accountSid,
      api_key_sid: form.apiKeySid,
      api_key_secret: form.apiKeySecret,
      twiml_app_sid: form.twimlAppSid,
      from_number: form.fromNumber,
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
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 bg-input border border-border text-foreground placeholder:text-muted-foreground/60 text-sm py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
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
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative mt-2">
        <Input
          id={id}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-input border border-border text-foreground placeholder:text-muted-foreground/60 text-sm pr-10 py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
        />
        <button
          type="button"
          onClick={toggle}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  const renderReadonlyField = (label: string, value: string) => (
    <div>
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="w-full mt-2 px-3.5 py-2.5 bg-input/50 border border-border rounded-md text-foreground text-sm">
        {value || "—"}
      </div>
    </div>
  );

  const renderReadonlySecretField = (id: string, label: string) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative mt-2">
        <Input
          id={id}
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
  );

  if (isLoadingTwilio) {
    return (
      <Card className="border rounded-xl p-6 bg-card/40 border-primary/30">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Loading Twilio configuration...</span>
        </div>
      </Card>
    );
  }

  const isEditing = editMode.twilio || !isTwilioConfigured;

  return (
    <Card
      className={`border rounded-xl p-6 transition-colors ${
        isEditing ? "bg-card/80 border-border" : "bg-card/40 border-primary/30"
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0 border border-primary/20">
          <Phone className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
            Twilio Voice Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isTwilioConfigured && !editMode.twilio
              ? "Configured • Click Edit to modify"
              : "Configure Twilio for browser-to-phone calling"}
          </p>
        </div>
        {isTwilioConfigured && (
          <button
            onClick={() => setEditMode((prev: any) => ({ ...prev, twilio: !prev.twilio }))}
            className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2 font-display font-semibold tracking-wide"
          >
            <Edit3 className="h-4 w-4" />
            {editMode.twilio ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        {isEditing ? (
          <>
            {renderTextField(
              "twilio-account-sid",
              "Account SID",
              form.accountSid,
              (v) => handleChange("accountSid", v),
              "ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            )}
            {renderTextField(
              "twilio-api-key-sid",
              "API Key SID",
              form.apiKeySid,
              (v) => handleChange("apiKeySid", v),
              "SKxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            )}
            {renderPasswordField(
              "twilio-api-key-secret",
              "API Key Secret",
              form.apiKeySecret,
              (v) => handleChange("apiKeySecret", v),
              showSecret,
              () => setShowSecret((p) => !p),
              "your api key secret",
            )}
            {renderTextField(
              "twilio-twiml-app-sid",
              "TwiML App SID",
              form.twimlAppSid,
              (v) => handleChange("twimlAppSid", v),
              "APxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx",
            )}
            {renderTextField(
              "twilio-from-number",
              "From Number",
              form.fromNumber,
              (v) => handleChange("fromNumber", v),
              "+1234567890",
            )}
          </>
        ) : (
          <>
            {renderReadonlyField("Account SID", form.accountSid)}
            {renderReadonlyField("API Key SID", form.apiKeySid)}
            {renderReadonlySecretField("twilio-secret-readonly", "API Key Secret")}
            {renderReadonlyField("TwiML App SID", form.twimlAppSid)}
            {renderReadonlyField("From Number", form.fromNumber)}
          </>
        )}

        {saveTwilioError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveTwilioError}
          </div>
        )}

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSavingTwilio}
            className="w-full mt-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-display font-semibold tracking-wide text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
          >
            {isSavingTwilio ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Twilio Config
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}