import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';

interface CredentialsProps {
  workspace: string;
  onBack: () => void;
  onSubmit: (creds: { username: string; password: string }) => Promise<void>;
  isLoading: boolean;
  error?: string;
}

export default function Credentials({ workspace, onBack, onSubmit, isLoading, error }: CredentialsProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});

  const handleUsernameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUsername(e.target.value);
    setFieldErrors((prev) => ({ ...prev, username: undefined }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    setFieldErrors((prev) => ({ ...prev, password: undefined }));
  };

  const handleSubmit = async () => {
    const newErrors: { username?: string; password?: string } = {};

    if (!username.trim()) {
      newErrors.username = 'Username is required';
    }

    if (!password.trim()) {
      newErrors.password = 'Password is required';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    await onSubmit({ username, password });
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isLoading) {
      handleSubmit();
    }
  };

  return (
    <div className="w-full animate-fade-in">
      <button
        onClick={onBack}
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
          Enter your username and password to continue
        </p>
      </div>

      <div className="space-y-6">
        {/* Username Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Username
          </label>

          <Input
            type="text"
            placeholder="your-username"
            value={username}
            onChange={handleUsernameChange}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className={`px-6 py-3 text-base border-2 bg-slate-900 text-white placeholder:text-slate-500 rounded-xl focus:outline-none transition-all duration-200 ${
              fieldErrors.username
                ? 'border-red-500 focus:ring-4 focus:ring-red-500/30 focus:border-red-500'
                : 'border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          />

          {fieldErrors.username && (
            <p className="text-sm text-red-500 font-medium animate-shake">
              {fieldErrors.username}
            </p>
          )}
        </div>

        {/* Password Input */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-slate-200">
            Password
          </label>

          <div className="relative">
            <Input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter your password"
              value={password}
              onChange={handlePasswordChange}
              onKeyPress={handleKeyPress}
              disabled={isLoading}
              className={`px-6 py-3 pr-12 text-base border-2 bg-slate-900 text-white placeholder:text-slate-500 rounded-xl focus:outline-none transition-all duration-200 ${
                fieldErrors.password
                  ? 'border-red-500 focus:ring-4 focus:ring-red-500/30 focus:border-red-500'
                  : 'border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/30'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {fieldErrors.password && (
            <p className="text-sm text-red-500 font-medium animate-shake">
              {fieldErrors.password}
            </p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full py-3 text-base font-semibold rounded-xl bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:hover:shadow-lg"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>

        {/* API Error Message */}
        {error && (
          <div className="bg-red-950/30 border border-red-700/50 rounded-xl p-4">
            <p className="text-sm text-red-400 font-medium">{error}</p>
          </div>
        )}

        {/* Footer Link */}
        <div className="flex justify-center text-sm mt-6">
          <a href="#" className="text-slate-400 hover:text-blue-400 transition-colors font-medium">
            Forgot password?
          </a>
        </div>
      </div>
    </div>
  );
}