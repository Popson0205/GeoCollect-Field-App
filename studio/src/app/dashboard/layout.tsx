// studio/src/app/dashboard/layout.tsx
"use client";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  FolderKanban,
  Settings,
  LogOut,
  Map,
  ChevronRight,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/projects",  label: "Projects",  icon: FolderKanban },
];

const NAV_BOTTOM = [
  { href: "/settings", label: "Settings", icon: Settings },
];

function UserChip({ name, role }: { name: string; role: string }) {
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const roleLabel = role.replace(/_/g, " ");

  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white text-xs font-bold shrink-0">
        {initials}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-white truncate">{name}</p>
        <p className="text-[10px] text-slate-400 capitalize truncate">{roleLabel}</p>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<{ full_name: string; role: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("gc_token");
    if (!token) {
      router.push("/auth");
      return;
    }
    const u = localStorage.getItem("gc_user");
    if (u) setUser(JSON.parse(u));
  }, [router]);

  const logout = () => {
    localStorage.removeItem("gc_token");
    localStorage.removeItem("gc_user");
    router.push("/auth");
  };

  // Determine active state — match exact or prefix
  const isActive = (href: string) =>
    href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(href);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      {/* ── Sidebar ───────────────────────────────────────── */}
      <aside className="w-56 flex flex-col shrink-0" style={{ background: "var(--sidebar-bg)" }}>

        {/* Logo */}
        <div className="px-4 py-4 border-b" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shrink-0">
              <Map size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">GeoCollect</p>
              <p className="text-slate-400 text-[10px] uppercase tracking-wider">Studio</p>
            </div>
          </div>
        </div>

        {/* Primary nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="nav-item-section">Workspace</p>
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-item ${isActive(href) ? "active" : ""}`}
            >
              <Icon size={16} className="shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        {/* Bottom nav */}
        <div className="px-3 pb-2 space-y-0.5" style={{ borderTop: "1px solid var(--sidebar-border)" }}>
          <div className="pt-3 space-y-0.5">
            {NAV_BOTTOM.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`nav-item ${isActive(href) ? "active" : ""}`}
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </Link>
            ))}
            <button
              onClick={logout}
              className="nav-item w-full text-left"
            >
              <LogOut size={16} className="shrink-0" />
              Sign out
            </button>
          </div>
        </div>

        {/* User chip */}
        {user && (
          <div className="border-t py-2" style={{ borderColor: "var(--sidebar-border)" }}>
            <UserChip name={user.full_name} role={user.role} />
          </div>
        )}
      </aside>

      {/* ── Main content ──────────────────────────────────── */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
