import { useState } from 'react';
import WorkspaceEntry from './workspace';
import Credentials from './creds';
import Success from './success';
import { useAuth } from '@/hooks/use-auth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
  const { login, isLoggingIn, loginError, resetLogin, logout, setupPoller, setSessionMeta } = useAuth();
  const router = useNavigate();

  const [step, setStep] = useState<
    'workspace' | 'credentials' | 'success' | 'waiting'
  >('workspace');
  const [workspace, setWorkspace] = useState('');
  const [username, setUsername] = useState('');

  const { data: setupStatus } = setupPoller(workspace, username, step === 'waiting');

  if (setupStatus?.assigned && setupStatus.setupPath && step === 'waiting') {
    setSessionMeta(workspace, setupStatus.setupPath);
    router('/wait');
  }

  const handleWorkspaceSubmit = (value: string) => {
    setWorkspace(value);
    setStep('credentials');
  };

  const handleBackClick = () => {
    resetLogin();
    setStep('workspace');
  };

  const handleLoginSuccess = (user: string) => {
    setUsername(user);
    setStep('success');
  };

  const handleProceedToWaiting = () => {
    setStep('waiting');
  };

  const handleCredentialsSubmit = async (creds: {
    username: string;
    password: string;
  }) => {
    try {
      const result = await login({ workspace, credentials: creds });
      handleLoginSuccess(result.full_name);
    } catch {}
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 relative overflow-hidden">
      <div className="absolute top-10 left-10 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse" />
      <div
        className="absolute bottom-10 right-10 w-96 h-96 bg-cyan-600 rounded-full mix-blend-multiply filter blur-3xl opacity-15 animate-pulse"
        style={{ animationDelay: '2s' }}
      />
      <div
        className="absolute top-1/2 right-1/4 w-72 h-72 bg-blue-700 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse"
        style={{ animationDelay: '1s' }}
      />

      <div className="relative z-10 w-full max-w-md px-4 flex items-center justify-center">
        <div
          className={`w-full transition-all duration-700 ease-out absolute ${step === 'workspace' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}
        >
          <WorkspaceEntry onSubmit={handleWorkspaceSubmit} />
        </div>

        <div
          className={`w-full transition-all duration-700 ease-out absolute ${step === 'credentials' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}
        >
          <Credentials
            workspace={workspace}
            onBack={handleBackClick}
            onSubmit={handleCredentialsSubmit}
            isLoading={isLoggingIn}
            error={loginError?.message}
          />
        </div>

        <div
          className={`w-full transition-all duration-700 ease-out absolute ${step === 'success' ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-8 pointer-events-none'}`}
        >
          <Success
            workspace={workspace}
            username={username}
            onProceed={handleProceedToWaiting}
          />
        </div>
      </div>
    </div>
  );
}