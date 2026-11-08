// src/components/admin-settings/slack.tsx
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Slack as SlackIcon,
  AlertCircle,
  CheckCircle2,
  Edit3,
  Loader2,
  Save,
  Send,
  CalendarClock,
  Unplug,
  Minus,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useSlack } from "@/hooks/use-slack";
import { getSlackWebhookError } from "@/lib/validators";
import { PasswordField, ReadonlyField, SelectField } from "./form-field";
import { SlackCardProps } from "./types";

const FALLBACK_TIMEZONES = [
  "UTC",
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
];

function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function getTimezones(...ensure: (string | undefined)[]): string[] {
  let zones: string[] = [];
  try {
    zones =
      (Intl as unknown as { supportedValuesOf?: (k: string) => string[] }).supportedValuesOf?.(
        "timeZone",
      ) ?? [];
  } catch {
    zones = [];
  }
  if (!zones.length) zones = FALLBACK_TIMEZONES;
  const set = new Set(zones);
  // A saved or browser-detected zone must always be selectable, even if the
  // runtime's list doesn't include it (e.g. "UTC").
  for (const z of ensure) if (z) set.add(z);
  return Array.from(set).sort();
}

function formatHour(hour: number): string {
  return new Date(2000, 0, 1, hour, 0).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => ({
  value: String(h),
  label: formatHour(h),
}));

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-3 bg-input/50 border border-border rounded-md">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-foreground cursor-pointer">
          {label}
        </label>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function StatusRow({ label, on, detail }: { label: string; on: boolean; detail?: string }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {on ? (
        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
      ) : (
        <Minus className="h-4 w-4 text-muted-foreground/50 shrink-0" />
      )}
      <span className={on ? "text-foreground" : "text-muted-foreground"}>{label}</span>
      {on && detail && <span className="text-muted-foreground">· {detail}</span>}
    </div>
  );
}

