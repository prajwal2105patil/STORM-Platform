"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Users, BarChart3, Zap, Shield,
  ChevronRight, Search, Calculator, BookOpen, ChevronDown, Menu, X,
} from "lucide-react";
import { clsx } from "clsx";
import { useState } from "react";

const PRIMARY_NAV = [
  { href: "/",           label: "Dashboard",  icon: LayoutDashboard },
  { href: "/adjudicate", label: "Adjudicate", icon: Zap             },
  { href: "/claims",     label: "Claims",     icon: FileText        },
];

const INTELLIGENCE_NAV = [
  { href: "/analytics",  label: "Analytics",   icon: BarChart3 },
  { href: "/query",      label: "Weather Q&A", icon: Search    },
];

const CRM_NAV = [
  { href: "/customers",  label: "Customers",  icon: Users },
];

const TOOLS_NAV = [
  { href: "/sla",       label: "SLA Calc", icon: Calculator },
  { href: "/api-docs",  label: "API Docs", icon: BookOpen   },
  { href: "/policy",    label: "Policy",   icon: Shield     },
];

function NavItem({ href, label, icon: Icon, onClick }: { href: string; label: string; icon: any; onClick?: () => void }) {
  const path = usePathname();
  const active = path === href || (href !== "/" && path.startsWith(href));
  return (
    <Link href={href} onClick={onClick}
      className={clsx(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150",
        active
          ? "bg-white/15 text-white font-semibold shadow-sm border border-white/10"
          : "text-blue-200/70 hover:text-white hover:bg-white/8"
      )}>
      <Icon size={15} className={active ? "text-sky" : "opacity-70"} />
      <span>{label}</span>
      {active && <ChevronRight size={12} className="ml-auto text-sky/60" />}
    </Link>
  );
}

function NavGroup({ label, items, collapsed = false, onNavClick }: {
  label: string; items: typeof PRIMARY_NAV; collapsed?: boolean; onNavClick?: () => void;
}) {
  const [open, setOpen] = useState(!collapsed);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-3 py-1.5 text-[9px] font-bold text-blue-400/55 uppercase tracking-[0.14em] hover:text-blue-300 transition-colors">
        {label}
        <ChevronDown size={9} className={clsx("transition-transform duration-200", open ? "rotate-0" : "-rotate-90")} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {items.map((item) => <NavItem key={item.href} {...item} onClick={onNavClick} />)}
        </div>
      )}
    </div>
  );
}

function SidebarContent({ onNavClick }: { onNavClick?: () => void }) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0D6B8E] to-[#1E88BE] flex items-center justify-center shadow-teal-md ring-1 ring-white/20 flex-shrink-0">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-extrabold leading-tight tracking-wide text-white">DREADNOUGHT</p>
            <p className="text-[9px] text-sky/60 leading-tight tracking-[0.14em] uppercase mt-0.5">ASRE Platform v2</p>
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 px-3 py-4 space-y-3 overflow-y-auto">
        <NavGroup label="Operations"   items={PRIMARY_NAV}      collapsed={false} onNavClick={onNavClick} />
        <NavGroup label="Intelligence" items={INTELLIGENCE_NAV} collapsed={false} onNavClick={onNavClick} />
        <NavGroup label="CRM"          items={CRM_NAV}          collapsed={false} onNavClick={onNavClick} />
        <NavGroup label="Tools"        items={TOOLS_NAV}        collapsed={true}  onNavClick={onNavClick} />
      </nav>

      {/* Status footer */}
      <div className="px-4 py-4 border-t border-white/10 bg-black/10 space-y-2.5">
        <p className="text-[9px] font-bold text-blue-400/55 uppercase tracking-[0.12em] mb-1">System Status</p>
        {[
          { label: "ASRE Engine",  status: "Online"    },
          { label: "Supabase",     status: "Connected" },
          { label: "Groq LLM",     status: "Active"    },
        ].map(({ label, status }) => (
          <div key={label} className="flex items-center gap-2 text-[10px]">
            <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-400" />
            </span>
            <span className="text-blue-300/60">{label}:</span>
            <span className="text-white/75 font-medium">{status}</span>
          </div>
        ))}
      </div>
    </>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-4 left-4 z-50 bg-[#1A3A5C] text-white p-2 rounded-lg shadow-lg">
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside className={clsx(
        "md:hidden fixed top-0 left-0 h-full w-64 bg-sidebar-gradient text-white flex flex-col z-50 transition-transform duration-300 shadow-2xl",
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <button
          onClick={() => setMobileOpen(false)}
          className="absolute top-4 right-4 text-blue-300/70 hover:text-white transition-colors">
          <X size={20} />
        </button>
        <SidebarContent onNavClick={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 bg-sidebar-gradient text-white flex-col shrink-0 shadow-xl">
        <SidebarContent />
      </aside>
    </>
  );
}
