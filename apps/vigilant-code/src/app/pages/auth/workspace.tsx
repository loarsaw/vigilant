import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface WorkspaceEntryProps {
  onSubmit: (workspace: string) => void;
}

type FormData = {
  workspace: string;
};

export default function WorkspaceEntry({ onSubmit }: WorkspaceEntryProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    defaultValues: {
      workspace: '',
    },
  });

  const onInternalSubmit = (data: FormData) => {
    onSubmit(data.workspace);
  };

  return (
    <div className="w-full animate-fade-in">
      <div className="text-center mb-12">
        <div className="mb-8">
          <p className="text-sm font-semibold text-blue-400 tracking-widest uppercase mb-2">
            Vigilant Code
          </p>
          <h1 className="text-3xl font-bold text-white">VC</h1>
        </div>

        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 mb-6 shadow-lg">
          <img
            src="https://raw.githubusercontent.com/loarsaw/vigilant/master/apps/vigilant/assets/icons/png/512x512.png"
            alt="Vigilant Logo"
            className="w-8 h-8 object-contain"
          />
        </div>

        <h2 className="text-5xl font-bold text-white mb-3 text-balance">
          Welcome back
        </h2>

        <p className="text-lg text-slate-300 font-light">
          Enter your workspace to continue
        </p>
      </div>

      <form onSubmit={handleSubmit(onInternalSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label
            htmlFor="workspace"
            className="block text-sm font-medium text-slate-200"
          >
            Workspace
          </Label>

          <div className="relative">
            <Input
              id="workspace"
              type="text"
              placeholder="com.abc.entry"
              {...register('workspace', {
                required: 'Please enter your workspace',
                pattern: {
                  value: /^[a-z0-9]+\.[a-z0-9]+\.[a-z0-9]+$/i,
                  message:
                    'Format must be domain.subdomain.entry (e.g., com.asd.asdasd)',
                },
              })}
              className={`px-6 py-3 text-lg border-2 bg-slate-900 text-white placeholder:text-slate-500 rounded-xl focus:outline-none focus:ring-4 transition-all duration-200 ${
                errors.workspace
                  ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500/30'
              }`}
            />
          </div>

          {errors.workspace && (
            <p className="text-sm text-red-500 font-medium animate-shake">
              {errors.workspace.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95"
        >
          Continue
        </Button>

        <p className="text-xs text-slate-400 text-center mt-4">
          Your workspace identifier (e.g., company.team.entry)
        </p>
      </form>
    </div>
  );
}
