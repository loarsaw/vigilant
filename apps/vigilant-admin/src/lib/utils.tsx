import { Badge } from "@/components/ui/badge";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const formatDate = (dateString: string) => {
  if (!dateString) return "—";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays > 1) return `in ${diffDays} days`;
  if (diffHours > 0) return `in ${diffHours}h`;
  if (diffHours > -24) return "Today";
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

export const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; className: string }> = {
    scheduled: {
      label: "Scheduled",
      className:
        "bg-info/15 text-info border border-info/30",
    },
    in_progress: {
      label: "In Progress",
      className:
        "bg-success/15 text-success border border-success/30",
    },
    completed: {
      label: "Completed",
      className: "bg-muted text-muted-foreground border border-border",
    },
  };
  const config = statusConfig[status] ?? statusConfig.scheduled;
  return (
    <Badge className={`font-medium ${config.className}`}>
      {config.label}
    </Badge>
  );
};

// Badge color per application status
export const STATUS_STYLES: Record<string, string> = {
  applied: "bg-muted text-muted-foreground border border-border",
  screening:
    "bg-info/15 text-info border border-info/30",
  interviewing:
    "bg-primary/15 text-primary border border-primary/30",
  offered:
    "bg-warning/15 text-warning border border-warning/30",
  hired:
    "bg-success/15 text-success border border-success/30",
  rejected: "bg-destructive/15 text-destructive border border-destructive/30",
  withdrawn: "bg-muted text-muted-foreground/70 border border-border",
};

// Badge color per github invite status (invited / accepted / failed / pending).
export const GITHUB_STATUS_STYLES: Record<string, string> = {
  invited:
    "bg-info/15 text-info border border-info/30",
  accepted:
    "bg-success/15 text-success border border-success/30",
  failed: "bg-destructive/15 text-destructive border border-destructive/30",
  pending: "bg-muted text-muted-foreground border border-border",
};

export function formatStatus(status: string) {
  if (!status) return "Unknown";
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function statusBadgeClass(status: string) {
  switch (status) {
    case "in_progress":
      return "bg-success/15 text-success border border-success/30";
    case "completed":
      return "bg-muted text-muted-foreground border border-border";
    case "scheduled":
    default:
      return "bg-warning/15 text-warning border border-warning/30";
  }
}
