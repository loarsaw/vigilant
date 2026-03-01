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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { setBaseURL, saveCredentialsAuth, saveTokenAuth } from '@/lib/axios';

interface LoginCredentials {
  workspaceName: string;
  email: string;
  password: string;
}

interface TokenCredentials {
  workspaceName: string;
  authToken: string;
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

  const [tokenData, setTokenData] = useState<TokenCredentials>({
    workspaceName: '',
    authToken: '',
  });

  async function isApp() {
    const data = await window.api.isDev();
    setIsDev(data.isDev);
  }

  useEffect(() => {
    isApp();
  }, []);

  const buildApiUrl = (workspaceName: string) => {
    const reversedDomain = workspaceName.split('.').reverse().join('.');
    return !iseDev
      ? `https://${reversedDomain}/api/v1/admin/access`
      : 'http://localhost:3333/api/v1/admin/access';
  };

  // Email + password login — sends X-Admin-Email and X-Admin-Password headers
  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginCredentials): Promise<LoginResponse> => {
      const response = await axios.post(
        buildApiUrl(credentials.workspaceName),
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Email': credentials.email,
            'X-Admin-Password': credentials.password,
          },
          timeout: 10000,
        }
      );
      return response.data;
    },
    onSuccess: (_, credentials) => {
      setBaseURL(credentials.workspaceName);
      saveCredentialsAuth(credentials.email, credentials.password);
      setEmployerData({ workspaceName: '', email: '', password: '' });
      router('/dashboard');
    },
  });

  // Token login — sends X-Admin-Token header
  const tokenMutation = useMutation({
    mutationFn: async (credentials: TokenCredentials): Promise<LoginResponse> => {
      const response = await axios.post(
        buildApiUrl(credentials.workspaceName),
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Token': credentials.authToken,
          },
          timeout: 10000,
        }
      );
      return response.data;
    },
    onSuccess: (_, credentials) => {
      setBaseURL(credentials.workspaceName);
      saveTokenAuth(credentials.authToken);
      setTokenData({ workspaceName: '', authToken: '' });
      router('/dashboard');
    },
  });

  const handleEmployerLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!employerData.workspaceName || !employerData.email || !employerData.password) return;
    loginMutation.mutate(employerData);
  };

  const handleTokenLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenData.workspaceName || !tokenData.authToken) return;
    tokenMutation.mutate(tokenData);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <span className="text-sm font-bold text-primary-foreground">RC</span>
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">Recruit</CardTitle>
          <CardDescription className="text-muted-foreground">
            Employer Dashboard
          </CardDescription>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="email" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="email">Email Login</TabsTrigger>
              <TabsTrigger value="token">Token Login</TabsTrigger>
            </TabsList>

            <TabsContent value="email">
              <form onSubmit={handleEmployerLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employer-workspace">Workspace Name</Label>
                  <Input
                    id="employer-workspace"
                    placeholder="com.abc.server"
                    value={employerData.workspaceName}
                    onChange={e =>
                      setEmployerData({ ...employerData, workspaceName: e.target.value })
                    }
                    className="bg-secondary/50 border-border"
                    disabled={loginMutation.isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employer-email">Email</Label>
                  <Input
                    id="employer-email"
                    type="email"
                    placeholder="your.email@company.com"
                    value={employerData.email}
                    onChange={e =>
                      setEmployerData({ ...employerData, email: e.target.value })
                    }
                    className="bg-secondary/50 border-border"
                    disabled={loginMutation.isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employer-password">Password</Label>
                  <Input
                    id="employer-password"
                    type="password"
                    placeholder="Enter your password"
                    value={employerData.password}
                    onChange={e =>
                      setEmployerData({ ...employerData, password: e.target.value })
                    }
                    className="bg-secondary/50 border-border"
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
                  className="w-full font-semibold mt-6"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? 'Logging in...' : 'Login'}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="token">
              <form onSubmit={handleTokenLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="token-workspace">Workspace Name</Label>
                  <Input
                    id="token-workspace"
                    placeholder="com.abc.server"
                    value={tokenData.workspaceName}
                    onChange={e =>
                      setTokenData({ ...tokenData, workspaceName: e.target.value })
                    }
                    className="bg-secondary/50 border-border"
                    disabled={tokenMutation.isPending}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="auth-token">Auth Token</Label>
                  <Input
                    id="auth-token"
                    type="password"
                    placeholder="Paste your auth token"
                    value={tokenData.authToken}
                    onChange={e =>
                      setTokenData({ ...tokenData, authToken: e.target.value })
                    }
                    className="bg-secondary/50 border-border"
                    disabled={tokenMutation.isPending}
                    required
                  />
                </div>

                {tokenMutation.isError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md animate-shake">
                    <p className="text-sm text-destructive">
                      {tokenMutation.error instanceof Error
                        ? tokenMutation.error.message
                        : 'Login failed. Please check your token and try again.'}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full font-semibold mt-6"
                  disabled={tokenMutation.isPending}
                >
                  {tokenMutation.isPending ? 'Logging in...' : 'Login with Token'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <p className="text-xs text-muted-foreground text-center mt-4">
            Secure employer portal for candidate management
          </p>
        </CardContent>
      </Card>
    </div>
  );
}