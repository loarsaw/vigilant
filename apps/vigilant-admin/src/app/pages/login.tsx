// src/pages/LoginPage.tsx

import React, { useEffect } from 'react';
import { useState } from 'react';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useNavigate } from 'react-router-dom';
import { useAdminAuth } from '@/hooks/use-auth';
export default function LoginPage() {
  const [isDev, setIsDev] = useState(false);
  const navigate = useNavigate();

  const {
    login,
    loginWithToken,
    isLoggingIn,
    isLoggingInWithToken,
    loginError,
    tokenLoginError,
  } = useAdminAuth();

  const [emailData, setEmailData] = useState({
    workspaceName: '',
    email: '',
    password: '',
  });

  const [tokenData, setTokenData] = useState({
    workspaceName: '',
    authToken: '',
  });

  async function checkIfDev() {
    const data = await window.api?.isDev?.();
    setIsDev(data?.isDev || false);
  }

  useEffect(() => {
    checkIfDev();
  }, []);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailData.workspaceName || !emailData.email || !emailData.password)
      return;

    try {
      await login({
        workspace: emailData.workspaceName,
        credentials: {
          email: emailData.email,
          password: emailData.password,
        },
      });

      setEmailData({ workspaceName: '', email: '', password: '' });

      navigate('/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenData.workspaceName || !tokenData.authToken) return;

    try {
      await loginWithToken({
        workspace: tokenData.workspaceName,
        credentials: {
          token: tokenData.authToken,
        },
      });

      setTokenData({ workspaceName: '', authToken: '' });

      navigate('/dashboard');
    } catch (error) {
      console.error('Token login failed:', error);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-fade-in">
        <CardHeader className="text-center space-y-2">
          <div className="flex items-center justify-center mb-2">
            <div className="w-10 h-10 rounded-lg  flex items-center justify-center shadow-md">
              <img
                src="https://raw.githubusercontent.com/loarsaw/vigilant/master/apps/vigilant/assets/icons/png/512x512.png"
                alt="Vigilant Logo"
                className="w-7 h-7 object-contain"
              />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold text-primary">
            Vigilant Admin
          </CardTitle>
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
              <form onSubmit={handleEmailLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employer-workspace">Workspace Name</Label>
                  <Input
                    id="employer-workspace"
                    placeholder="com.abc.server"
                    value={emailData.workspaceName}
                    onChange={e =>
                      setEmailData({
                        ...emailData,
                        workspaceName: e.target.value,
                      })
                    }
                    className="bg-secondary/50 border-border"
                    disabled={isLoggingIn}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employer-email">Email</Label>
                  <Input
                    id="employer-email"
                    type="email"
                    placeholder="your.email@company.com"
                    value={emailData.email}
                    onChange={e =>
                      setEmailData({ ...emailData, email: e.target.value })
                    }
                    className="bg-secondary/50 border-border"
                    disabled={isLoggingIn}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="employer-password">Password</Label>
                  <Input
                    id="employer-password"
                    type="password"
                    placeholder="Enter your password"
                    value={emailData.password}
                    onChange={e =>
                      setEmailData({ ...emailData, password: e.target.value })
                    }
                    className="bg-secondary/50 border-border"
                    disabled={isLoggingIn}
                    required
                  />
                </div>

                {loginError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md animate-shake">
                    <p className="text-sm text-destructive">
                      {loginError instanceof Error
                        ? loginError.message
                        : 'Login failed. Please check your credentials and try again.'}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full font-semibold mt-6"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? 'Logging in...' : 'Login'}
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
                      setTokenData({
                        ...tokenData,
                        workspaceName: e.target.value,
                      })
                    }
                    className="bg-secondary/50 border-border"
                    disabled={isLoggingInWithToken}
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
                    disabled={isLoggingInWithToken}
                    required
                  />
                </div>

                {tokenLoginError && (
                  <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md animate-shake">
                    <p className="text-sm text-destructive">
                      {tokenLoginError instanceof Error
                        ? tokenLoginError.message
                        : 'Login failed. Please check your token and try again.'}
                    </p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full font-semibold mt-6"
                  disabled={isLoggingInWithToken}
                >
                  {isLoggingInWithToken ? 'Logging in...' : 'Login with Token'}
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
