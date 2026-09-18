export type EditSections = {
  email: boolean;
  calendar: boolean;
};

export interface EmailConfig {
  provider: "aws" | "twilio";
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  sesFromEmail: string;
  sesLoginUrl: string;
  acceptIncomingEmails: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromEmail: string;
  sesTestEmail: string;
}

export interface FieldErrors {
  region: string | null;
  accessKey: string | null;
  secretKey: string | null;
  testEmail: string | null;
}

export interface FieldTouched {
  region: boolean;
  accessKey: boolean;
  secretKey: boolean;
  testEmail: boolean;
}

export interface ShowSecrets {
  awsSecretAccessKey: boolean;
  twilioAuthToken: boolean;
}


export interface GithubCardProps {
  editMode: Record<string, boolean>;
  setEditMode: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}