import { Label } from "@radix-ui/react-label";
import { Lock, ShieldAlert } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./ui/button";

const CODE_LENGTH = 8;

function LoginCodePanel({
  onSubmit,
  isSubmitting,
  errorMessage,
}: {
  onSubmit: (code: string) => void;
  isSubmitting?: boolean;
  errorMessage?: string;
}) {
  const [chars, setChars] = useState<string[]>(Array(CODE_LENGTH).fill(""));
  const [localError, setLocalError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputRefs.current[0]?.focus();
  }, []);

  const sanitize = (val: string) => val.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();

  const handleChange = (val: string, idx: number) => {
    const char = sanitize(val).slice(-1);
    const next = [...chars];
    next[idx] = char;
    setChars(next);
    setLocalError("");
    if (char && idx < CODE_LENGTH - 1) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Backspace" && !chars[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = sanitize(e.clipboardData.getData("text")).slice(0, CODE_LENGTH);
    const next = Array(CODE_LENGTH).fill("");
    pasted.split("").forEach((ch, i) => (next[i] = ch));
    setChars(next);
    inputRefs.current[Math.min(pasted.length, CODE_LENGTH - 1)]?.focus();
    e.preventDefault();
  };

  const handleSubmit = () => {
    const code = chars.join("");
    if (code.length < CODE_LENGTH) {
      setLocalError(`Please enter the complete ${CODE_LENGTH}-character passcode`);
      return;
    }
    onSubmit(code);
  };

  const error = localError || errorMessage;
  const filledCount = chars.filter(Boolean).length;

  return (
    <div className="w-full max-w-md mx-auto rounded-2xl border border-slate-800 bg-slate-950/60 backdrop-blur-sm p-8 shadow-2xl shadow-black/40">
      <div className="flex flex-col items-center gap-2 mb-6">
        <Label className="text-base font-semibold text-slate-100">
          Interview passcode
        </Label>
        <p className="text-xs text-slate-500 text-center max-w-xs">
          Enter the {CODE_LENGTH}-character code from your interview invitation
        </p>
      </div>

      <div className="space-y-4">
        <div className="flex gap-1.5 sm:gap-2 justify-center" onPaste={handlePaste}>
          {chars.map((ch, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              aria-label={`Passcode character ${i + 1} of ${CODE_LENGTH}`}
              maxLength={1}
              value={ch}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              onFocus={handleFocus}
              disabled={isSubmitting}
              className={`w-9 h-11 sm:w-10 sm:h-12 text-center text-lg font-mono font-semibold rounded-lg border-2 outline-none transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed ${
                error
                  ? "border-red-500/60 bg-red-500/5 text-red-100 focus:border-red-400 focus:ring-4 focus:ring-red-500/20"
                  : ch
                  ? "border-blue-500/50 bg-blue-500/10 text-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/25"
                  : "border-slate-700 bg-slate-900/80 text-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/20"
              }`}
            />
          ))}
        </div>

        <div className="flex justify-center gap-1" aria-hidden="true">
          {Array.from({ length: CODE_LENGTH }).map((_, i) => (
            <span
              key={i}
              className={`h-1 w-4 rounded-full transition-colors duration-200 ${
                i < filledCount ? "bg-blue-500" : "bg-slate-800"
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="flex items-center justify-center gap-1.5 text-sm text-red-400 font-medium text-center">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {error}
          </p>
        )}
      </div>

      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full mt-6 py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg shadow-blue-900/30 hover:shadow-xl hover:shadow-blue-900/40 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:pointer-events-none disabled:hover:scale-100"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            Verifying...
          </span>
        ) : (
          "Verify"
        )}
      </Button>
    </div>
  );
}

export { LoginCodePanel };