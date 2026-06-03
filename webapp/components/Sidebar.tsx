"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Users, BarChart3,
  Zap, Shield, Settings, ChevronRight,
} from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { href: "/",            label: "Dashboard",   icon: LayoutDashboard },
  { href: "/claims",      label: "Claims",      icon: FileText        },
  { href: "/adjudicate",  label: "Adjudicate",  icon: Zap             },
  { href: "/customers",   label: "Customers",   icon: Users           },
  { href: "/analytics",   label: "Analytics",   icon: BarChart3       },
  { href: "/policy",      label: "Policy",      icon: Shield          },
];

export default function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-60 bg-[#1A3A5C] text-white flex flex-col shrink-0">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#0D6B8E] flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">DREADNOUGHT</p>
            <p className="text-[10px] text-blue-200 leading-tight">ASRE Platform v2</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== "/" && path.startsWith(href));
          return (
            <Link key={href} href={href}
              className={clsx(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all",
                active
                  ? "bg-[#0D6B8E] text-white font-medium"
                  : "text-blue-100 hover:bg-white/10"
              )}>
              <Icon size={16} />
              {label}
              {active && <ChevronRight size={14} className="ml-auto opacity-60" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-white/10">
        <div className="text-[10px] text-blue-300 space-y-0.5">
          <p className="font-semibold text-blue-200">System Status</p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            ASRE Engine: Online
          </p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Supabase: Connected
          </p>
          <p className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
            Groq LLM: Active
          </p>
        </div>
      </div>
    </aside>
  );
}
