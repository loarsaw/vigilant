import { useState } from "react";
import {
  History,
  AlertCircle,
  Loader2,
  RefreshCw,
  Shield,
  User,
  Cog,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuditLog } from "@/hooks/use-audit-log";
import { AuditLogFilters } from "@/hooks/types";

const ACTOR_ICON: Record<string, React.ElementType> = {
  admin: Shield,
  candidate: User,
  system: Cog,
};

const ACTOR_STYLE: Record<string, string> = {
  admin: "bg-primary/10 text-primary border-primary/20",
  candidate: "bg-muted text-muted-foreground border-border",
  system: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

function humanizeAction(action: string) {
  return action
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function AuditLogCard() {
  const [showSystem, setShowSystem] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const filters: AuditLogFilters = {
    ...(search ? { q: search } : {}),
    ...(!showSystem ? {} : {}),
  };

  const {
    entries,
    isLoading,
    isFetchingMore,
    isError,
    error,
    statusCode,
    hasMore,
    total,
    loadMore,
    refetch,
  } = useAuditLog(filters);

  const visibleEntries = showSystem ? entries : entries.filter((e) => e.actor_type !== "system");

  return (
    <Card className="border rounded-xl p-6 bg-card/40 border-border">
      {/* Header */}
      <div className="flex items-start gap-4 mb-6">
        <div className="p-2.5 bg-primary/10 rounded-lg shrink-0 border border-primary/20">
          <History className="h-6 w-6 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-lg font-semibold tracking-wide text-foreground">
            Audit Log
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Record of admin, candidate, and system actions across the platform
          </p>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search description or action..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-input border-border text-sm"
          />
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showSystem}
              onChange={(e) => setShowSystem(e.target.checked)}
              className="rounded border-border accent-primary"
            />
            Show system events
          </label>
          <button
            onClick={() => refetch()}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Body */}
      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading audit log...
        </div>
      ) : isError ? (
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-destructive/10 border border-destructive/30 rounded-md text-destructive text-sm">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>
            {error}
            {statusCode ? ` (HTTP ${statusCode})` : ""}
          </span>
        </div>
      ) : visibleEntries.length === 0 ? (
        <p className="text-sm text-muted-foreground py-6 text-center">
          No audit log entries found.
        </p>
      ) : (
        <>
          <div
            className="space-y-2 max-h-[32rem] overflow-y-auto pr-1
    [&::-webkit-scrollbar]:w-1.5
    [&::-webkit-scrollbar-track]:bg-transparent
    [&::-webkit-scrollbar-thumb]:bg-border
    [&::-webkit-scrollbar-thumb]:rounded-full
    hover:[&::-webkit-scrollbar-thumb]:bg-muted-foreground/50"
          >
            {visibleEntries.map((entry) => {
              const Icon = ACTOR_ICON[entry.actor_type] ?? Cog;
              const isExpanded = expandedId === entry.id;
              const hasDetails = !!entry.metadata && Object.keys(entry.metadata).length > 0;

              return (
                <div
                  key={entry.id}
                  className="bg-input/40 border border-border rounded-md text-sm overflow-hidden"
                >
                  <button
                    onClick={() => hasDetails && setExpandedId(isExpanded ? null : entry.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3.5 py-2.5 text-left ${
                      hasDetails ? "cursor-pointer hover:bg-input/60" : "cursor-default"
                    } transition-colors`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border shrink-0 ${ACTOR_STYLE[entry.actor_type]}`}
                      >
                        <Icon className="h-3 w-3" />
                        {entry.actor_type}
                      </span>
                      <span className="text-foreground truncate">
                        {entry.description || humanizeAction(entry.action)}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        {entry.actor_label}
                      </span>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(entry.created_at).toLocaleString()}
                      </span>
                      {hasDetails &&
                        (isExpanded ? (
                          <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                        ))}
                    </div>
                  </button>

                  {isExpanded && hasDetails && (
                    <div className="px-3.5 pb-3 pt-1 border-t border-border/60">
                      <pre className="text-xs bg-background/60 rounded-md p-3 overflow-x-auto text-muted-foreground">
                        {JSON.stringify(entry.metadata, null, 2)}
                      </pre>
                      {entry.ip_address && (
                        <p className="text-[11px] text-muted-foreground mt-2">
                          IP: {entry.ip_address}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
                `Load more (${entries.length} of ${total})`
              )}
            </button>
          )}
        </>
      )}
    </Card>
  );
}
