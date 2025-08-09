"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Compass, MessageSquareText, UserRound, Users, PanelLeftClose, PanelLeftOpen, UserPlus, LogOut } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Explore", icon: Compass },
  { href: "/messages", label: "Messages", icon: MessageSquareText },
  { href: "/profile", label: "Your Profile", icon: UserRound },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("civicmatch.sidebar.collapsed");
    setCollapsed(stored === "1");
  }, []);

  useEffect(() => {
    localStorage.setItem("civicmatch.sidebar.collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <aside
      className={`hidden md:flex h-dvh sticky top-0 border-r border-divider p-3 flex-col gap-3 transition-[width] duration-200 ${
        collapsed ? "w-20" : "w-64 lg:w-72"
      }`}
    >
      <div className="flex items-center gap-2 px-2">
        <Link href="/" className="flex items-center gap-2">
          <Users className="size-6 text-[color:var(--accent)]" />
          {!collapsed && <span className="font-bold tracking-tight">Civic Match</span>}
        </Link>
      </div>

      {!collapsed && (
        <div className="px-2 text-[10px] uppercase tracking-wide opacity-60">Menu</div>
      )}

      <nav className="flex flex-col gap-1 mt-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 transition-colors border ${
                active
                  ? "bg-[color:var(--accent)] text-[color:var(--background)] border-transparent"
                  : "hover:bg-[color:var(--muted)]/30 border-transparent"
              }`}
              title={item.label}
            >
              <item.icon className="size-5" />
              {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-2">
        <button
          className="btn btn-muted w-full justify-center"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={() => setCollapsed((v) => !v)}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="mr-2 size-4" /> Collapse
            </>
          )}
        </button>
      </div>

      <div className="space-y-2 pt-2 border-t border-divider">
        <button className="btn btn-primary w-full justify-center">
          <UserPlus className="mr-2 size-4" /> {!collapsed && "Sign up"}
        </button>
        <button
          className="btn btn-muted w-full justify-center"
          onClick={() => {
            localStorage.setItem("civicmatch.authenticated", "0");
            window.location.href = "/";
          }}
        >
          <LogOut className="mr-2 size-4" /> {!collapsed && "Log out"}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;


