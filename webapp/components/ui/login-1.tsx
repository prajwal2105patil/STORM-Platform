"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Globe from "@/components/ui/globe";
import { motion, AnimatePresence } from "framer-motion";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

// ── AppInput ──────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

function AppInput({ label, ...props }: InputProps) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hover, setHover] = useState(false);

  return (
    <div className="w-full">
      {label && (
        <label className="block mb-1.5 text-[10px] font-bold text-white/40 uppercase tracking-widest">
          {label}
        </label>
      )}
      <div className="relative">
        <input
          className="relative z-10 h-11 w-full rounded-xl border border-white/10 bg-white/[0.03] px-4 text-sm text-white font-light outline-none transition-all duration-200
            focus:border-sky-400/50 focus:bg-white/[0.05]
            placeholder:text-white/25"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
          {...props}
        />
        {/* Cursor-tracking glow on top and bottom border */}
        {hover && (
          <>
            <div
              className="absolute pointer-events-none inset-x-0 top-0 h-px z-20 rounded-t-xl overflow-hidden"
              style={{ background: `radial-gradient(30px circle at ${mouse.x}px 0px, rgba(96,184,224,0.9) 0%, transparent 70%)` }}
            />
            <div
              className="absolute pointer-events-none inset-x-0 bottom-0 h-px z-20 rounded-b-xl overflow-hidden"
              style={{ background: `radial-gradient(30px circle at ${mouse.x}px 1px, rgba(96,184,224,0.6) 0%, transparent 70%)` }}
            />
          </>
        )}
      </div>
    </div>
  );
}

// ── Orbital ring ──────────────────────────────────────────────────────────────
function OrbitRing({ size, duration, ccw = false, opacity = 0.12 }: {
  size: number; duration: number; ccw?: boolean; opacity?: number;
}) {
  return (
    <div
      className="absolute rounded-full border border-sky-400 pointer-events-none"
      style={{
        width:  size,
        height: size,
        opacity,
        animation: `${ccw ? "loginOrbitCCW" : "loginOrbitCW"} ${duration}s linear infinite`,
      }}
    />
  );
}

// ── Stat chip ─────────────────────────────────────────────────────────────────
function StatChip({ value, label, delay }: { value: string; label: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay, duration: 0.5, ease: "easeOut" }}
      className="bg-[#020c1a]/85 border border-sky-400/25 rounded-xl px-3 py-2 text-center backdrop-blur-sm"
    >
      <p className="text-sky-300 text-sm font-bold tabular-nums leading-none">{value}</p>
      <p className="text-white/35 text-[8px] uppercase tracking-wider mt-1 leading-none">{label}</p>
    </motion.div>
  );
}

// ── Social button ─────────────────────────────────────────────────────────────
function SocialButton({ children, label, onClick }: {
  children: React.ReactNode; label: string; onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="w-10 h-10 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-center text-white/40 hover:text-sky-400 hover:border-sky-400/40 hover:bg-sky-400/[0.06] transition-all duration-150"
    >
      {children}
    </button>
  );
}

// ── Google logo (official 4-color mark) ───────────────────────────────────────
function GoogleLogo({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917" />
      <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C16.318 4 9.656 8.337 6.306 14.691" />
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44" />
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002l6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917" />
    </svg>
  );
}

type AuthMode = "signin" | "signup";

