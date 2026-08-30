import { Outlet, Link, useLocation } from "react-router-dom";
import { logout } from "../firebase";
import { useAuth } from "../AuthContext";
import { Terminal, LayoutDashboard, MessageSquare, BarChart2, Network, LogOut, Settings as SettingsIcon } from "lucide-react";
import { clsx } from "clsx";
import { useTheme } from "../ThemeContext";

export function Layout() {
  const { user } = useAuth();
  const location = useLocation();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Case Logs", path: "/incidents", icon: Terminal },
    { name: "Graph View", path: "/graph", icon: Network },
  ];

  return (
    <div className="h-full bg-zinc-50 dark:bg-[#0a0a0a] text-zinc-900 dark:text-zinc-300 flex font-sans transition-colors duration-200">
      {/* Sidebar */}
      <aside className="w-64 bg-white dark:bg-[#0a0a0a] border-r border-zinc-200 dark:border-zinc-800 flex flex-col p-4 shrink-0 transition-colors duration-200">
        <div className="mb-10 px-3 flex items-center justify-between text-zinc-900 dark:text-zinc-100">
          <div className="flex items-center gap-3">
            <Terminal className="w-6 h-6 text-zinc-900 dark:text-zinc-100" />
            <span className="font-mono text-lg tracking-widest uppercase">StackTrace</span>
          </div>
        </div>

        <div className="px-3 text-[10px] text-zinc-500 font-mono uppercase tracking-widest mb-4">Continuous Intelligence</div>
        <nav className="flex-1 flex flex-col gap-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.name}
                to={item.path}
                className={clsx(
                  "flex items-center gap-4 px-3 py-3 text-xs transition-colors font-mono uppercase tracking-widest rounded",
                  isActive
                    ? "text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20"
                    : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="mb-2">
            <Link
              to="/settings"
              className={clsx(
                "flex items-center gap-4 px-3 py-3 text-xs transition-colors font-mono uppercase tracking-widest rounded",
                location.pathname === "/settings"
                  ? "text-red-600 dark:text-red-500 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20"
                  : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 border border-transparent hover:border-zinc-200 dark:hover:border-zinc-800"
              )}
            >
              <SettingsIcon className="w-4 h-4 shrink-0" />
              Settings
            </Link>
          </div>
          <div className="pt-6 border-t border-zinc-200 dark:border-zinc-800 px-3">
          <div className="flex items-center gap-3 mb-4 group">
            <div className="w-8 h-8 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 flex items-center justify-center text-xs font-mono text-zinc-500 dark:text-zinc-400 uppercase transition-colors">
              {user?.displayName?.charAt(0) || "U"}
            </div>
            <div className="overflow-hidden">
              <div className="text-xs font-mono text-zinc-900 dark:text-zinc-300 truncate transition-colors">{user?.displayName}</div>
              <div className="text-[10px] text-zinc-500 truncate font-mono">{user?.email}</div>
            </div>
          </div>
          <button
            onClick={logout}
            className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-zinc-200 dark:border-zinc-800 text-[10px] font-mono uppercase tracking-widest text-zinc-500 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors rounded"
          >
            <LogOut className="w-3 h-3" />
            Sign Out
          </button>
        </div>
      </div>
    </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden bg-transparent">
        <Outlet />
      </main>
    </div>
  );
}
