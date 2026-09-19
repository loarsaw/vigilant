import { TextField, PasswordField, ReadonlyField, ReadonlySecretField } from "../form-field";
import type { EmailConfig, FieldErrors, ShowSecrets } from "../types";

export function AwsSesFields({
  emailConfig,
  isEditing,
  onChange,
  errors,
  showSecrets,
  toggleSecretVisibility,
  onAccessKeyBlur,
  onSecretKeyBlur,
  onRegionBlur,
  onTestEmailBlur,
}: {
  emailConfig: EmailConfig;
  isEditing: boolean;
  onChange: (field: keyof EmailConfig, value: string) => void;
  errors: FieldErrors;
  showSecrets: ShowSecrets;
  toggleSecretVisibility: (field: keyof ShowSecrets) => void;
  onAccessKeyBlur: () => void;
  onSecretKeyBlur: () => void;
  onRegionBlur: () => void;
  onTestEmailBlur: () => void;
}) {
  if (!isEditing) {
    return (
      <div className="space-y-4">
        <ReadonlyField label="AWS Access Key ID" value={emailConfig.awsAccessKeyId} />
        <ReadonlySecretField
          id="aws-secret-readonly"
          label="AWS Secret Access Key"
          value={emailConfig.awsSecretAccessKey}
          showSecret={showSecrets.awsSecretAccessKey}
          toggleShow={() => toggleSecretVisibility("awsSecretAccessKey")}
        />
        <ReadonlyField label="AWS Region" value={emailConfig.awsRegion} />
        <ReadonlyField label="From Email" value={emailConfig.sesFromEmail} />
        <ReadonlyField label="App Login URL" value={emailConfig.sesLoginUrl} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <TextField
        id="aws-access-key-id"
        label="AWS Access Key ID"
        value={emailConfig.awsAccessKeyId}
        onChange={(v) => onChange("awsAccessKeyId", v)}
        placeholder="AKIAIOSFODNN7EXAMPLE"
        onBlur={onAccessKeyBlur}
        error={errors.accessKey}
      />

      <PasswordField
        id="aws-secret-access-key"
        label="AWS Secret Access Key"
        value={emailConfig.awsSecretAccessKey}
        onChange={(v) => onChange("awsSecretAccessKey", v)}
        showSecret={showSecrets.awsSecretAccessKey}
        toggleShow={() => toggleSecretVisibility("awsSecretAccessKey")}
        placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
        onBlur={onSecretKeyBlur}
        error={errors.secretKey}
      />

      <TextField
        id="aws-region"
        label="AWS Region"
        value={emailConfig.awsRegion}
        onChange={(v) => onChange("awsRegion", v)}
        placeholder="us-east-1"
        onBlur={onRegionBlur}
        error={errors.region}
        helpText={
          errors.region
            ? undefined
            : "The AWS region your SES identity is verified in, e.g. us-east-1, eu-west-2, ap-southeast-3"
        }
      />

      <TextField
        id="ses-from-email"
        label="From Email"
        value={emailConfig.sesFromEmail}
        onChange={(v) => onChange("sesFromEmail", v)}
        placeholder="noreply@example.com"
      />

      <TextField
        id="ses-login-url"
        label="App Login URL"
        value={emailConfig.sesLoginUrl}
        onChange={(v) => onChange("sesLoginUrl", v)}
        placeholder="https://app.example.com/login"
      />

      <TextField
        id="ses-test-email"
        label="Test Email Address"
        value={emailConfig.sesTestEmail}
        onChange={(v) => onChange("sesTestEmail", v)}
        placeholder="you@example.com"
        onBlur={onTestEmailBlur}
        error={errors.testEmail}
        helpText={
          errors.testEmail
            ? undefined
            : "We'll send a verification email here before saving — this confirms the credentials actually work"
        }
      />
    </div>
  );
}
