import { Label } from "@radix-ui/react-label";
import { useRef, useState } from "react";
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

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-200 block text-center">
          Interview passcode
        </Label>
        <div className="flex gap-2 justify-center flex-wrap" onPaste={handlePaste}>
          {chars.map((ch, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="text"
              autoCapitalize="characters"
              maxLength={1}
              value={ch}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              disabled={isSubmitting}
              className={`w-10 h-12 text-center text-lg font-semibold bg-slate-900 text-white rounded-xl border-2 outline-none transition-all focus:ring-4 disabled:opacity-60 ${
                error
                  ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/20"
                  : "border-slate-700 focus:border-blue-500 focus:ring-blue-500/30"
              }`}
            />
          ))}
        </div>
        {error && <p className="text-sm text-red-400 font-medium text-center">{error}</p>}
      </div>
      <Button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:pointer-events-none"
      >
        {isSubmitting ? "Verifying..." : "Verify"}
      </Button>
    </div>
  );
}

export { LoginCodePanel };