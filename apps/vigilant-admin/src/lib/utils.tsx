import { Badge } from "@/components/ui/badge";
import { TimelineEvent } from "@/hooks/types";
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  BarChart3,
  CalendarPlus,
  CalendarX,
  Circle,
  Github,
  Handshake,
  LogOut,
  Mail,
  Send,
  Sparkles,
  Star,
  Trash2,
  Trophy,
  Upload,
  Video,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { ReactNode } from "react";

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
  screening:
    "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border border-[hsl(var(--chart-1)/0.3)]",
  interviewing:
    "bg-[hsl(var(--chart-2)/0.15)] text-[hsl(var(--chart-2))] border border-[hsl(var(--chart-2)/0.3)]",
  offered:
    "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3)/0.3)]",
  hired:
    "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]",
  rejected: "bg-destructive/15 text-destructive border border-destructive/30",
  withdrawn: "bg-muted text-muted-foreground/70 border border-border",
};

// Badge color per github invite status (invited / accepted / failed / pending).
export const GITHUB_STATUS_STYLES: Record<string, string> = {
  invited:
    "bg-[hsl(var(--chart-1)/0.15)] text-[hsl(var(--chart-1))] border border-[hsl(var(--chart-1)/0.3)]",
  accepted:
    "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]",
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
      return "bg-[hsl(var(--chart-4)/0.15)] text-[hsl(var(--chart-4))] border border-[hsl(var(--chart-4)/0.3)]";
    case "completed":
      return "bg-muted text-muted-foreground border border-border";
    case "scheduled":
    default:
      return "bg-[hsl(var(--chart-3)/0.15)] text-[hsl(var(--chart-3))] border border-[hsl(var(--chart-3)/0.3)]";
  }
}

export const BADGE_TONE: Record<Tone, string> = {
  neutral: "bg-card text-muted-foreground border-border",
  primary: "bg-primary/10 text-primary border-primary/30",
  success:
    "bg-[hsl(var(--chart-4)/0.12)] text-[hsl(var(--chart-4))] border-[hsl(var(--chart-4)/0.35)]",
  danger: "bg-destructive/10 text-destructive border-destructive/30",
  warning: "bg-amber-500/10 text-amber-500 border-amber-500/30",
};

export const meta = (e: TimelineEvent, key: string) =>
  e.metadata?.[key] as string | number | undefined;

export const fmtScore = (v?: string | number) => (v == null ? undefined : Number(v).toFixed(1));

export const formatDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

export function relativeTime(iso: string) {
  const diffSec = (new Date(iso).getTime() - Date.now()) / 1000;
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["year", 31536000],
    ["month", 2592000],
    ["week", 604800],
    ["day", 86400],
    ["hour", 3600],
    ["minute", 60],
  ];
  for (const [unit, secs] of units) {
    if (Math.abs(diffSec) >= secs) return rtf.format(Math.round(diffSec / secs), unit);
  }
  return "just now";
}

export const cap = (s?: string | null) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join("");
}

export function actorName(e: TimelineEvent) {
  if (e.actor_type === "system") return "System";
  if (e.actor_name) return e.actor_name;
  return e.actor_type === "candidate" ? "Candidate" : "HR";
}

export const B = ({ children }: { children: ReactNode }) => (
  <span className="font-medium text-foreground">{children}</span>
);

interface Described {
  icon: LucideIcon;
  tone: Tone;
  sentence: ReactNode;
  detail?: string;
}

