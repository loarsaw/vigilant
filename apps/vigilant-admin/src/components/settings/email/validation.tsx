const AWS_REGION_PATTERN = /^[a-z]{2}(-gov|-iso[a-z]*)?-[a-z]+-\d$/;
const AWS_ACCESS_KEY_PATTERN = /^(AKIA|ASIA|AROA|AIDA)[A-Z0-9]{16}$/;
const AWS_SECRET_KEY_PATTERN = /^[A-Za-z0-9/+=]{40}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SENDGRID_KEY_PATTERN = /^SG\.[A-Za-z0-9_-]{22}\.[A-Za-z0-9_-]{43}$/;

export function validateAwsRegion(region: string): string | null {
  const trimmed = region.trim();
  if (!trimmed) return "AWS Region is required";
  if (trimmed !== region) return "Remove leading/trailing spaces";
  if (trimmed !== trimmed.toLowerCase()) return "Region codes are lowercase, e.g. us-east-1";
  if (!AWS_REGION_PATTERN.test(trimmed)) {
    return "Doesn't look like a valid AWS region, e.g. us-east-1, eu-west-2, ap-southeast-3";
  }
  return null;
}

export function validateAwsAccessKeyId(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return "AWS Access Key ID is required";
  if (trimmed !== key) return "Remove leading/trailing spaces";
  if (trimmed.length !== 20) return "Access Key IDs are always 20 characters";
  if (!AWS_ACCESS_KEY_PATTERN.test(trimmed)) {
    return "Doesn't look like a valid AWS Access Key ID, e.g. AKIAIOSFODNN7EXAMPLE";
  }
  return null;
}

export function validateAwsSecretAccessKey(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return "AWS Secret Access Key is required";
  if (trimmed !== key) return "Remove leading/trailing spaces";
  if (trimmed.length !== 40) return "Secret Access Keys are always 40 characters";
  if (!AWS_SECRET_KEY_PATTERN.test(trimmed)) {
    return "Doesn't look like a valid AWS Secret Access Key";
  }
  return null;
}

export function validateSendGridApiKey(key: string): string | null {
  const trimmed = key.trim();
  if (!trimmed) return "SendGrid API Key is required";
  if (trimmed !== key) return "Remove leading/trailing spaces";
  if (!SENDGRID_KEY_PATTERN.test(trimmed)) {
    return "Doesn't look like a valid SendGrid API Key, expected format SG.xxxxx.yyyyy";
  }
  return null;
}

export function validateTestEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!trimmed) return "A test email is required to verify this configuration";
  if (!EMAIL_PATTERN.test(trimmed)) return "Doesn't look like a valid email address";
  return null;
}