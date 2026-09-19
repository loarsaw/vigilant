import { TextField, PasswordField, ReadonlyField, ReadonlySecretField } from "../form-field";
import type { EmailConfig, FieldErrors } from "../types";

export function SendGridFields({
  emailConfig,
  isEditing,
  onChange,
  errors,
  showSecrets,
  toggleSecretVisibility,
  onApiKeyBlur,
  onTestEmailBlur,
}: {
  emailConfig: EmailConfig;
  isEditing: boolean;
  onChange: (field: keyof EmailConfig, value: string | boolean) => void;
  errors: FieldErrors;
  showSecrets: { apiKey: boolean };
  toggleSecretVisibility: (field: "apiKey") => void;
  onApiKeyBlur: () => void;
  onTestEmailBlur: () => void;
}) {
  return (
    <>
      {isEditing ? (
        <PasswordField
          id="sendgrid-api-key"
          label="SendGrid API Key"
          value={emailConfig.apiKey}
          onChange={(value) => onChange("apiKey", value)}
          onBlur={onApiKeyBlur}
          error={errors.apiKey}
          showSecret={showSecrets.apiKey}
          toggleShow={() => toggleSecretVisibility("apiKey")}
          placeholder="SG.xxxxxxxxxxxxxxxxxxxxxx.yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy"
        />
      ) : (
        <ReadonlySecretField
          id="sendgrid-api-key"
          label="SendGrid API Key"
          value={emailConfig.apiKey}
          showSecret={showSecrets.apiKey}
          toggleShow={() => toggleSecretVisibility("apiKey")}
        />
      )}

      {isEditing ? (
        <TextField
          id="ses-from-email"
          label="From Email"
          value={emailConfig.sesFromEmail}
          onChange={(value) => onChange("sesFromEmail", value)}
          placeholder="notifications@yourcompany.com"
        />
      ) : (
        <ReadonlyField label="From Email" value={emailConfig.sesFromEmail} />
      )}

      {isEditing ? (
        <TextField
          id="ses-login-url"
          label="App Login URL"
          value={emailConfig.sesLoginUrl}
          onChange={(value) => onChange("sesLoginUrl", value)}
          placeholder="https://app.yourcompany.com/login"
        />
      ) : (
        <ReadonlyField label="App Login URL" value={emailConfig.sesLoginUrl} />
      )}

      {isEditing && (
        <TextField
          id="ses-test-email"
          label="Test Email"
          value={emailConfig.sesTestEmail}
          onChange={(value) => onChange("sesTestEmail", value)}
          onBlur={onTestEmailBlur}
          error={errors.testEmail}
          placeholder="you@yourcompany.com"
          helpText="We'll send a one-off email here to verify these credentials before saving."
        />
      )}
    </>
  );
}
