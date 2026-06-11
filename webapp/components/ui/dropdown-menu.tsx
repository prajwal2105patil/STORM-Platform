"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";

// ── Context ───────────────────────────────────────────────────────────────────

interface DropdownCtx { open: boolean; setOpen: (v: boolean) => void }
const Ctx = React.createContext<DropdownCtx>({ open: false, setOpen: () => {} });

// ── Root ──────────────────────────────────────────────────────────────────────

function DropdownMenu({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <Ctx.Provider value={{ open, setOpen }}>
      <div ref={ref} className="relative inline-block">{children}</div>
    </Ctx.Provider>
  );
}

// ── Trigger ───────────────────────────────────────────────────────────────────

function DropdownMenuTrigger({ asChild, children }: { asChild?: boolean; children: React.ReactNode }) {
  const { open, setOpen } = React.useContext(Ctx);
  if (asChild && React.isValidElement(children)) {
    return React.cloneElement(children as React.ReactElement<any>, {
      onClick: (e: React.MouseEvent) => {
        e.stopPropagation();
        setOpen(!open);
        (children as React.ReactElement<any>).props.onClick?.(e);
      },
    });
  }
  return (
    <button onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
      {children}
    </button>
  );
}

// ── Content ───────────────────────────────────────────────────────────────────

function DropdownMenuContent({
  children, align = "start", className,
}: {
  children: React.ReactNode; align?: "start" | "end"; className?: string;
}) {
  const { open } = React.useContext(Ctx);
  if (!open) return null;
  return (
    <div
      className={cn(
        "absolute z-50 mt-1 min-w-[180px] rounded-xl border border-white/12 bg-[#0a1f38] shadow-2xl py-1",
        "animate-in fade-in-0 zoom-in-95",
        align === "end" ? "right-0" : "left-0",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

// ── Label ─────────────────────────────────────────────────────────────────────

function DropdownMenuLabel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-white/35", className)}>
      {children}
    </div>
  );
}

// ── Separator ─────────────────────────────────────────────────────────────────

function DropdownMenuSeparator({ className }: { className?: string }) {
  return <div className={cn("my-1 border-t border-white/8", className)} />;
}

// ── CheckboxItem ──────────────────────────────────────────────────────────────

function DropdownMenuCheckboxItem({
  children, checked, onCheckedChange, className,
}: {
  children: React.ReactNode;
  checked?: boolean;
  onCheckedChange?: (v: boolean) => void;
  className?: string;
}) {
  return (
    <button
      role="menuitemcheckbox"
      aria-checked={checked}
      onClick={() => onCheckedChange?.(!checked)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors text-left",
        className
      )}
    >
      <span className={cn(
        "w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 transition-colors",
        checked ? "bg-sky/80 border-sky/60" : "border-white/20 bg-transparent"
      )}>
        {checked && <Check size={10} className="text-white" />}
      </span>
      {children}
    </button>
  );
}

// ── Item ──────────────────────────────────────────────────────────────────────

function DropdownMenuItem({
  children, onClick, className,
}: {
  children: React.ReactNode; onClick?: () => void; className?: string;
}) {
  const { setOpen } = React.useContext(Ctx);
  return (
    <button
      role="menuitem"
      onClick={() => { onClick?.(); setOpen(false); }}
      className={cn("w-full text-left px-3 py-2 text-sm text-white/70 hover:text-white hover:bg-white/6 transition-colors", className)}
    >
      {children}
    </button>
  );
}

export {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuCheckboxItem, DropdownMenuItem,
};
