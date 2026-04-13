import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, Loader2 } from 'lucide-react';

interface CredentialsValues {
  username: string;
  password: string;
}

interface CredentialsProps {
  workspace: string;
  onBack: () => void;
  onSubmit: (creds: CredentialsValues) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export default function Credentials({ workspace, onBack, onSubmit, isLoading, error }: CredentialsProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CredentialsValues>({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const onInternalSubmit = async (data: CredentialsValues) => {
    await onSubmit(data);
  };


  return (
    <div className="w-full animate-fade-in">
      <button
        onClick={onBack}
        type="button"
        className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition-colors mb-8 text-sm font-medium"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br from-cyan-500 to-blue-500 mb-6 shadow-lg">
          <span className="text-slate-950 text-xl font-bold">🔐</span>
        </div>

        <h2 className="text-4xl font-bold text-white mb-2 text-balance">
          Sign in to {workspace}
        </h2>

        <p className="text-slate-300 font-light">
          Enter your email and password to continue
        </p>
      </div>

      <form onSubmit={handleSubmit(onInternalSubmit)} className="space-y-6">
        {/* Email Input */}
        <div className="space-y-2">
          <Label htmlFor="email" className="block text-sm font-medium text-slate-200">
            Email Address
          </Label>

          <Input
            {...register('username', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            id="email"
            type="email"
            placeholder="name@company.com"
            disabled={isLoading}
            className={`px-6 py-3 text-base border-2 bg-slate-900 text-white placeholder:text-slate-500 rounded-xl focus:outline-none transition-all duration-200 ${
              errors.username
                ? 'border-red-500 focus:ring-4 focus:ring-red-500/30'
                : 'border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30'
            } disabled:opacity-50`}
          />

          {errors.username && (
            <p className="text-sm text-red-500 font-medium animate-shake">
              {errors.username.message}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <Label htmlFor="password" className="block text-sm font-medium text-slate-200">
            Password
          </Label>

          <div className="relative">
            <Input
              {...register('password', { 
                required: 'Password is required',
                minLength: { value: 6, message: 'Password must be at least 6 characters' }
              })}
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              disabled={isLoading}
              className={`px-6 py-3 pr-12 text-base border-2 bg-slate-900 text-white placeholder:text-slate-500 rounded-xl focus:outline-none transition-all duration-200 ${
                errors.password
                  ? 'border-red-500 focus:ring-4 focus:ring-red-500/30'
                  : 'border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30'
              } disabled:opacity-50`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {errors.password && (
            <p className="text-sm text-red-500 font-medium animate-shake">
              {errors.password.message}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isLoading}
          className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:hover:scale-100"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>

        {error && (
          <div className="bg-red-950/30 border border-red-700/50 rounded-xl p-4 animate-in fade-in zoom-in-95">
            <p className="text-sm text-red-400 font-medium text-center">{error}</p>
          </div>
        )}

        
      </form>
    </div>
  );
}