function Banner({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  const styles =
    tone === "error"
      ? "bg-destructive/10 border-destructive/30 text-destructive"
      : "bg-primary/10 border-primary/30 text-primary";
  const Icon = tone === "error" ? AlertCircle : CheckCircle2;
  return (
    <div className={`flex items-start gap-2 px-3.5 py-2.5 border rounded-md text-sm ${styles}`}>
      <Icon className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="min-w-0 break-words">{children}</div>
    </div>
  );
}

export function SlackCard({ editMode, setEditMode }: SlackCardProps) {
  const {
    slackConfig,
    isLoadingSlack,
    isSlackConfigured,
    saveSlackConfig,
    isSavingSlack,
    saveSlackError,
    saveSlackSuccess,
    resetSaveSlack,
    disconnectSlack,
    isDisconnectingSlack,
    disconnectSlackError,
    testSlack,
    isTestingSlack,
    testSlackError,
    testSlackSuccess,
    testSlackKind,
    resetTestSlack,
  } = useSlack();

  const [webhook, setWebhook] = useState("");
  const [showWebhook, setShowWebhook] = useState(false);
  const [webhookTouched, setWebhookTouched] = useState(false);
  const [notifyShortlisted, setNotifyShortlisted] = useState(true);
  const [notifyHired, setNotifyHired] = useState(true);
  const [digestEnabled, setDigestEnabled] = useState(true);
  const [digestHour, setDigestHour] = useState(18);
  const [timezone, setTimezone] = useState(browserTimezone());
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const timezones = useMemo(
    () => getTimezones(slackConfig?.timezone, timezone, browserTimezone()),
    [slackConfig?.timezone, timezone],
  );

  const loadFormFromConfig = useCallback(() => {
    setWebhook("");
    setWebhookTouched(false);
    setShowWebhook(false);
    setNotifyShortlisted(slackConfig?.notify_shortlisted ?? true);
    setNotifyHired(slackConfig?.notify_hired ?? true);
    setDigestEnabled(slackConfig?.daily_digest_enabled ?? true);
    setDigestHour(slackConfig?.daily_digest_hour ?? 18);
    setTimezone(slackConfig?.timezone ?? browserTimezone());
  }, [slackConfig]);

  // Re-sync the form only when the settings were actually saved on the server
  // (updated_at changes). Test messages also refresh `slackConfig` (to update
  // delivery health) and must NOT wipe what the admin is typing.
  useEffect(() => {
    if (isLoadingSlack) return;
    loadFormFromConfig();
    setEditMode((prev) => ({ ...prev, slack: !isSlackConfigured }));
    setConfirmDisconnect(false);
  }, [isLoadingSlack, isSlackConfigured, slackConfig?.updated_at]);

  useEffect(() => {
    if (saveSlackSuccess) {
      setEditMode((prev) => ({ ...prev, slack: false }));
      resetTestSlack();
    }
  }, [saveSlackSuccess]);

  const isEditing = editMode.slack || !isSlackConfigured;

  // Required on first setup; on later edits blank means "keep the current one".
  const webhookError = webhook
    ? getSlackWebhookError(webhook)
    : !isSlackConfigured
      ? "Webhook URL is required"
      : null;
  const shownWebhookError = webhookTouched ? webhookError : null;

  const handleSave = () => {
    setWebhookTouched(true);
    if (webhookError) return;
    resetSaveSlack();
    saveSlackConfig({
      webhook_url: webhook.trim() || undefined,
      notify_shortlisted: notifyShortlisted,
      notify_hired: notifyHired,
      daily_digest_enabled: digestEnabled,
      daily_digest_hour: digestHour,
      timezone,
    });
  };

  const handleToggleEdit = () => {
    if (editMode.slack) {
      loadFormFromConfig(); // Cancel: discard unsaved changes
      resetSaveSlack();
      resetTestSlack();
    }
    setConfirmDisconnect(false);
    setEditMode((prev) => ({ ...prev, slack: !prev.slack }));
  };

  const handleTestPing = () => {
    resetTestSlack();
    if (isEditing && webhook) {
      setWebhookTouched(true);
      if (getSlackWebhookError(webhook)) return;
      testSlack({ kind: "ping", webhook_url: webhook.trim() });
    } else if (isSlackConfigured) {
      testSlack({ kind: "ping" });
    } else {
      setWebhookTouched(true);
    }
  };

  const handleTestDigest = () => {
    resetTestSlack();
    testSlack({ kind: "digest" });
  };

  if (isLoadingSlack) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Loading Slack configuration...</span>
      </div>
    );
  }

  const canTestPing =
    !isTestingSlack && (isSlackConfigured || (!!webhook && !getSlackWebhookError(webhook)));

  return (
    <Card className="border rounded-xl p-6 bg-card/80 border-border">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0 border border-primary/20">
          <SlackIcon className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
            Slack
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Get shortlist and hire alerts, plus a daily hiring digest, in a Slack channel
          </p>
        </div>
        {isSlackConfigured && (
          <button
            onClick={handleToggleEdit}
            className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2 shrink-0 font-display font-semibold tracking-wide"
          >
            <Edit3 className="h-4 w-4" />
            {editMode.slack ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {/* ---------- delivery health (only once connected) ---------- */}
        {isSlackConfigured && slackConfig?.last_error && (
          <Banner tone="error">
            <p className="font-medium">Last Slack delivery failed</p>
            <p className="mt-0.5">{slackConfig.last_error}</p>
            {slackConfig.last_error_at && (
              <p className="text-xs opacity-80 mt-1">
                {new Date(slackConfig.last_error_at).toLocaleString()}
              </p>
            )}
          </Banner>
        )}

        {isEditing ? (
          <>
            <div>
              <PasswordField
                id="slack-webhook"
                label="Incoming Webhook URL"
                value={webhook}
                onChange={(v) => {
                  setWebhook(v);
                  resetTestSlack();
                }}
                showSecret={showWebhook}
                toggleShow={() => setShowWebhook((p) => !p)}
                placeholder={
                  isSlackConfigured
                    ? "Leave blank to keep the current webhook"
                    : "https://hooks.slack.com/services/T000…/B000…/xxxx"
                }
                onBlur={() => setWebhookTouched(true)}
                error={shownWebhookError}
              />
              {!shownWebhookError && (
                <p className="text-xs text-muted-foreground/70 mt-1.5">
                  In Slack: Apps → <span className="text-muted-foreground">Incoming Webhooks</span>{" "}
                  → Add to Slack → choose a channel → copy the Webhook URL.
                  {isSlackConfigured && (
                    <>
                      {" "}
                      Current:{" "}
                      <code className="mono text-muted-foreground">
                        {slackConfig?.webhook_url_masked}
                      </code>
                    </>
                  )}
                </p>
              )}
            </div>

            <div className="space-y-2.5 pt-1">
              <p className="text-sm font-medium text-foreground">Notify me when</p>
              <ToggleRow
                id="slack-notify-shortlisted"
                label="A candidate is shortlisted"
                description="Sent right after a candidate clears the assignment score."
                checked={notifyShortlisted}
                onChange={setNotifyShortlisted}
              />
              <ToggleRow
                id="slack-notify-hired"
                label="A candidate is marked as hired"
                description="Sent when an application's status changes to Hired."
                checked={notifyHired}
                onChange={setNotifyHired}
              />
              <ToggleRow
                id="slack-digest"
                label="Daily hiring digest"
                description="Applications per position, plus who was shortlisted and hired."
                checked={digestEnabled}
                onChange={setDigestEnabled}
              />
            </div>

            {digestEnabled && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <SelectField
                  id="slack-digest-hour"
                  label="Send digest at"
                  value={String(digestHour)}
                  onChange={(v) => setDigestHour(Number(v))}
                  options={HOUR_OPTIONS}
                />
                <SelectField
                  id="slack-digest-tz"
                  label="Timezone"
                  value={timezone}
                  onChange={setTimezone}
                  options={timezones.map((z) => ({ value: z, label: z.replace(/_/g, " ") }))}
                />
              </div>
            )}
          </>
        ) : (
          <>
            <ReadonlyField
              label="Incoming Webhook URL"
              value={slackConfig?.webhook_url_masked ?? ""}
            />
            <div className="space-y-2.5 px-3.5 py-3 bg-input/50 border border-border rounded-md">
              <StatusRow label="Candidate shortlisted" on={!!slackConfig?.notify_shortlisted} />
              <StatusRow label="Candidate hired" on={!!slackConfig?.notify_hired} />
              <StatusRow
                label="Daily hiring digest"
                on={!!slackConfig?.daily_digest_enabled}
                detail={
                  slackConfig?.daily_digest_hour !== undefined
                    ? `${formatHour(slackConfig.daily_digest_hour)} ${slackConfig.timezone ?? ""}`
                    : undefined
                }
              />
            </div>
            <p className="text-xs text-muted-foreground/70">
              {slackConfig?.last_success_at
                ? `Last delivered ${new Date(slackConfig.last_success_at).toLocaleString()}`
                : "No messages delivered yet — send a test message to verify the connection."}
              {slackConfig?.updated_at &&
                ` · Settings updated ${new Date(slackConfig.updated_at).toLocaleString()}`}
            </p>
          </>
        )}

        {/* ---------- feedback ---------- */}
        {testSlackSuccess && (
          <Banner tone="success">
            {testSlackKind === "digest"
              ? "Test digest sent — check your Slack channel."
              : "Test message sent — check your Slack channel."}
          </Banner>
        )}
        {testSlackError && <Banner tone="error">{testSlackError}</Banner>}
        {saveSlackError && <Banner tone="error">{saveSlackError}</Banner>}
        {disconnectSlackError && <Banner tone="error">{disconnectSlackError}</Banner>}

        {/* ---------- actions ---------- */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleTestPing}
            disabled={!canTestPing}
            className="px-3.5 py-2 text-sm border border-border hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-md transition-colors flex items-center gap-2 font-display font-semibold tracking-wide"
          >
            {isTestingSlack && testSlackKind === "ping" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send test message
          </button>

          {isSlackConfigured && !isEditing && (
            <button
              type="button"
              onClick={handleTestDigest}
              disabled={isTestingSlack}
              className="px-3.5 py-2 text-sm border border-border hover:bg-muted/40 disabled:opacity-50 disabled:cursor-not-allowed text-foreground rounded-md transition-colors flex items-center gap-2 font-display font-semibold tracking-wide"
            >
              {isTestingSlack && testSlackKind === "digest" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CalendarClock className="h-4 w-4" />
              )}
              Send test digest
            </button>
          )}

          {isSlackConfigured && (
            <div className="ml-auto">
              {confirmDisconnect ? (
                <span className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Stop all Slack messages?</span>
                  <button
                    type="button"
                    onClick={() => disconnectSlack()}
                    disabled={isDisconnectingSlack}
                    className="px-3 py-1.5 bg-destructive hover:bg-destructive/90 disabled:opacity-60 text-destructive-foreground rounded-md font-display font-semibold tracking-wide flex items-center gap-2"
                  >
                    {isDisconnectingSlack && <Loader2 className="h-4 w-4 animate-spin" />}
                    Disconnect
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDisconnect(false)}
                    className="px-3 py-1.5 text-muted-foreground hover:text-foreground"
                  >
                    Keep
                  </button>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDisconnect(true)}
                  className="px-3 py-1.5 text-sm text-muted-foreground hover:text-destructive transition-colors flex items-center gap-2"
                >
                  <Unplug className="h-4 w-4" />
                  Disconnect
                </button>
              )}
            </div>
          )}
        </div>

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSavingSlack || (!isSlackConfigured && !webhook)}
            className="w-full mt-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-display font-semibold tracking-wide text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
          >
            {isSavingSlack ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save Slack Settings
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}
