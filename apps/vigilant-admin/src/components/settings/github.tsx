// src/components/settings/github.tsx
import { useState, useEffect } from "react";
import { Github, Eye, EyeOff, AlertCircle, Edit3, Save, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useGithub } from "@/hooks/use-github";
import { getGithubOrgNameError, getGithubTokenError } from "@/lib/validators";
interface GithubCardProps {
  editMode: Record<string, boolean>;
  setEditMode: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function GithubCard({ editMode, setEditMode }: GithubCardProps) {
  const {
    githubConfig,
    isLoadingGithub,
    isGithubConfigured,
    saveGithubConfig,
    isSavingGithub,
    saveGithubError,
    saveGithubSuccess,
  } = useGithub();

  const [orgName, setOrgName] = useState("");
  const [token, setToken] = useState("");
  const [showToken, setShowToken] = useState(false);

  const [orgTouched, setOrgTouched] = useState(false);
  const [tokenTouched, setTokenTouched] = useState(false);

  const orgError = orgTouched ? getGithubOrgNameError(orgName) : null;
  const tokenError = tokenTouched ? getGithubTokenError(token) : null;
  const isFormValid = !getGithubOrgNameError(orgName) && !getGithubTokenError(token);

  useEffect(() => {
    if (isGithubConfigured && githubConfig?.org_name) {
      setOrgName(githubConfig.org_name);
      setEditMode((prev) => ({ ...prev, github: false }));
    } else {
      setEditMode((prev) => ({ ...prev, github: true }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [githubConfig, isGithubConfigured]);

  useEffect(() => {
    if (saveGithubSuccess) {
      setEditMode((prev) => ({ ...prev, github: false }));
      setToken("");
      setOrgTouched(false);
      setTokenTouched(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveGithubSuccess]);

  const isEditing = editMode.github || !isGithubConfigured;

  const handleSave = () => {
    setOrgTouched(true);
    setTokenTouched(true);
    if (!isFormValid) return;
    saveGithubConfig({ org_name: orgName.trim(), token: token.trim() });
  };

  if (isLoadingGithub) {
    return (
      <div className="flex items-center gap-3 text-muted-foreground py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <span className="text-sm">Loading GitHub configuration...</span>
      </div>
    );
  }

  return (
    <Card className="border rounded-xl p-6 bg-card/80 border-border">
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0 border border-primary/20">
          <Github className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
            GitHub
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect a GitHub organization to push generated code
          </p>
        </div>
        {isGithubConfigured && (
          <button
            onClick={() => setEditMode((prev) => ({ ...prev, github: !prev.github }))}
            className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2 shrink-0 font-display font-semibold tracking-wide"
          >
            <Edit3 className="h-4 w-4" />
            {editMode.github ? "Cancel" : "Edit"}
          </button>
        )}
      </div>

      <div className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <Label htmlFor="github-org-name" className="text-sm font-medium text-foreground">
                Organization Name
              </Label>
              <Input
                id="github-org-name"
                type="text"
                placeholder="Oraganization Name"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                onBlur={() => setOrgTouched(true)}
                aria-invalid={!!orgError}
                className={`w-full mt-2 bg-input border text-foreground placeholder:text-muted-foreground/60 text-sm py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 transition-colors ${
                  orgError
                    ? "border-destructive/50 focus:ring-destructive focus:border-destructive"
                    : "border-border focus:ring-ring focus:border-primary"
                }`}
              />
              {orgError && <p className="text-xs text-destructive mt-1.5">{orgError}</p>}
            </div>

            <div>
              <Label htmlFor="github-token" className="text-sm font-medium text-foreground">
                Personal Access Token
              </Label>
              <div className="relative mt-2">
                <Input
                  id="github-token"
                  type={showToken ? "text" : "password"}
                  placeholder={
                    isGithubConfigured
                      ? "Enter a new token to replace the existing one"
                      : "ghp_xxxxxxxxxxxxxxxxxxxx"
                  }
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  onBlur={() => setTokenTouched(true)}
                  aria-invalid={!!tokenError}
                  className={`w-full bg-input border text-foreground placeholder:text-muted-foreground/60 text-sm pr-10 py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 transition-colors ${
                    tokenError
                      ? "border-destructive/50 focus:ring-destructive focus:border-destructive"
                      : "border-border focus:ring-ring focus:border-primary"
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowToken((p) => !p)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {tokenError ? (
                <p className="text-xs text-destructive mt-1.5">{tokenError}</p>
              ) : (
                <p className="text-xs text-muted-foreground/70 mt-1.5">
                  Requires <code className="text-muted-foreground mono">repo</code> scope for the
                  target org.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <div>
              <Label className="text-sm font-medium text-foreground">Organization Name</Label>
              <div className="w-full mt-2 px-3.5 py-2.5 bg-input/50 border border-border rounded-md text-foreground text-sm">
                {orgName || "—"}
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium text-foreground">Personal Access Token</Label>
              <div className="w-full mt-2 px-3.5 py-2.5 bg-input/50 border border-border rounded-md text-foreground text-sm">
                {githubConfig?.has_token ? "••••••••••••••••" : "Not set"}
              </div>
            </div>
            {githubConfig?.updated_at && (
              <p className="text-xs text-muted-foreground/70">
                Last updated {new Date(githubConfig.updated_at).toLocaleString()}
              </p>
            )}
          </>
        )}

        {saveGithubError && (
          <div className="flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {saveGithubError}
          </div>
        )}

        {isEditing && (
          <button
            onClick={handleSave}
            disabled={isSavingGithub || !orgName || !token}
            className="w-full mt-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-display font-semibold tracking-wide text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
          >
            {isSavingGithub ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Save GitHub Config
              </>
            )}
          </button>
        )}
      </div>
    </Card>
  );
}
