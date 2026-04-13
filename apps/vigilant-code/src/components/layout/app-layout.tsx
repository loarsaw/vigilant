import { Outlet, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/use-auth";

export default function AppLayout() {
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
