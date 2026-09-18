import { Eye, EyeOff, AlertCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export function SelectField({
  id,
  label,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-2 px-3.5 py-2.5 bg-input border border-border rounded-md text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-colors"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({
  id,
  label,
  value,
  onChange,
  placeholder,
  onBlur,
  error,
  helpText,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  onBlur?: () => void;
  error?: string | null;
  helpText?: string;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <Input
        id={id}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onBlur}
        aria-invalid={!!error}
        className={`w-full mt-2 bg-input border text-foreground placeholder:text-muted-foreground/60 text-sm py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 transition-colors ${
          error
            ? "border-destructive focus:ring-destructive/40 focus:border-destructive"
            : "border-border focus:ring-ring focus:border-primary"
        }`}
      />
      {error ? (
        <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      ) : helpText ? (
        <p className="mt-1.5 text-xs text-muted-foreground">{helpText}</p>
      ) : null}
    </div>
  );
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  showSecret,
  toggleShow,
  placeholder,
  onBlur,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  showSecret: boolean;
  toggleShow: () => void;
  placeholder: string;
  onBlur?: () => void;
  error?: string | null;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative mt-2">
        <Input
          id={id}
          type={showSecret ? "text" : "password"}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          className={`w-full bg-input border text-foreground placeholder:text-muted-foreground/60 text-sm pr-10 py-2.5 px-3.5 rounded-md focus:outline-none focus:ring-2 transition-colors ${
            error
              ? "border-destructive focus:ring-destructive/40 focus:border-destructive"
              : "border-border focus:ring-ring focus:border-primary"
          }`}
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
      {error && (
        <p className="mt-1.5 text-xs text-destructive flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}

export function ReadonlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label className="text-sm font-medium text-foreground">{label}</Label>
      <div className="w-full mt-2 px-3.5 py-2.5 bg-input/50 border border-border rounded-md text-foreground text-sm">
        {value || "—"}
      </div>
    </div>
  );
}

export function ReadonlySecretField({
  id,
  label,
  value,
  showSecret,
  toggleShow,
}: {
  id: string;
  label: string;
  value: string;
  showSecret: boolean;
  toggleShow: () => void;
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      <div className="relative mt-2">
        <Input
          id={id}
          type={showSecret ? "text" : "password"}
          value={value || "••••••••••••••••"}
          readOnly
          className="w-full bg-input/50 border border-border text-foreground text-sm py-2.5 px-3.5 rounded-md pr-10 cursor-default"
        />
        <button
          type="button"
          onClick={toggleShow}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}