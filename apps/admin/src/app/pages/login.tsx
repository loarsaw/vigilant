import React, { useEffect } from 'react';
import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { setBaseURL } from '@/lib/axios';

interface LoginCredentials {
  workspaceName: string;
  email: string;
  password: string;
}

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    email: string;
    workspaceName: string;
  };
  message?: string;
}

export default function LoginPage() {
  const [iseDev, setIsDev] = useState(false);
  const router = useNavigate();
  const [employerData, setEmployerData] = useState<LoginCredentials>({
    workspaceName: '',
    email: '',
    password: '',
  });

  async function isApp() {
    const data = await window.api.isDev();
    setIsDev(data.isDev);
  }

  useEffect(() => {
    isApp();
  }, []);

  console.log(iseDev);
  const loginMutation = useMutation({
    mutationFn: async (
      credentials: LoginCredentials
    ): Promise<LoginResponse> => {
      const reversedDomain = credentials.workspaceName
        .split('.')
        .reverse()
        .join('.');

      const apiUrl = !iseDev
        ? `https://${reversedDomain}/api/v1/admin/access`
        : 'http://localhost:3333/api/v1/admin/access';
      console.log(iseDev, apiUrl);
      const response = await axios.post(
        apiUrl,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': credentials.password,
          },
          timeout: 10000,
        }
      );

      return response.data;
    },
    onSuccess: data => {
      setEmployerData({ workspaceName: '', email: '', password: '' });

      setBaseURL(employerData.workspaceName);
      router('/dashboard');
      localStorage.setItem('adminToken', employerData.password);
    },
  });

  const handleEmployerLogin = (e: React.FormEvent) => {
    e.preventDefault();

    if (
      !employerData.workspaceName ||
      !employerData.email ||
      !employerData.password
    ) {
      return;
    }

    loginMutation.mutate(employerData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">
                RC
              </span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Recruit
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            Employer Dashboard
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleEmployerLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="employer-workspace" className="text-foreground">
                Workspace Name
              </Label>
              <Input
                id="employer-workspace"
                placeholder="com.abc.server"
                value={employerData.workspaceName}
                onChange={e =>
                  setEmployerData({
                    ...employerData,
                    workspaceName: e.target.value,
                  })
                }
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                disabled={loginMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer-email" className="text-foreground">
                Email
              </Label>
              <Input
                id="employer-email"
                type="email"
                placeholder="your.email@company.com"
                value={employerData.email}
                onChange={e =>
                  setEmployerData({ ...employerData, email: e.target.value })
                }
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                disabled={loginMutation.isPending}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="employer-password" className="text-foreground">
                Passphrase
              </Label>
              <Input
                id="employer-password"
                type="password"
                placeholder="Enter your passphrase"
                value={employerData.password}
                onChange={e =>
                  setEmployerData({ ...employerData, password: e.target.value })
                }
                className="bg-secondary/50 border-border text-foreground placeholder:text-muted-foreground focus:ring-primary"
                disabled={loginMutation.isPending}
                required
              />
            </div>
            {loginMutation.isError && (
              <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md animate-shake">
                <p className="text-sm text-destructive">
                  {loginMutation.error instanceof Error
                    ? loginMutation.error.message
                    : 'Login failed. Please check your credentials and try again.'}
                </p>
              </div>
            )}
            <Button
              type="submit"
              className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold py-2 mt-6 transition-all disabled:opacity-50"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? 'Logging in...' : 'Login'}
            </Button>
          </form>
          <p className="text-xs text-muted-foreground text-center mt-4">
            Secure employer portal for candidate management
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
