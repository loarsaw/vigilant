import { useEffect, useLayoutEffect, useRef, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { Rect, TourProps, TourStep } from "../types";
import { computeTooltipPosition } from "@/lib/utils";
import { TOOLTIP_WIDTH } from "@/lib/constants";

export function Tour({ steps, run, onFinish, padding = 8 }: TourProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  const rafRef = useRef<number>();

  const step = steps[stepIndex];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.target);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Reposition on scroll/resize while the tour is active
  useEffect(() => {
    if (!run) return;

    const el = step ? document.querySelector(step.target) : null;
    el?.scrollIntoView({ block: "center", behavior: "smooth" });

    const tick = () => {
      measure();
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [run, step, measure]);

  useLayoutEffect(() => {
    measure();
  }, [measure]);

  // Escape key skips the tour
  useEffect(() => {
    if (!run) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFinish();
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run, stepIndex]);

  if (!run || !step) return null;

  const next = () => {
    if (stepIndex >= steps.length - 1) {
      onFinish();
    } else {
      setStepIndex((i) => i + 1);
    }
  };

  const prev = () => setStepIndex((i) => Math.max(0, i - 1));

  const tooltipPos = rect ? computeTooltipPosition(rect, step.placement, padding) : null;

  return createPortal(
    <div className="fixed inset-0 z-[1000]" aria-live="polite">
      {/* Dimmed backdrop with a cut-out "spotlight" hole via box-shadow */}
      {rect ? (
        <div
          className="absolute rounded-md transition-all duration-200 ease-out pointer-events-none"
          style={{
            top: rect.top - padding,
            left: rect.left - padding,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            outline: "2px solid hsl(var(--primary))",
            outlineOffset: 2,
          }}
        />
      ) : (
        <div className="absolute inset-0 bg-black/65" />
      )}

      {/* Click-catcher so page underneath isn't interactive during the tour */}
      <div className="absolute inset-0" onClick={onFinish} />

      {/* Tooltip */}
      <div
        role="dialog"
        className="absolute flex flex-col gap-3 rounded-lg border p-4 shadow-xl animate-in fade-in zoom-in-95 duration-150"
        style={{
          top: tooltipPos?.top ?? "50%",
          left: tooltipPos?.left ?? "50%",
          transform: tooltipPos ? undefined : "translate(-50%, -50%)",
          width: TOOLTIP_WIDTH,
          background: "hsl(var(--popover))",
          color: "hsl(var(--popover-foreground))",
          borderColor: "hsl(var(--border))",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          {step.title && (
            <h3 className="font-display font-semibold tracking-wide text-sm">{step.title}</h3>
          )}
          <span className="text-xs text-muted-foreground ml-auto">
            {stepIndex + 1} / {steps.length}
          </span>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{step.content}</p>

        <div className="flex items-center justify-between pt-1">
          <button
            onClick={onFinish}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Skip tour
          </button>

          <div className="flex items-center gap-2">
            {stepIndex > 0 && (
              <button
                onClick={prev}
                className="px-3 py-1.5 text-xs rounded-md border border-border hover:bg-secondary transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={next}
              className="px-3 py-1.5 text-xs font-semibold rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              {stepIndex === steps.length - 1 ? "Done" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
