export type EmailProvider = "ses" | "sendgrid" | "resend";

export interface EditSections {
  email: boolean;
  twilio: boolean;
  livekit: boolean;
  github: boolean;
  retention: boolean;
}

export interface EmailConfig {
  provider: EmailProvider;
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  apiKey: string;
  sesFromEmail: string;
  sesLoginUrl: string;
  acceptIncomingEmails: boolean;
  sesTestEmail: string;
}


export interface FieldErrors {
  region: string | null;
  accessKey: string | null;
  secretKey: string | null;
  apiKey: string | null;
  testEmail: string | null;
}

export interface FieldTouched {
  region: boolean;
  accessKey: boolean;
  secretKey: boolean;
  apiKey: boolean;
  testEmail: boolean;
}

export interface ShowSecrets {
  awsSecretAccessKey: boolean;
  apiKey: boolean;
}

export interface GithubCardProps {
  editMode: EditSections;
  setEditMode: React.Dispatch<React.SetStateAction<EditSections>>;
}








export interface FieldErrors {
  region: string | null;
  accessKey: string | null;
  secretKey: string | null;
  apiKey: string | null;
  testEmail: string | null;
}

export interface FieldTouched {
  region: boolean;
  accessKey: boolean;
  secretKey: boolean;
  apiKey: boolean;
  testEmail: boolean;
}

export interface ShowSecrets {
  awsSecretAccessKey: boolean;
  apiKey: boolean;
}


export interface EmailConfigResponse {
  provider: EmailProvider;
  from_email: string;
  login_url: string;
  aws_region?: string;
  aws_access_key_id?: string;
  api_key_configured?: boolean;
}

export interface EmailConfigPayload {
  provider: EmailProvider;
  from_email: string;
  login_url: string;
  test_email: string;
  aws_region?: string;
  aws_access_key_id?: string;
  aws_secret_access_key?: string;
  api_key?: string;
}