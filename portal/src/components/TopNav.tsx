"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search, Bell, LogOut } from "lucide-react";
import AppLauncher from "./AppLauncher";

const LINKS = [
  { href: "/portal",       label: "Home" },
  { href: "/content",      label: "Content" },
  { href: "/map",          label: "Map Viewer" },
  { href: "/scene",        label: "Scene Viewer" },
  { href: "/dashboards",   label: "Dashboard" },
  { href: "/forms",        label: "Forms" },
  { href: "/organization", label: "Organization" },
];

export default function TopNav({ user }: { user?: { full_name: string } }) {
  const path = usePathname();
  const router = useRouter();

  const initials =
    user?.full_name
      ?.split(" ")
      .map(w => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() ?? "PG";

  const isActive = (href: string) =>
    href === "/portal"
      ? path === "/" || path === "/portal"
      : path.startsWith(href);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("gc_token");
      localStorage.removeItem("gc_user");
    }
    router.push("/auth");
  };

  return (
    <nav className="gc-nav">
      {/* Brand */}
      <Link href="/portal" className="gc-nav-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" y1="12" x2="22" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
        GeoCollect
      </Link>

      {/* Nav links */}
      <div className="gc-nav-links">
        {LINKS.map(({ href, label }) => (
          <Link
            key={href}
            href={href}
            className={`gc-nav-link ${isActive(href) ? "active" : ""}`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Right actions */}
      <div className="gc-nav-right">
        <button className="gc-nav-icon" aria-label="Search">
          <Search size={16} />
        </button>
        <button className="gc-nav-icon" aria-label="Notifications">
          <Bell size={16} />
        </button>
        <AppLauncher />
        <div className="gc-avatar" title={user?.full_name ?? "Popson Geospatial"}>
          {initials}
        </div>
        <button
          onClick={handleLogout}
          className="gc-nav-icon"
          aria-label="Sign out"
          title="Sign out"
          style={{ color: "rgba(255,255,255,0.6)" }}
        >
          <LogOut size={15} />
        </button>
      </div>
    </nav>
  );
}
