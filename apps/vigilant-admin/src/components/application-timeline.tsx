import {
  Loader2,
} from "lucide-react";
import {  useApplicationTimeline } from "@/hooks/use-application-timeline";
import { actorName, B, describe, formatDateTime, relativeTime, TBadge } from "@/lib/utils";

export function ApplicationTimeline({ applicationId }: { applicationId: string }) {
  const { data, isLoading, isError, error } = useApplicationTimeline(applicationId);
  const events = [...(data?.events ?? [])].reverse();

  return (
    <section aria-labelledby="activity-heading" className="pt-2">
      <h3
        id="activity-heading"
        className="font-display text-lg font-semibold tracking-wide text-foreground mb-4"
      >
        Activity
      </h3>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading activity...
        </div>
      ) : isError ? (
        <p className="text-destructive text-sm">Couldn't load activity: {error?.message}</p>
      ) : events.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No activity recorded for this application yet.
        </p>
      ) : (
        <ol className="relative">
          {/* the single vertical rail */}
          <span aria-hidden className="absolute left-[13px] top-2 bottom-2 w-px bg-border" />

          {events.map((event) => {
            const d = describe(event);
            const approximate = event.metadata?.approximate_time === true;

            return (
              <li key={event.id} className="relative flex items-start gap-3 py-2.5">
                <TBadge event={event} d={d} />

                <div className="min-w-0 flex-1 pt-1 text-sm leading-relaxed">
                  <p className="text-muted-foreground">
                    <B>{actorName(event)}</B> {d.sentence}
                    <span className="mx-1.5 text-muted-foreground/50">·</span>
                    <time
                      dateTime={event.occurred_at}
                      title={formatDateTime(event.occurred_at)}
                      className="text-muted-foreground/70"
                    >
                      {approximate && "≈ "}
                      {relativeTime(event.occurred_at)}
                    </time>
                  </p>

                  {(d.detail || event.description) && (
                    <p className="mt-1 text-foreground/70 whitespace-pre-wrap">
                      {d.detail ?? event.description}
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
