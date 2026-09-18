import { useState, useEffect } from "react";
import { Mail, AlertCircle, Edit3, Save, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useSettings } from "@/hooks/use-settings";

import { SelectField, ReadonlyField } from "../form-field";
import { AwsSesFields } from "./email-provider";
import {
  validateAwsRegion,
  validateAwsAccessKeyId,
  validateAwsSecretAccessKey,
  validateTestEmail,
} from "./validation";
import type { EmailConfig, EditSections, FieldErrors, FieldTouched } from "../types";

const DEFAULT_ERRORS: FieldErrors = {
  region: null,
  accessKey: null,
  secretKey: null,
  testEmail: null,
};

const DEFAULT_TOUCHED: FieldTouched = {
  region: false,
  accessKey: false,
  secretKey: false,
  testEmail: false,
};

export function EmailCard({
  configuredSections,
  editMode,
  setEditMode,
}: {
  configuredSections: { email: boolean; calendar: boolean };
  editMode: { email: boolean; calendar: boolean };
  setEditMode: React.Dispatch<React.SetStateAction<EditSections>>;
}) {
  const {
    emailConfig: fetchedConfig,
    isEmailConfigured,
    isLoadingEmail,
    saveEmailConfig,
    isSavingEmail,
    saveEmailError,
    saveEmailSuccess,
  } = useSettings();

  const [emailConfig, setEmailConfig] = useState<EmailConfig>({
    provider: "aws",
    awsAccessKeyId: "",
    awsSecretAccessKey: "",
    awsRegion: "us-east-1",
    sesFromEmail: "",
    sesLoginUrl: "",
    acceptIncomingEmails: false,
    twilioAccountSid: "",
    twilioAuthToken: "",
    twilioFromEmail: "",
    sesTestEmail: "",
  });

  const [showSecrets, setShowSecrets] = useState({
    awsSecretAccessKey: false,
    twilioAuthToken: false,
  });

  // These two were previously split into 8 separate useState calls, with
  // `testEmail` missing entirely — that's what broke the blur handler.
  const [errors, setErrors] = useState<FieldErrors>(DEFAULT_ERRORS);
  const [touched, setTouched] = useState<FieldTouched>(DEFAULT_TOUCHED);

  useEffect(() => {
    if (fetchedConfig) {
      setEmailConfig((prev) => ({
        ...prev,
        awsAccessKeyId: fetchedConfig.aws_access_key_id ?? "",
        awsRegion: fetchedConfig.aws_region ?? "us-east-1",
        sesFromEmail: fetchedConfig.ses_from_email ?? "",
        sesLoginUrl: fetchedConfig.ses_login_url ?? "",
      }));
    }
  }, [fetchedConfig]);

  useEffect(() => {
    if (saveEmailSuccess) {
      setEditMode((prev) => ({ ...prev, email: false }));
    }
  }, [saveEmailSuccess, setEditMode]);

  const handleEmailChange = (field: keyof EmailConfig, value: string | boolean) => {
    setEmailConfig((prev) => ({ ...prev, [field]: value }));

    if (typeof value !== "string") return;

    if (field === "awsRegion" && touched.region) {
      setErrors((prev) => ({ ...prev, region: validateAwsRegion(value) }));
    }
    if (field === "awsAccessKeyId" && touched.accessKey) {
      setErrors((prev) => ({ ...prev, accessKey: validateAwsAccessKeyId(value) }));
    }
    if (field === "awsSecretAccessKey" && touched.secretKey) {
      setErrors((prev) => ({ ...prev, secretKey: validateAwsSecretAccessKey(value) }));
    }
    if (field === "sesTestEmail" && touched.testEmail) {
      setErrors((prev) => ({ ...prev, testEmail: validateTestEmail(value) }));
    }
  };

  const handleRegionBlur = () => {
    setTouched((prev) => ({ ...prev, region: true }));
    setErrors((prev) => ({ ...prev, region: validateAwsRegion(emailConfig.awsRegion) }));
  };

  const handleAccessKeyBlur = () => {
    setTouched((prev) => ({ ...prev, accessKey: true }));
    setErrors((prev) => ({
      ...prev,
      accessKey: validateAwsAccessKeyId(emailConfig.awsAccessKeyId),
    }));
  };

  const handleSecretKeyBlur = () => {
    setTouched((prev) => ({ ...prev, secretKey: true }));
    setErrors((prev) => ({
      ...prev,
      secretKey: validateAwsSecretAccessKey(emailConfig.awsSecretAccessKey),
    }));
  };

  // This handler didn't exist before, despite being wired up to the
  // test-email field's onBlur — that's the crash.
  const handleTestEmailBlur = () => {
    setTouched((prev) => ({ ...prev, testEmail: true }));
    setErrors((prev) => ({ ...prev, testEmail: validateTestEmail(emailConfig.sesTestEmail) }));
  };

  const toggleSecretVisibility = (field: keyof typeof showSecrets) => {
    setShowSecrets((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleEditMode = (section: "email" | "calendar") => {
    setEditMode((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = () => {
    const regionErr = validateAwsRegion(emailConfig.awsRegion);
    const accessKeyErr = validateAwsAccessKeyId(emailConfig.awsAccessKeyId);
    const secretKeyErr = validateAwsSecretAccessKey(emailConfig.awsSecretAccessKey);
    const testEmailErr = validateTestEmail(emailConfig.sesTestEmail);

    setTouched({ region: true, accessKey: true, secretKey: true, testEmail: true });
    setErrors({
      region: regionErr,
      accessKey: accessKeyErr,
      secretKey: secretKeyErr,
      testEmail: testEmailErr,
    });

    if (
      emailConfig.provider === "aws" &&
      (regionErr || accessKeyErr || secretKeyErr || testEmailErr)
    )
      return;

    saveEmailConfig({
      aws_region: emailConfig.awsRegion.trim(),
      aws_access_key_id: emailConfig.awsAccessKeyId.trim(),
      aws_secret_access_key: emailConfig.awsSecretAccessKey.trim(),
      ses_from_email: emailConfig.sesFromEmail,
      ses_login_url: emailConfig.sesLoginUrl,
      ses_test_email: emailConfig.sesTestEmail.trim(),
    });
  };

  if (isLoadingEmail) {
    return (
      <Card className="border rounded-xl p-6 bg-card/40 border-primary/30">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Loading email configuration...</span>
        </div>
      </Card>
    );
  }

  const isEditing = editMode.email || !isEmailConfigured;

  return (
    <Card
      className={`border rounded-xl p-6 transition-colors ${
        editMode.email ? "bg-card/80 border-border" : "bg-card/40 border-primary/30"
      }`}
    >
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0 border border-primary/20">
          <Mail className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
            Email Configuration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isEmailConfigured && !editMode.email
              ? "Configured • Click Edit to modify"
              : "Configure email service for notifications"}
          </p>
        </div>
        {isEmailConfigured && (
          <button
            onClick={() => toggleEditMode("email")}
            className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2 font-display font-semibold tracking-wide"
          >
            <Edit3 className="h-4 w-4" />
            {editMode.email ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      <div className="space-y-4 border-t border-border pt-6">
        {isEditing ? (
          <SelectField
            id="email-provider"
            label="Email Service Provider"
            value={emailConfig.provider}
            onChange={(value) => handleEmailChange("provider", value)}
            options={[{ value: "aws", label: "AWS SES" }]}
          />
        ) : (
          <ReadonlyField
            label="Email Service Provider"
            value={emailConfig.provider === "aws" ? "AWS SES" : "Twilio SendGrid"}
          />
        )}

        {emailConfig.provider === "aws" && (
          <AwsSesFields
            emailConfig={emailConfig}
            isEditing={isEditing}
            onChange={handleEmailChange}
            errors={errors}
            showSecrets={showSecrets}
            toggleSecretVisibility={toggleSecretVisibility}
            onAccessKeyBlur={handleAccessKeyBlur}
            onSecretKeyBlur={handleSecretKeyBlur}
            onRegionBlur={handleRegionBlur}
            onTestEmailBlur={handleTestEmailBlur}
          />
        )}

        {saveEmailError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveEmailError}
          </div>
        )}

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSavingEmail}
            className="w-full mt-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-display font-semibold tracking-wide text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
          >
            {isSavingEmail ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Email Config
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}
