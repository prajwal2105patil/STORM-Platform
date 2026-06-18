"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, FileText, Users, BarChart3, Zap, Shield,
  ChevronRight, Search, Calculator, BookOpen, ChevronDown, Menu, X,
  Map as MapIcon, LogIn, LogOut, Award, Scale, Database,
} from "lucide-react";
import { clsx } from "clsx";
import { useState, useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

const PRIMARY_NAV = [
  { href: "/dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { href: "/adjudicate", label: "Adjudicate", icon: Zap             },
  { href: "/claims",     label: "Claims",     icon: FileText        },
];

const INTELLIGENCE_NAV = [
  { href: "/analytics", label: "Analytics",   icon: BarChart3 },
  { href: "/query",     label: "Weather Q&A", icon: Search    },
];

const EVIDENCE_NAV = [
  { href: "/benchmark",    label: "Benchmark",    icon: Award    },
  { href: "/methodology",  label: "Methodology",  icon: Scale    },
  { href: "/data-sources", label: "Data Sources", icon: Database },
];

// Admin-only: customer PII + the policy/audit panel.
const CRM_NAV = [
  { href: "/customers", label: "Customers",   icon: Users },
];

const TOOLS_NAV = [
  { href: "/sla",      label: "SLA Calc", icon: Calculator },
  { href: "/api-docs", label: "API Docs", icon: BookOpen   },
];

// Admin-only tools.
const ADMIN_TOOLS_NAV = [
  { href: "/policy",   label: "Policy",   icon: Shield },
];

const MAP_NAV = [
  { href: "/map", label: "Station Map", icon: MapIcon },
];

interface Profile {
  username: string | null;
  full_name: string | null;
  email: string | null;
  role: string;
}

function NavItem({
  href, label, icon: Icon, onClick,
}: {
  href: string; label: string; icon: any; onClick?: () => void;
}) {
  const path   = usePathname();
  const active = path === href || (href !== "/" && path.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={clsx(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-150",
        active
          ? "sidebar-nav-active text-white font-semibold"
          : "text-blue-200/55 hover:text-white hover:bg-white/6"
      )}
    >
      <Icon
        size={14}
        className={clsx(
          "flex-shrink-0 transition-colors",
          active ? "text-sky" : "opacity-55 group-hover:opacity-90"
        )}
      />
      <span>{label}</span>
      {active && (
        <ChevronRight size={11} className="ml-auto text-sky/50" />
      )}
    </Link>
  );
}

function NavGroup({
  label, items, collapsed = false, onNavClick,
}: {
  label: string; items: typeof PRIMARY_NAV; collapsed?: boolean; onNavClick?: () => void;
}) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] font-extrabold text-blue-400/40 uppercase tracking-[0.15em] hover:text-blue-300/70 transition-colors"
      >
        {label}
        <ChevronDown
          size={8}
          className={clsx("transition-transform duration-200", open ? "rotate-0" : "-rotate-90")}
        />
      </button>
      {open && (
        <div className="space-y-0.5">
          {items.map((item) => (
            <NavItem key={item.href} {...item} onClick={onNavClick} />
          ))}
        </div>
      )}
    </div>
  );
}

interface Health { asre: boolean; supabase: boolean; groq: boolean }