// ── Login component ───────────────────────────────────────────────────────────
export default function LoginCard() {
  const router = useRouter();
  const [mode, setMode]       = useState<AuthMode>("signin");
  const [loading, setLoading] = useState<false | "form" | "google">(false);
  const [mouse, setMouse]     = useState({ x: 0, y: 0 });
  const [hover, setHover]     = useState(false);
  const [authError, setAuthError]   = useState<string | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  const isSignup = mode === "signup";

  // Where to land after auth: honour ?next=… set by the middleware, else dashboard.
  const nextTarget = () => {
    if (typeof window === "undefined") return "/dashboard";
    const next = new URLSearchParams(window.location.search).get("next");
    return next && next.startsWith("/") ? next : "/dashboard";
  };

  // Real Supabase email/password auth. Signup also stores username + full name
  // as user metadata, which a DB trigger copies into the `profiles` table.
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (loading) return;
    setAuthError(null);
    setAuthNotice(null);

    const fd       = new FormData(e.currentTarget);
    const email    = ((fd.get("email") as string)    || "").trim();
    const password = ((fd.get("password") as string) || "");
    const username = ((fd.get("username") as string) || "").trim();
    const fullName = ((fd.get("name") as string)     || "").trim();

    if (!email || !password) {
      setAuthError("Enter your email and password.");
      return;
    }
    if (isSignup && password.length < 8) {
      setAuthError("Password must be at least 8 characters.");
      return;
    }

    setLoading("form");
    try {
      const supabase = createSupabaseBrowserClient();

      if (isSignup) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { username, full_name: fullName } },
        });
        if (error) {
          setAuthError(error.message || "Could not create account.");
          setLoading(false);
          return;
        }
        // Email-confirmation OFF → a session is returned immediately.
        // Email-confirmation ON  → no session; user must confirm first.
        if (!data.session) {
          setAuthNotice("Account created. Check your email to confirm, then sign in.");
          setMode("signin");
          setLoading(false);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setAuthError(
            /invalid login/i.test(error.message)
              ? "Invalid email or password."
              : error.message || "Could not sign in."
          );
          setLoading(false);
          return;
        }
      }

      // Session established — refresh server components so the middleware/header
      // pick up the new auth state, then navigate.
      router.push(nextTarget());
      router.refresh();
    } catch {
      setAuthError("Network error. Please try again.");
      setLoading(false);
    }
  };

  // OAuth providers aren't configured in the pilot — point users at email/password.
  const socialUnavailable = () =>
    setAuthError("Social sign-in isn't enabled yet — use email & password below.");

  return (
    <>
      <style>{`
        @keyframes loginOrbitCW  { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
        @keyframes loginOrbitCCW { from { transform: rotate(0deg);   } to { transform: rotate(-360deg); } }
        @keyframes loginSpin     { from { transform: rotate(0deg);   } to { transform: rotate(360deg);  } }
      `}</style>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative flex w-full max-w-5xl min-h-[640px] rounded-2xl overflow-hidden border border-white/[0.07]"
        style={{ boxShadow: "0 0 80px rgba(96,184,224,0.06), 0 32px 80px rgba(0,0,0,0.6)" }}
      >

        {/* ── Left: form ──────────────────────────────────────────── */}
        <div
          className="relative w-full lg:w-[52%] bg-[#040c1a] px-8 lg:px-14 py-10 flex flex-col justify-center overflow-hidden"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setMouse({ x: e.clientX - r.left, y: e.clientY - r.top });
          }}
          onMouseEnter={() => setHover(true)}
          onMouseLeave={() => setHover(false)}
        >
          {/* Cursor-follow glow */}
          <div
            className={`absolute pointer-events-none w-[420px] h-[420px] rounded-full blur-3xl transition-opacity duration-300 bg-gradient-to-br from-sky-500/10 to-blue-700/8 ${hover ? "opacity-100" : "opacity-0"}`}
            style={{ transform: `translate(${mouse.x - 210}px, ${mouse.y - 210}px)`, transition: "transform 0.12s ease-out" }}
          />

          <div className="relative z-10 flex flex-col gap-5">

            {/* Brand mark */}
            <div>
              <div className="flex items-center gap-2.5 mb-5">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "linear-gradient(135deg, #0D6B8E 0%, #1E88BE 100%)", boxShadow: "0 2px 10px rgba(13,107,142,0.55)" }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <span className="text-[10px] font-extrabold tracking-[0.22em] text-white/45 uppercase">DREADNOUGHT ASRE</span>
              </div>
              <h1 className="text-[2rem] font-extrabold text-white tracking-tight leading-none">
                {isSignup ? "Create account" : "Sign in"}
              </h1>
              <p className="text-sm text-white/35 mt-2">
                {isSignup
                  ? "Join the force majeure adjudication platform."
                  : "Access the force majeure adjudication platform."}
              </p>
            </div>

            {/* Google auth — primary OAuth option */}
            <button
              type="button"
              onClick={socialUnavailable}
              disabled={!!loading}
              className="w-full h-11 rounded-xl bg-white text-gray-800 text-sm font-semibold flex items-center justify-center gap-2.5 transition-all duration-200 hover:bg-gray-100 hover:scale-[1.01] hover:shadow-lg hover:shadow-white/10 disabled:opacity-60 disabled:cursor-wait cursor-pointer"
            >
              {loading === "google" ? (
                <span
                  className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-700"
                  style={{ animation: "loginSpin 0.7s linear infinite" }}
                />
              ) : (
                <GoogleLogo />
              )}
              <span>{loading === "google" ? "Connecting…" : `Continue with Google`}</span>
            </button>

            {/* Other providers + divider */}
            <div className="flex items-center gap-3">
              <SocialButton label="Continue with Instagram" onClick={socialUnavailable}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M7.8 2h8.4C19.4 2 22 4.6 22 7.8v8.4a5.8 5.8 0 0 1-5.8 5.8H7.8C4.6 22 2 19.4 2 16.2V7.8A5.8 5.8 0 0 1 7.8 2m-.2 2A3.6 3.6 0 0 0 4 7.6v8.8C4 18.39 5.61 20 7.6 20h8.8a3.6 3.6 0 0 0 3.6-3.6V7.6C20 5.61 18.39 4 16.4 4zm9.65 1.5a1.25 1.25 0 0 1 1.25 1.25A1.25 1.25 0 0 1 17.25 8A1.25 1.25 0 0 1 16 6.75a1.25 1.25 0 0 1 1.25-1.25M12 7a5 5 0 0 1 5 5a5 5 0 0 1-5 5a5 5 0 0 1-5-5a5 5 0 0 1 5-5m0 2a3 3 0 0 0-3 3a3 3 0 0 0 3 3a3 3 0 0 0 3-3a3 3 0 0 0-3-3"/>
                </svg>
              </SocialButton>
              <SocialButton label="Continue with LinkedIn" onClick={socialUnavailable}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M6.94 5a2 2 0 1 1-4-.002a2 2 0 0 1 4 .002M7 8.48H3V21h4zm6.32 0H9.34V21h3.94v-6.57c0-3.66 4.77-4 4.77 0V21H22v-7.93c0-6.17-7.06-5.94-8.72-2.91z"/>
                </svg>
              </SocialButton>
              <SocialButton label="Continue with Facebook" onClick={socialUnavailable}>
                <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M9.198 21.5h4v-8.01h3.604l.396-3.98h-4V7.5a1 1 0 0 1 1-1h3v-4h-3a5 5 0 0 0-5 5v2.01h-2l-.396 3.98h2.396z"/>
                </svg>
              </SocialButton>
              <div className="flex-1 flex items-center gap-2.5">
                <div className="h-px flex-1 bg-white/8" />
                <span className="text-[9px] text-white/25 uppercase tracking-widest whitespace-nowrap">or use email</span>
                <div className="h-px flex-1 bg-white/8" />
              </div>
            </div>

            {/* Fields */}
            <form className="flex flex-col gap-3.5" onSubmit={handleSubmit}>
              <AnimatePresence initial={false}>
                {isSignup && (
                  <motion.div
                    key="signup-fields"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    className="overflow-hidden flex flex-col gap-3.5"
                  >
                    <AppInput
                      type="text"
                      name="name"
                      placeholder="Full name"
                      autoComplete="name"
                      aria-label="Full name"
                      required={isSignup}
                    />
                    <AppInput
                      type="text"
                      name="username"
                      placeholder="Username"
                      autoComplete="username"
                      aria-label="Username"
                      minLength={3}
                      maxLength={32}
                      pattern="[A-Za-z0-9_.\-]+"
                      title="Letters, numbers, and . _ - only"
                      required={isSignup}
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AppInput
                type="email"
                name="email"
                placeholder="Email address"
                autoComplete="email"
                aria-label="Email address"
                required
              />
              <AppInput
                type="password"
                name="password"
                placeholder="Password"
                autoComplete={isSignup ? "new-password" : "current-password"}
                aria-label="Password"
                minLength={8}
                required
              />

              {!isSignup && (
                <div className="flex justify-end mt-0.5">
                  <button
                    type="button"
                    onClick={() => setAuthNotice("Password reset isn't wired up yet — contact the admin to reset.")}
                    className="text-[11px] text-sky-400/55 hover:text-sky-400 transition-colors cursor-pointer"
                  >
                    Forgot password?
                  </button>
                </div>
              )}

              {authError && (
                <p
                  role="alert"
                  className="text-xs text-red-300 bg-red-500/10 border border-red-500/25 rounded-lg px-3 py-2"
                >
                  {authError}
                </p>
              )}
              {authNotice && (
                <p
                  role="status"
                  className="text-xs text-sky-200 bg-sky-500/10 border border-sky-500/25 rounded-lg px-3 py-2"
                >
                  {authNotice}
                </p>
              )}

              <button
                type="submit"
                disabled={!!loading}
                className="group/btn relative w-full overflow-hidden rounded-xl h-11 text-sm font-semibold text-white transition-all duration-300 hover:scale-[1.01] hover:shadow-lg hover:shadow-sky-500/20 disabled:opacity-60 disabled:cursor-wait cursor-pointer mt-1"
                style={{ background: "linear-gradient(135deg, #0D6B8E 0%, #1E88BE 55%, #38bdf8 100%)" }}
              >
                <span className="relative z-10 tracking-wide flex items-center justify-center gap-2">
                  {loading === "form" && (
                    <span
                      className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white"
                      style={{ animation: "loginSpin 0.7s linear infinite" }}
                    />
                  )}
                  {loading === "form"
                    ? (isSignup ? "Creating account…" : "Signing in…")
                    : isSignup ? "Create ASRE account" : "Sign in to ASRE"}
                </span>
                {/* Shimmer sweep */}
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-13deg)_translateX(-100%)] group-hover/btn:duration-700 group-hover/btn:[transform:skew(-13deg)_translateX(100%)]">
                  <div className="relative h-full w-10 bg-white/15" />
                </div>
              </button>
            </form>

            {/* Mode toggle */}
            <p className="text-xs text-white/35 text-center">
              {isSignup ? "Already have an account?" : "Don't have an account?"}{" "}
              <button
                type="button"
                onClick={() => { setMode(isSignup ? "signin" : "signup"); setAuthError(null); setAuthNotice(null); }}
                className="text-sky-400 font-semibold hover:text-sky-300 transition-colors cursor-pointer"
              >
                {isSignup ? "Sign in" : "Create one"}
              </button>
            </p>

            {/* Legal footer */}
            <p className="text-[9px] text-white/18 text-center font-mono tracking-wide">
              NOAA Rule 803(8) · Legal-grade meteorological evidence · Deterministic adjudication
            </p>

          </div>
        </div>

        {/* ── Right: rotating Earth + data theme ──────────────────── */}
        <div className="hidden lg:flex lg:w-[48%] relative overflow-hidden items-center justify-center" style={{ background: "#020810" }}>

          {/* Atmospheric radial glow behind the globe */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: "radial-gradient(ellipse 60% 60% at 50% 52%, rgba(96,184,224,0.08) 0%, transparent 70%)" }}
          />

          {/* Faint coordinate grid */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              opacity: 0.025,
              backgroundImage:
                "linear-gradient(rgba(96,184,224,1) 1px, transparent 1px), linear-gradient(90deg, rgba(96,184,224,1) 1px, transparent 1px)",
              backgroundSize: "40px 40px",
            }}
          />

          {/* Orbital rings — center-stacked via absolute positioning */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <OrbitRing size={320} duration={26}       opacity={0.10} />
            <OrbitRing size={406} duration={40} ccw   opacity={0.07} />
            <OrbitRing size={488} duration={58}       opacity={0.04} />
          </div>

          {/* Rotating Earth — scaled for immersive panel presence */}
          <div className="relative z-10" style={{ transform: "scale(1.35)", transformOrigin: "center" }}>
            <Globe standalone={false} />
          </div>

          {/* Stat chips in four quadrants */}
          <div className="absolute top-[14%] left-[10%] z-20">
            <StatChip value="409" label="NOAA Stations" delay={0.4} />
          </div>
          <div className="absolute top-[18%] right-[8%] z-20">
            <StatChip value="300 km" label="IDW Radius" delay={0.55} />
          </div>
          <div className="absolute bottom-[19%] left-[9%] z-20">
            <StatChip value="<500ms" label="Adjudication" delay={0.7} />
          </div>
          <div className="absolute bottom-[17%] right-[8%] z-20">
            <StatChip value="10 yr" label="Archive Depth" delay={0.85} />
          </div>

          {/* Bottom mission text */}
          <div className="absolute bottom-6 left-0 right-0 text-center z-20 px-6">
            <p className="text-[9px] font-extrabold text-white/30 uppercase tracking-[0.3em]">
              Earth Intelligence Network
            </p>
            <p className="text-[8px] text-sky-400/35 mt-1.5 tracking-widest">
              NOAA ISD · 4 states · Certified meteorological evidence
            </p>
          </div>

        </div>
      </motion.div>
    </>
  );
}
