import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Settings,
  BrickWallShieldIcon,
  UserCheck2,
  AppWindowMacIcon,
  BellIcon,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-auth";
import { ThemeToggle } from "@/components/theme-toggle";

export function SidebarLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { role, logout } = useAdminAuth();

  const [NAV_ITEMS] = useState([
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Candidate List", to: "/candidates", icon: Users },
    { label: "Applications", to: "/applications", icon: AppWindowMacIcon },
    { label: "Interviews", to: "/interviews", icon: UserCheck2 },
    { label: "Notifications", to: "/notifications", icon: BellIcon },
    { label: "Hiring", to: "/hiring", icon: BrickWallShieldIcon },
    { label: "Settings", to: "/settings", icon: Settings },
  ]);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside
        className={`relative z-10 flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-200 ease-in-out flex-shrink-0
        ${collapsed ? "w-[72px]" : "w-60"}`}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-2.5 border-b border-sidebar-border py-5 overflow-hidden
          ${collapsed ? "justify-center px-0" : "px-6"}`}
        >
          <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center">
            <img
              src="https://raw.githubusercontent.com/loarsaw/vigilant/master/apps/vigilant/assets/icons/png/512x512.png"
              alt="Vigilant Logo"
              className="w-8 h-8 object-contain"
            />
          </div>
          {!collapsed && (
            <span className="font-display font-semibold text-base tracking-tight text-sidebar-foreground whitespace-nowrap">
              Vigilant
            </span>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 py-4">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 mx-2 rounded-md text-sm transition-all duration-150 border-l-2
                ${collapsed ? "justify-center px-0 py-3" : "px-4 py-2.5"}
                ${
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground font-semibold border-primary"
                    : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent/50 border-transparent font-medium"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={`flex-shrink-0 transition-colors ${
                      isActive
                        ? "text-primary"
                        : "text-sidebar-foreground/50"
                    }`}
                  />
                  {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-sidebar-border space-y-2">
          <ThemeToggle collapsed={collapsed} />
          <Button
            variant="ghost"
            onClick={() => {
              logout().then(() => {
                navigate("/");
              });
            }}
            className={`w-full flex items-center gap-3 text-sidebar-foreground/60 hover:bg-destructive/10 hover:text-destructive h-auto font-medium
              ${collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"}`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </Button>
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-1/2 -right-3 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-sidebar-accent
            border border-sidebar-border text-sidebar-foreground/60 hover:bg-sidebar-accent flex items-center justify-center transition-colors"
        >
          {collapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
        </button>
      </aside>

      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}