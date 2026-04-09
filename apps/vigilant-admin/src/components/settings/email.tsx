import { useState, useEffect } from 'react';
import { Mail, Eye, EyeOff, AlertCircle, CheckCircle2, Edit3, Save, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useSettings } from '@/hooks/use-settings';


type EditSections = {
  email: boolean;
  calendar: boolean;
};

interface EmailConfig {
  provider: 'aws' | 'twilio';
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  sesFromEmail: string;
  sesLoginUrl: string;
  acceptIncomingEmails: boolean;
  twilioAccountSid: string;
  twilioAuthToken: string;
  twilioFromEmail: string;
}

const REGION_LABELS: Record<string, string> = {
  'us-east-1':      'US East (N. Virginia)',
 };

const REGION_OPTIONS = Object.entries(REGION_LABELS).map(([value, label]) => ({ value, label }));

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
    provider: 'aws',
    awsAccessKeyId: '',
    awsSecretAccessKey: '',
    awsRegion: 'us-east-1',
    sesFromEmail: '',
    sesLoginUrl: '',
    acceptIncomingEmails: false,
    twilioAccountSid: '',
    twilioAuthToken: '',
    twilioFromEmail: '',
  });

  const [showSecrets, setShowSecrets] = useState({
    awsSecretAccessKey: false,
    twilioAuthToken: false,
  });

  useEffect(() => {
    if (fetchedConfig) {
      setEmailConfig(prev => ({
        ...prev,
        awsAccessKeyId: fetchedConfig.aws_access_key_id ?? '',
        awsRegion:      fetchedConfig.aws_region ?? 'us-east-1',
        sesFromEmail:   fetchedConfig.ses_from_email ?? '',
        sesLoginUrl:    fetchedConfig.ses_login_url ?? '',
      }));
    }
  }, [fetchedConfig]);

  useEffect(() => {
    if (saveEmailSuccess) {
      setEditMode(prev => ({ ...prev, email: false }));
    }
  }, [saveEmailSuccess, setEditMode]);

  const handleEmailChange = (field: keyof EmailConfig, value: string | boolean) => {
    setEmailConfig(prev => ({ ...prev, [field]: value }));
  };

  const toggleSecretVisibility = (field: keyof typeof showSecrets) => {
    setShowSecrets(prev => ({ ...prev, [field]: !prev[field] }));
  };

  const toggleEditMode = (section: 'email' | 'calendar') => {
    setEditMode(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const handleSave = () => {
    saveEmailConfig({
      aws_region:            emailConfig.awsRegion,
      aws_access_key_id:     emailConfig.awsAccessKeyId,
      aws_secret_access_key: emailConfig.awsSecretAccessKey,
      ses_from_email:        emailConfig.sesFromEmail,
      ses_login_url:         emailConfig.sesLoginUrl,
    });
  };


  const renderSelectField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    options: { value: string; label: string }[]
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-200">{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 px-3.5 py-2.5 bg-[#0f1419] border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );

  const renderTextField = (
    id: string,
    label: string,
    value: string,
    onChange: (value: string) => void,
    placeholder: string
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-200">{label}</Label>
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
    onChange: (value: string) => void,
    showSecret: boolean,
    toggleShow: () => void,
    placeholder: string
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-200">{label}</Label>
      <div className="relative mt-2">
        <Input
          id={id}
          type={showSecret ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#0f1419] border border-gray-700 text-white placeholder:text-gray-600 text-sm pr-10 py-2.5 px-3.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400 transition-colors"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
        >
          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );

  const renderReadonlyField = (label: string, value: string) => (
    <div>
      <Label className="text-sm font-medium text-gray-200">{label}</Label>
      <div className="w-full mt-2 px-3.5 py-2.5 bg-[#0f1419]/50 border border-gray-700 rounded-lg text-white text-sm">
        {value || '—'}
      </div>
    </div>
  );

  const renderReadonlySecretField = (
    id: string,
    label: string,
    value: string,
    showSecret: boolean,
    toggleShow: () => void
  ) => (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-gray-200">{label}</Label>
      <div className="relative mt-2">
        <Input
          id={id}
          type={showSecret ? 'text' : 'password'}
          value={value || '••••••••••••••••'}
          readOnly
          className="w-full bg-[#0f1419]/50 border border-gray-700 text-white text-sm py-2.5 px-3.5 rounded-lg pr-10 cursor-default"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300 transition-colors"
        >
          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );


  if (isLoadingEmail) {
    return (
      <Card className="backdrop-blur-sm border rounded-xl p-6 bg-[#1a1f2e]/40 border-cyan-400/30">
        <div className="flex items-center gap-3 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
          <span className="text-sm">Loading email configuration...</span>
        </div>
      </Card>
    );
  }


  return (
    <Card className={`backdrop-blur-sm border rounded-xl p-6 transition-colors ${
      editMode.email
        ? 'bg-[#1a1f2e]/80 border-gray-700/50'
        : 'bg-[#1a1f2e]/40 border-cyan-400/30'
    }`}>

      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-cyan-400/10 rounded-lg shrink-0">
          <Mail className="h-6 w-6 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-semibold text-white">Email Configuration</h2>
          <p className="text-sm text-gray-400 mt-1">
            {isEmailConfigured && !editMode.email
              ? 'Configured • Click Edit to modify'
              : 'Configure email service for notifications'}
          </p>
        </div>
        {isEmailConfigured && (
          <button
            onClick={() => toggleEditMode('email')}
            className="px-3 py-1.5 text-sm bg-cyan-400/10 hover:bg-cyan-400/20 text-cyan-400 rounded-lg transition-colors flex items-center gap-2"
          >
            <Edit3 className="h-4 w-4" />
            {editMode.email ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>

      <div className="space-y-4 border-t border-gray-700/50 pt-6">

        {/* Provider selector — only in edit/setup mode */}
        {(editMode.email || !isEmailConfigured) && renderSelectField(
          'email-provider',
          'Email Service Provider',
          emailConfig.provider,
          (value) => handleEmailChange('provider', value as 'aws' | 'twilio'),
          [
            { value: 'aws',    label: 'AWS SES' },
            { value: 'twilio', label: 'Twilio SendGrid' },
          ]
        )}

        {/* Readonly provider display */}
        {isEmailConfigured && !editMode.email && renderReadonlyField(
          'Email Service Provider',
          emailConfig.provider === 'aws' ? 'AWS SES' : 'Twilio SendGrid'
        )}

        {/* ── AWS SES fields ── */}
        {emailConfig.provider === 'aws' && (
          <div className="space-y-4">
            {(editMode.email || !isEmailConfigured) ? (
              <>
                {renderTextField(
                  'aws-access-key-id',
                  'AWS Access Key ID',
                  emailConfig.awsAccessKeyId,
                  (v) => handleEmailChange('awsAccessKeyId', v),
                  'AKIAIOSFODNN7EXAMPLE'
                )}

                {renderPasswordField(
                  'aws-secret-access-key',
                  'AWS Secret Access Key',
                  emailConfig.awsSecretAccessKey,
                  (v) => handleEmailChange('awsSecretAccessKey', v),
                  showSecrets.awsSecretAccessKey,
                  () => toggleSecretVisibility('awsSecretAccessKey'),
                  'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY'
                )}

                {renderSelectField(
                  'aws-region',
                  'AWS Region',
                  emailConfig.awsRegion,
                  (v) => handleEmailChange('awsRegion', v),
                  REGION_OPTIONS
                )}

                {renderTextField(
                  'ses-from-email',
                  'From Email',
                  emailConfig.sesFromEmail,
                  (v) => handleEmailChange('sesFromEmail', v),
                  'noreply@example.com'
                )}

                {renderTextField(
                  'ses-login-url',
                  'App Login URL',
                  emailConfig.sesLoginUrl,
                  (v) => handleEmailChange('sesLoginUrl', v),
                  'https://app.example.com/login'
                )}

                <div>
                  <Label
                    htmlFor="accept-incoming-emails"
                    className="text-sm font-medium text-gray-200 flex items-center gap-2 cursor-pointer"
                  >
                    <input
                      id="accept-incoming-emails"
                      type="checkbox"
                      checked={emailConfig.acceptIncomingEmails}
                      onChange={(e) => handleEmailChange('acceptIncomingEmails', e.target.checked)}
                      className="w-4 h-4 bg-[#0f1419] border border-gray-700 rounded text-cyan-400 focus:ring-2 focus:ring-cyan-400 cursor-pointer"
                    />
                    Accept Incoming Emails
                  </Label>
                </div>
              </>
            ) : (
              <>
                {renderReadonlyField('AWS Access Key ID', emailConfig.awsAccessKeyId)}

                {renderReadonlySecretField(
                  'aws-secret-readonly',
                  'AWS Secret Access Key',
                  emailConfig.awsSecretAccessKey,
                  showSecrets.awsSecretAccessKey,
                  () => toggleSecretVisibility('awsSecretAccessKey')
                )}

                {renderReadonlyField('AWS Region', REGION_LABELS[emailConfig.awsRegion] || emailConfig.awsRegion)}
                {renderReadonlyField('From Email', emailConfig.sesFromEmail)}
                {renderReadonlyField('App Login URL', emailConfig.sesLoginUrl)}

                <div>
                  <Label className="text-sm font-medium text-gray-200">Accept Incoming Emails</Label>
                  <div className="w-full mt-2 px-3.5 py-2.5 bg-[#0f1419]/50 border border-gray-700 rounded-lg text-white text-sm flex items-center gap-2">
                    {emailConfig.acceptIncomingEmails ? (
                      <><CheckCircle2 className="h-4 w-4 text-cyan-400" />Enabled</>
                    ) : (
                      <><AlertCircle className="h-4 w-4 text-gray-500" />Disabled</>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ── Twilio fields ── */}
        {emailConfig.provider === 'twilio' && (
          <div className="space-y-4">
            {(editMode.email || !isEmailConfigured) ? (
              <>
                {renderTextField(
                  'twilio-account-sid',
                  'Twilio Account SID',
                  emailConfig.twilioAccountSid,
                  (v) => handleEmailChange('twilioAccountSid', v),
                  'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                )}

                {renderPasswordField(
                  'twilio-auth-token',
                  'Twilio Auth Token',
                  emailConfig.twilioAuthToken,
                  (v) => handleEmailChange('twilioAuthToken', v),
                  showSecrets.twilioAuthToken,
                  () => toggleSecretVisibility('twilioAuthToken'),
                  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'
                )}

                {renderTextField(
                  'twilio-from-email',
                  'From Email Address',
                  emailConfig.twilioFromEmail,
                  (v) => handleEmailChange('twilioFromEmail', v),
                  'noreply@example.com'
                )}
              </>
            ) : (
              <>
                {renderReadonlyField('Twilio Account SID', emailConfig.twilioAccountSid)}

                {renderReadonlySecretField(
                  'twilio-auth-token-readonly',
                  'Twilio Auth Token',
                  emailConfig.twilioAuthToken,
                  showSecrets.twilioAuthToken,
                  () => toggleSecretVisibility('twilioAuthToken')
                )}

                {renderReadonlyField('From Email Address', emailConfig.twilioFromEmail)}
              </>
            )}
          </div>
        )}

        {/* ── Error message ── */}
        {saveEmailError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveEmailError}
          </div>
        )}

        {/* ── Save button — shown in edit/setup mode ── */}
        {(editMode.email || !isEmailConfigured) && (
          <button
            onClick={handleSave}
            disabled={isSavingEmail}
            className="w-full mt-2 px-4 py-2.5 bg-cyan-400 hover:bg-cyan-300 disabled:bg-cyan-400/50 disabled:cursor-not-allowed text-black font-medium text-sm rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {isSavingEmail ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4" />Save Email Config</>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}