export function describe(e: TimelineEvent): Described {
  switch (e.type) {
    case "submitted":
      return { icon: Send, tone: "neutral", sentence: "submitted the application" };
    case "analyzed": {
      const s = fmtScore(meta(e, "score"));
      return {
        icon: Sparkles,
        tone: "neutral",
        sentence: s ? (
          <>
            analyzed the profile, score <B>{s}</B>
            {meta(e, "tier") && <> ({meta(e, "tier")})</>}
          </>
        ) : (
          "analyzed the profile"
        ),
      };
    }
    case "qualified":
      return { icon: BadgeCheck, tone: "primary", sentence: "marked the candidate as qualified" };
    case "assignment_emailed":
      return { icon: Mail, tone: "neutral", sentence: "emailed the assignment to the candidate" };
    case "github_invited":
      return {
        icon: Github,
        tone: "neutral",
        sentence: (
          <>
            invited the candidate to <B>{meta(e, "repo_name") ?? "the assignment repo"}</B>
          </>
        ),
      };
    case "github_invite_failed":
      return {
        icon: AlertTriangle,
        tone: "danger",
        sentence: "couldn't send the GitHub invite",
        detail: meta(e, "error") as string | undefined,
      };
    case "assignment_submitted":
      return { icon: Upload, tone: "neutral", sentence: "submitted the assignment" };
    case "assignment_scored": {
      const s = fmtScore(meta(e, "score"));
      return {
        icon: BarChart3,
        tone: "neutral",
        sentence: s ? (
          <>
            scored the assignment <B>{s}</B>
            {meta(e, "tier") && <> ({meta(e, "tier")})</>}
          </>
        ) : (
          "scored the assignment"
        ),
      };
    }
    case "shortlisted": {
      const s = fmtScore(meta(e, "score"));
      return {
        icon: Star,
        tone: "success",
        sentence: (
          <>
            <B>shortlisted</B> the candidate
            {s && (
              <>
                {" "}
                with an assignment score of <B>{s}</B>
              </>
            )}
          </>
        ),
      };
    }
    case "interview_scheduled": {
      const at = meta(e, "scheduled_at");
      const who = meta(e, "interviewer");
      return {
        icon: CalendarPlus,
        tone: "neutral",
        sentence: (
          <>
            scheduled a{meta(e, "interview_type") ? ` ${meta(e, "interview_type")}` : "n"} interview
            {who && (
              <>
                {" "}
                with <B>{who}</B>
              </>
            )}
            {at && (
              <>
                {" "}
                for <B>{formatDateTime(String(at))}</B>
              </>
            )}
          </>
        ),
      };
    }
    case "interview_completed": {
      const avg = fmtScore(meta(e, "avg_feedback_score"));
      return {
        icon: Video,
        tone: "neutral",
        sentence: (
          <>
            completed the interview
            {avg && (
              <>
                , average feedback <B>{avg}</B> / 100
              </>
            )}
          </>
        ),
      };
    }
    case "interview_cancelled":
      return {
        icon: CalendarX,
        tone: "warning",
        sentence: e.title.toLowerCase().includes("did not join")
          ? "recorded that the candidate did not join the interview"
          : "cancelled the interview",
      };
    case "repo_deleted":
      return { icon: Trash2, tone: "neutral", sentence: "deleted the assignment repo" };
    case "status_changed": {
      const to = e.to_status ?? "";
      const icon =
        to === "hired"
          ? Trophy
          : to === "offered"
            ? Handshake
            : to === "rejected"
              ? XCircle
              : to === "withdrawn"
                ? LogOut
                : ArrowRight;
      const tone: Tone =
        to === "hired" || to === "offered" ? "success" : to === "rejected" ? "danger" : "neutral";
      return {
        icon,
        tone,
        sentence: e.from_status ? (
          <>
            changed status from <B>{cap(e.from_status)}</B> to <B>{cap(to)}</B>
          </>
        ) : (
          <>
            set status to <B>{cap(to)}</B>
          </>
        ),
      };
    }
    default:
      return { icon: Circle, tone: "neutral", sentence: e.title.toLowerCase() };
  }
}

export type Tone = "neutral" | "primary" | "success" | "danger" | "warning";

export function TBadge({ event, d }: { event: TimelineEvent; d: Described }) {
  if (event.actor_type !== "system" && event.actor_name && d.tone === "neutral") {
    return (
      <div className="relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-[11px] font-semibold text-muted-foreground">
        {initials(event.actor_name)}
      </div>
    );
  }
  const Icon = d.icon;
  return (
    <div
      className={`relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border ${BADGE_TONE[d.tone]}`}
    >
      <Icon className="h-3.5 w-3.5" />
    </div>
  );
}
