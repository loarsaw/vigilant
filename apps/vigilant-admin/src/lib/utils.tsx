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
        "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border border-[hsl(var(--chart-1)/0.3)]",
    },
    in_progress: {
      label: "In Progress",
      className:
        "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]",
    },
    completed: {
      label: "Completed",
      className: "bg-muted text-muted-foreground border border-border",
    },
  };
  const config = statusConfig[status] ?? statusConfig.scheduled;
  return (
    <Badge className={`font-display font-semibold tracking-wide ${config.className}`}>
      {config.label}
    </Badge>
  );
};


// Badge color per application status 
export const STATUS_STYLES: Record<string, string> = {
  applied: "bg-muted text-muted-foreground border border-border",
  screening: "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border border-[hsl(var(--chart-1)/0.3)]",
  interviewing: "bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))] border border-[hsl(var(--chart-2)/0.3)]",
  offered: "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3)/0.3)]",
  hired: "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]",
  rejected: "bg-destructive/15 text-destructive border border-destructive/30",
  withdrawn: "bg-muted text-muted-foreground/70 border border-border",
};

// Badge color per github invite status (invited / accepted / failed / pending).
export const GITHUB_STATUS_STYLES: Record<string, string> = {
  invited: "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border border-[hsl(var(--chart-1)/0.3)]",
  accepted: "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]",
  failed: "bg-destructive/15 text-destructive border border-destructive/30",
  pending: "bg-muted text-muted-foreground border border-border",
};


