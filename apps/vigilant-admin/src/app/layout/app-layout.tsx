import { NavLink, Outlet, useNavigate, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/use-auth";

export function SidebarLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { role } = useAdminAuth();

  console.log(role);
  const [NAV_ITEMS] = useState([
    { label: "Dashboard", to: "/dashboard", icon: LayoutDashboard },
    { label: "Candidate List", to: "/candidates", icon: Users },
    { label: "Applications", to: "/applications", icon: AppWindowMacIcon },
    { label: "Interviews", to: "/interviews", icon: UserCheck2 },

    { label: "Hiring", to: "/hiring", icon: BrickWallShieldIcon },
    { label: "Settings", to: "/settings", icon: Settings },
  ]);

  return (
    <div className="flex h-screen  overflow-hidden">
      <aside
        className={`relative z-10 flex flex-col bg-slate-900 shadow-xl transition-all duration-200 ease-in-out flex-shrink-0
        ${collapsed ? "w-[72px]" : "w-60"}`}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-2.5 border-b border-white/[0.07] py-7 overflow-hidden
          ${collapsed ? "justify-center px-0" : "px-6"}`}
        >
          <div className="flex-shrink-0 w-8 h-8 rounded-lg  flex items-center justify-center shadow-lg shadow-indigo-500/40">
            <img
              src="https://raw.githubusercontent.com/loarsaw/vigilant/master/apps/vigilant/assets/icons/png/512x512.png"
              alt="Vigilant Logo"
              className="w-6 h-6 object-contain"
            />
          </div>
          {!collapsed && (
            <span className="text-white font-semibold text-base tracking-tight whitespace-nowrap">
              Vigilant Admin
            </span>
          )}
        </div>

        <nav className="flex-1 flex flex-col gap-0.5 py-4">
          {NAV_ITEMS.map(({ label, to, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 mx-2 rounded-lg text-sm transition-all duration-150 border-l-2
                ${collapsed ? "justify-center px-0 py-3" : "px-4 py-2.5"}
                ${
                  isActive
                    ? "bg-indigo-500/20 text-white font-semibold border-indigo-500"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5 border-transparent font-normal"
                }
              `}
            >
              {({ isActive }) => (
                <>
                  <Icon
                    size={18}
                    className={`flex-shrink-0 transition-colors ${isActive ? "text-indigo-400" : "text-white/40"}`}
                  />
                  {!collapsed && <span className="whitespace-nowrap">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="p-2 border-t border-white/[0.07]">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className={`w-full flex items-center gap-3 text-white/40 hover:bg-red-500/10 hover:text-red-300 h-auto
              ${collapsed ? "justify-center px-0 py-3" : "px-3 py-2.5"}`}
          >
            <LogOut size={18} className="flex-shrink-0" />
            {!collapsed && <span className="text-sm">Logout</span>}
          </Button>
        </div>

        <button
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          className="absolute top-1/2 -right-3 -translate-y-1/2 z-20 w-6 h-6 rounded-full bg-slate-800
            border border-white/10 text-white/60 hover:bg-slate-700 flex items-center justify-center transition-colors"
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
