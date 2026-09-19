// src/components/settings/retention/RetentionCard.tsx
import { useState, useEffect } from "react";
import {
  Trash2,
  AlertCircle,
  Edit3,
  Save,
  Loader2,
  ShieldCheck,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useRetention, useRetentionRuns } from "@/hooks/use-retention";

const ENTITY_TYPE = "job_applications";

export function RetentionCard({
  editMode,
  setEditMode,
}: {
  editMode: { retention: boolean };
  setEditMode: React.Dispatch<React.SetStateAction<any>>;
}) {
  const {
    jobApplicationsPolicy: fetchedPolicy,
    isRetentionConfigured,
    isLoadingRetention,
    saveRetentionPolicy,
    isSavingRetention,
    saveRetentionError,
    saveRetentionSuccess,
  } = useRetention();

  const [showRuns, setShowRuns] = useState(false);
  const {
    runs,
    isLoadingRuns,
    isFetchingMore,
    isRunsError,
    runsError,
    runsStatusCode,
    hasMore,
    total,
    loadMore,
    statusFilter,
    setFilter,
    refetchRuns,
  } = useRetentionRuns(ENTITY_TYPE, showRuns);

  const [form, setForm] = useState({
    retentionDays: "45",
    referenceColumn: "applied_at",
    deleteOrphanedCandidate: true,
    isActive: true,
  });

  useEffect(() => {
    if (fetchedPolicy) {
      setForm({
        retentionDays: String(fetchedPolicy.retention_days),
        referenceColumn: fetchedPolicy.reference_column,
        deleteOrphanedCandidate: fetchedPolicy.delete_orphaned_candidate,
        isActive: fetchedPolicy.is_active,
      });
    }
  }, [fetchedPolicy]);

  useEffect(() => {
    if (saveRetentionSuccess) {
      setEditMode((prev: any) => ({ ...prev, retention: false }));
    }
  }, [saveRetentionSuccess, setEditMode]);

  const handleSave = () => {
    const days = parseInt(form.retentionDays, 10);
    if (!days || days < 1) return;

    saveRetentionPolicy(ENTITY_TYPE, {
      retention_days: days,
      reference_column: form.referenceColumn,
      delete_orphaned_candidate: form.deleteOrphanedCandidate,
      is_active: form.isActive,
    });
  };

  if (isLoadingRetention) {
    return (
      <Card className="border rounded-xl p-6 bg-card/40 border-primary/30">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <span className="text-sm">Loading retention policy...</span>
        </div>
      </Card>
    );
  }

  const isEditing = editMode.retention || !isRetentionConfigured;

  return (
    <div className="space-y-4">
      {/* ============ MAIN CONFIG CARD ============ */}
      <Card
        className={`border rounded-xl p-6 transition-colors ${
          isEditing ? "bg-card/80 border-border" : "bg-card/40 border-primary/30"
        }`}
      >
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-2.5 bg-primary/10 rounded-lg shrink-0 border border-primary/20">
            <Trash2 className="h-6 w-6 text-primary" />
          </div>
          <div className="flex-1">
            <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
              Data Retention
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              {isRetentionConfigured && !editMode.retention
                ? "Configured • Click Edit to modify"
                : "Automatically prune old applications, candidates, and assignment repos"}
            </p>
          </div>
          {isRetentionConfigured && (
            <button
              onClick={() =>
                setEditMode((prev: any) => ({ ...prev, retention: !prev.retention }))
              }
              className="px-3 py-1.5 text-sm bg-primary/10 hover:bg-primary/20 text-primary rounded-md transition-colors flex items-center gap-2 font-display font-semibold tracking-wide"
            >
              <Edit3 className="h-4 w-4" />
              {editMode.retention ? "Cancel" : "Edit"}
            </button>
          )}
        </div>

        <div className="space-y-4 border-t border-border pt-6">
          {isEditing ? (
            <>
              <div>
                <Label htmlFor="retention-days" className="text-sm font-medium text-foreground">
                  Delete applications after (days)
                </Label>
                <Input
                  id="retention-days"
                  type="number"
                  min={1}
                  placeholder="45"
                  value={form.retentionDays}
                  onChange={(e) => setForm((p) => ({ ...p, retentionDays: e.target.value }))}
                  className="w-full mt-2 bg-input border border-border text-foreground placeholder:text-muted-foreground/60 text-sm py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Counted from when the candidate applied. Applications marked "do not prune"
                  are always skipped.
                </p>
              </div>

              <div className="flex items-center justify-between px-3.5 py-3 bg-input/40 border border-border rounded-md">
                <div>
                  <p className="text-sm font-medium text-foreground">Delete orphaned candidates</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    If a candidate has no applications left after pruning, remove them too
                  </p>
                </div>
                <Switch
                  checked={form.deleteOrphanedCandidate}
                  onCheckedChange={(v) =>
                    setForm((p) => ({ ...p, deleteOrphanedCandidate: v }))
                  }
                />
              </div>

              <div className="flex items-center justify-between px-3.5 py-3 bg-input/40 border border-border rounded-md">
                <div>
                  <p className="text-sm font-medium text-foreground">Enable auto-pruning</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Turn off to pause the cron without losing your configured values
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) => setForm((p) => ({ ...p, isActive: v }))}
                />
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-input/50 border border-border rounded-md">
                <span className="text-sm text-muted-foreground">Retention period</span>
                <span className="text-sm font-medium text-foreground">
                  {form.retentionDays} days after apply date
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-input/50 border border-border rounded-md">
                <span className="text-sm text-muted-foreground">Delete orphaned candidates</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {form.deleteOrphanedCandidate ? (
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {form.deleteOrphanedCandidate ? "Yes" : "No"}
                </span>
              </div>
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-input/50 border border-border rounded-md">
                <span className="text-sm text-muted-foreground">Status</span>
                <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                  {form.isActive ? (
                    <ShieldCheck className="h-4 w-4 text-primary" />
                  ) : (
                    <XCircle className="h-4 w-4 text-muted-foreground" />
                  )}
                  {form.isActive ? "Active" : "Paused"}
                </span>
              </div>
              {fetchedPolicy?.last_run_at && (
                <div className="flex items-center justify-between px-3.5 py-2.5 bg-input/50 border border-border rounded-md">
                  <span className="text-sm text-muted-foreground">Last run</span>
                  <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    {new Date(fetchedPolicy.last_run_at).toLocaleString()}
                  </span>
                </div>
              )}
            </>
          )}

          {saveRetentionError && (
            <div className="flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {saveRetentionError}
            </div>
          )}

          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSavingRetention}
              className="w-full mt-2 px-4 py-2.5 bg-primary hover:bg-primary/90 disabled:bg-primary/50 disabled:cursor-not-allowed text-primary-foreground font-display font-semibold tracking-wide text-sm rounded-md transition-colors flex items-center justify-center gap-2 shadow-[0_4px_16px_-4px_hsl(var(--primary)/0.5)]"
            >
              {isSavingRetention ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Retention Policy
                </>
              )}
            </button>
          )}
        </div>
      </Card>

      {/* ============ RUN HISTORY — always rendered last, at the bottom ============ */}
      {isRetentionConfigured && (
        <Card className="border rounded-xl p-6 bg-card/40 border-border">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowRuns((p) => !p)}
              className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
            >
              <History className="h-4 w-4" />
              {showRuns ? "Hide" : "Show"} recent prune runs
              {total > 0 && <span className="text-muted-foreground font-normal">({total})</span>}
            </button>

            {showRuns && (
              <div className="flex items-center gap-3">
                <select
                  value={statusFilter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="text-xs bg-input border border-border rounded-md px-2 py-1 text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="failed">Failed</option>
                  <option value="running">Running</option>
                </select>
                <button
                  onClick={() => refetchRuns()}
                  disabled={isLoadingRuns}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isLoadingRuns ? "animate-spin" : ""}`} />
                  Refresh
                </button>
              </div>
            )}
          </div>

          {showRuns && (
            <div className="mt-4">
              {isLoadingRuns ? (
                <div className="flex items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading history...
                </div>
              ) : isRunsError ? (
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    {runsError}
                    {runsStatusCode ? ` (HTTP ${runsStatusCode})` : ""}
                  </span>
                </div>
              ) : runs.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prune runs recorded yet.</p>
              ) : (
                <>
                  <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                    {runs.map((run) => (
                      <div
                        key={run.id}
                        className="flex items-center justify-between px-3.5 py-2.5 bg-input/40 border border-border rounded-md text-sm"
                      >
                        <div className="flex items-center gap-2">
                          {run.status === "completed" && (
                            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                          )}
                          {run.status === "failed" && (
                            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                          )}
                          {run.status === "running" && (
                            <Loader2 className="h-4 w-4 text-muted-foreground animate-spin shrink-0" />
                          )}
                          <span className="text-foreground">
                            {new Date(run.run_started_at).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-muted-foreground text-xs">
                          {run.applications_deleted} apps · {run.candidates_deleted} candidates ·{" "}
                          {run.repos_deleted} repos
                          {run.repo_deletion_failures > 0 && (
                            <span className="text-destructive">
                              {" "}
                              · {run.repo_deletion_failures} repo errors
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {hasMore && (
                    <button
                      onClick={loadMore}
                      disabled={isFetchingMore}
                      className="w-full mt-3 py-2 text-sm text-primary hover:text-primary/80 flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {isFetchingMore ? (
                        <>
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load more"
                      )}
                    </button>
                  )}
                </>
              )}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}