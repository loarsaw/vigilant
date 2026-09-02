import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/logo-header";

interface WorkspaceEntryProps {
  onSubmit: (workspace: string) => void;
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

export default function WorkspaceEntry({ onSubmit }: WorkspaceEntryProps) {
  return (
    <div className="w-full animate-fade-in">
      <Header title="Welcome back" subtitle="Enter your workspace to continue" top={true} />
      <WorkspacePanel onSubmit={onSubmit} />
    </div>
  );
}