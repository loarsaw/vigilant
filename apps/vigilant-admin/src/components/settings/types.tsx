export type EditSections = {
  email: boolean;
  calendar: boolean;
};

export interface EmailConfig {
  provider: "ses" | "sendgrid";
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  sendgridApiKey: string;
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
  editMode: Record<string, boolean>;
  setEditMode: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}