import { useForm } from "react-hook-form";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/logo-header";

interface WorkspaceEntryProps {
  onSubmit: (workspace: string) => void;
  onCodeSubmit?: (code: string) => void;
}

type WorkspaceFormData = { workspace: string };

function WorkspacePanel({ onSubmit }: { onSubmit: (w: string) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<WorkspaceFormData>({ defaultValues: { workspace: "" } });

  return (
    <form onSubmit={handleSubmit((d) => onSubmit(d.workspace))} className="space-y-5">
      <div className="space-y-2">
        <Label htmlFor="workspace" className="text-sm font-medium text-slate-200">
          Workspace
        </Label>
        <Input
          id="workspace"
          type="text"
          placeholder="com.abc.entry"
          {...register("workspace", {
            required: "Please enter your workspace",
            pattern: {
              value: /^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$/i,
              message: "Format must be domain.subdomain.entry (e.g., com.asd.entry)",
            },
          })}
          className={`px-5 py-3 text-base border-2 bg-slate-900 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 ${
            errors.workspace
              ? "border-red-500/70 focus:border-red-500 focus:ring-red-500/20"
              : "border-slate-700 focus:border-blue-500 focus:ring-blue-500/30"
          }`}
        />
        {errors.workspace && (
          <p className="text-sm text-red-400 font-medium">{errors.workspace.message}</p>
        )}
      </div>
      <Button
        type="submit"
        className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
      >
        Continue
      </Button>
      <p className="text-xs text-slate-400 text-center">
        Your workspace identifier (e.g., company.team.entry)
      </p>
    </form>
  );
}

function LoginCodePanel({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [digits, setDigits] = useState<string[]>(Array(6).fill(""));
  const [error, setError] = useState("");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (val: string, idx: number) => {
    const digit = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    setError("");
    if (digit && idx < 5) inputRefs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent, idx: number) => {
    if (e.key === "Backspace" && !digits[idx] && idx > 0) {
      inputRefs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    const next = Array(6).fill("");
    pasted.split("").forEach((ch, i) => (next[i] = ch));
    setDigits(next);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    e.preventDefault();
  };

  const handleSubmit = () => {
    const code = digits.join("");
    if (code.length < 6) {
      setError("Please enter the complete 6-digit code");
      return;
    }
    onSubmit(code);
  };

  const hasError = !!error;

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <Label className="text-sm font-medium text-slate-200 block text-center">Login code</Label>
        <div className="flex gap-2.5 justify-center" onPaste={handlePaste}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => (inputRefs.current[i] = el)}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={(e) => handleChange(e.target.value, i)}
              onKeyDown={(e) => handleKeyDown(e, i)}
              className={`w-11 h-13 text-center text-xl font-semibold bg-slate-900 text-white rounded-xl border-2 outline-none transition-all focus:ring-4 ${
                hasError
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
        className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
      >
        Verify
      </Button>
      <p className="text-xs text-slate-400 text-center">
        Didn't receive it?{" "}
        <button type="button" className="text-blue-400 hover:underline">
          Resend code
        </button>
      </p>
    </div>
  );
}

type Tab = "workspace" | "logincode";

export default function WorkspaceEntry({ onSubmit, onCodeSubmit }: WorkspaceEntryProps) {
  const [activeTab, setActiveTab] = useState<Tab>("workspace");

  const headerProps: Record<Tab, { title: string; subtitle: string }> = {
    workspace: { title: "Welcome back", subtitle: "Enter your workspace to continue" },
    logincode: { title: "Enter code", subtitle: "We sent a 6-digit code to your device" },
  };

  return (
    <div className="w-full animate-fade-in">
      {/* Tab switcher */}
      <div className="flex bg-white/5 rounded-xl p-1 mb-8 border border-white/10">
        {(["workspace", "logincode"] as Tab[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all duration-200 capitalize ${
              activeTab === tab
                ? "bg-blue-600/80 text-white shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            {tab === "workspace" ? "Workspace" : "Login code"}
          </button>
        ))}
      </div>

      <Header {...headerProps[activeTab]} top={true} />

      {activeTab === "workspace" ? (
        <WorkspacePanel onSubmit={onSubmit} />
      ) : (
        <LoginCodePanel onSubmit={onCodeSubmit ?? (() => {})} />
      )}
    </div>
  );
}