function StatusFooter() {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    let alive = true;
    fetch("/api/health")
      .then((r) => r.json())
      .then((d) => { if (alive) setHealth(d); })
      .catch(() => { if (alive) setHealth({ asre: false, supabase: false, groq: false }); });
    return () => { alive = false; };
  }, []);

  const rows: { label: string; ok: boolean | null; up: string; down: string }[] = [
    { label: "ASRE Engine", ok: health?.asre ?? null,     up: "Online",    down: "Offline"  },
    { label: "Supabase",    ok: health?.supabase ?? null, up: "Connected", down: "Down"     },
    { label: "Groq LLM",    ok: health?.groq ?? null,     up: "Active",    down: "Inactive" },
  ];

  return (
    <div className="px-4 py-4 border-t border-white/8 bg-black/15 space-y-2.5">
      <p className="text-[9px] font-extrabold text-blue-400/40 uppercase tracking-[0.14em] mb-2">
        System Status
      </p>
      {rows.map(({ label, ok, up, down }) => {
        const checking = ok === null;
        const color = checking ? "bg-amber-400" : ok ? "bg-green-400" : "bg-red-400";
        const text = checking ? "Checking…" : ok ? up : down;
        return (
          <div key={label} className="flex items-center gap-2 text-[10px]">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              {(checking || ok) && (
                <span className={clsx("animate-ping absolute inline-flex h-full w-full rounded-full opacity-60", color)} />
              )}
              <span className={clsx("relative inline-flex rounded-full h-1.5 w-1.5", color)} />
            </span>
            <span className="text-blue-300/45">{label}:</span>
            <span className="text-white/65 font-semibold">{text}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Account section — auth-aware (user + sign out, or sign-in link) ───────────
function AccountSection({ profile, loading, onNavClick }: {
  profile: Profile | null; loading: boolean; onNavClick?: () => void;
}) {
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const signOut = async () => {
    setSigningOut(true);
    try {
      const supabase = createSupabaseBrowserClient();
      await supabase.auth.signOut();
    } catch { /* ignore — navigate regardless */ }
    onNavClick?.();
    router.push("/login");
    router.refresh();
  };

  // While the profile request is in flight, render nothing to avoid flicker.
  if (loading) {
    return (
      <div className="mb-1 px-3 py-2.5">
        <div className="h-9 rounded-xl bg-white/5 animate-pulse" />
      </div>
    );
  }

  // Signed out → the original sign-in / sign-up link.
  if (!profile) {
    return (
      <NavGroup
        label="Account"
        items={[{ href: "/login", label: "Sign In / Sign Up", icon: LogIn }]}
        collapsed={false}
        onNavClick={onNavClick}
      />
    );
  }

  // Signed in → identity card + sign-out button.
  const display = profile.full_name || profile.username || profile.email || "Account";
  const initial = (display || "?").trim().charAt(0).toUpperCase();

  return (
    <div className="mb-1">
      <p className="px-3 py-1.5 text-[9px] font-extrabold text-blue-400/40 uppercase tracking-[0.15em]">
        Account
      </p>
      <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/8">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-white"
          style={{ background: "linear-gradient(135deg, #0D6B8E 0%, #1E88BE 100%)" }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[12px] font-semibold text-white truncate leading-tight">{display}</p>
          <p className="text-[9px] text-blue-300/45 truncate leading-tight">
            {profile.role === "admin" ? "Administrator" : profile.email || "Signed in"}
          </p>
        </div>
      </div>
      <button
        onClick={signOut}
        disabled={signingOut}
        className="mt-1 w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-blue-200/55 hover:text-white hover:bg-white/6 transition-all duration-150 disabled:opacity-50"
      >
        <LogOut size={14} className="flex-shrink-0 opacity-55" />
        <span>{signingOut ? "Signing out…" : "Sign out"}</span>
      </button>
    </div>
  );
}

function SidebarContent({ profile, loadingProfile, onNavClick }: {
  profile: Profile | null; loadingProfile: boolean; onNavClick?: () => void;
}) {
  const isAdmin = profile?.role === "admin";
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          {/* 3D-style logo icon */}
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1 ring-white/15"
            style={{
              background:  "linear-gradient(135deg, #0D6B8E 0%, #1E88BE 100%)",
              boxShadow:   "0 4px 12px rgba(13,107,142,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
            }}
          >
            <Zap size={17} className="text-white" />
          </div>
          <div>
            <p className="text-[13px] font-extrabold leading-tight tracking-widest text-white">
              DREADNOUGHT
            </p>
            <p className="text-[8px] text-sky/50 leading-tight tracking-[0.16em] uppercase mt-0.5">
              ASRE Platform v2
            </p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
        <NavGroup label="Operations"   items={PRIMARY_NAV}      collapsed={false} onNavClick={onNavClick} />
        <NavGroup label="Intelligence" items={INTELLIGENCE_NAV} collapsed={false} onNavClick={onNavClick} />
        <NavGroup label="Evidence"     items={EVIDENCE_NAV}     collapsed={false} onNavClick={onNavClick} />
        <NavGroup label="Coverage"     items={MAP_NAV}          collapsed={false} onNavClick={onNavClick} />
        {/* CRM + Policy are admin-only — regular users never see them. */}
        {isAdmin && (
          <NavGroup label="CRM"        items={CRM_NAV}          collapsed={false} onNavClick={onNavClick} />
        )}
        <NavGroup
          label="Tools"
          items={isAdmin ? [...TOOLS_NAV, ...ADMIN_TOOLS_NAV] : TOOLS_NAV}
          collapsed={true}
          onNavClick={onNavClick}
        />
        <AccountSection profile={profile} loading={loadingProfile} onNavClick={onNavClick} />
      </nav>

      {/* Status footer — reflects real /api/health state */}
      <StatusFooter />
    </>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const path = usePathname();

  // Load the signed-in user's profile so the sidebar can show their identity
  // and reveal admin-only sections. Re-runs on navigation so it reflects
  // sign-in / sign-out without a hard refresh.
  useEffect(() => {
    let alive = true;
    setLoadingProfile(true);
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => { if (alive) { setProfile(d.user ?? null); setLoadingProfile(false); } })
      .catch(() => { if (alive) { setProfile(null); setLoadingProfile(false); } });
    return () => { alive = false; };
  }, [path]);

  // Landing and auth pages render chrome-free
  if (path === "/" || path === "/login") return null;

  return (
    <>
      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 text-white p-2 rounded-xl shadow-lg"
        style={{ background: "linear-gradient(135deg, #0e2640, #1A3A5C)", border: "1px solid rgba(96,184,224,0.15)" }}
      >
        <Menu size={18} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/60 z-40 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={clsx(
        "md:hidden fixed top-0 left-0 h-full w-64 text-white flex flex-col z-50",
        "transition-transform duration-300 shadow-2xl",
        "bg-sidebar-gradient",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-blue-300/60 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>
        <SidebarContent profile={profile} loadingProfile={loadingProfile} onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex w-60 text-white flex-col shrink-0"
        style={{
          background:   "linear-gradient(180deg, #040c18 0%, #0e2640 40%, #1A3A5C 75%, #0a1f35 100%)",
          borderRight:  "1px solid rgba(255,255,255,0.06)",
          boxShadow:    "4px 0 24px rgba(0,0,0,0.4)",
        }}
      >
        <SidebarContent profile={profile} loadingProfile={loadingProfile} />
      </aside>
    </>
  );
}
