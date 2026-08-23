import { Outlet, Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";
// import { useInterview } from "@/hooks/use-session";
// import { useEffect } from "react";
import { useSSE } from "@/hooks/use-sse";
import { useInterview } from "@/hooks/use-session";
import { useEffect } from "react";

interface SessionConfig {
  framework: string;
  level: string;
  language: string;
  type: "dsa" | "framework";
}

export default function AppLayout() {
  const { isAuthenticated, isLoadingUser } = useAuth();
  const { startReporting } = useInterview();

  useEffect(() => {
    if (isAuthenticated) {
      startReporting();
    }
  }, [isAuthenticated]);

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Outlet />;
}

export function AuthLayout() {
  const { isAuthenticated, isLoadingUser } = useAuth();

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <Outlet />;
}

export function ProtectedLayout() {
  const { isAuthenticated, isLoadingUser } = useAuth();

  if (isLoadingUser) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) return <Navigate to="/" replace />;

  return <Outlet />;
}

export function EnvironmentLayout() {
  const router = useNavigate();

  useSSE<SessionConfig>({
    type: "session_config",
    handler: (payload) => {
      // console.log(payload, "pay");
      if (payload.type == "dsa") {
        router(`/editor/${payload.language}`);
      } else {
        router(`/code/${payload.framework.toLowerCase()}`);
      }
    },
  });
  return <Outlet />;
}
