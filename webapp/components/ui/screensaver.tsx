"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Globe from "@/components/ui/globe";

const IDLE_MS = 2 * 60 * 1000; // 2 minutes

const WATCH_EVENTS = [
  "mousedown", "mousemove", "keydown",
  "touchstart", "scroll", "click", "wheel",
] as const;

export function Screensaver() {
  const [idle, setIdle] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;

    const wake = () => {
      setIdle(false);
      clearTimeout(timer);
      timer = setTimeout(() => setIdle(true), IDLE_MS);
    };

    WATCH_EVENTS.forEach((e) =>
      document.addEventListener(e, wake, { passive: true })
    );
    // Start the initial countdown
    timer = setTimeout(() => setIdle(true), IDLE_MS);

    return () => {
      clearTimeout(timer);
      WATCH_EVENTS.forEach((e) => document.removeEventListener(e, wake));
    };
  }, []);

  return (
    <AnimatePresence>
      {idle && (
        <motion.div
          key="screensaver"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.2, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] bg-white flex flex-col items-center justify-center cursor-pointer select-none"
          onClick={() => setIdle(false)}
          onKeyDown={() => setIdle(false)}
          role="button"
          tabIndex={0}
          aria-label="Screensaver — click to return"
        >
          {/* Subtle radial light behind the globe */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(96,184,224,0.08) 0%, transparent 70%)",
            }}
          />

          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1,    opacity: 1 }}
            exit={{ scale: 0.85,    opacity: 0 }}
            transition={{ duration: 1.4, ease: "easeOut" }}
            className="relative"
          >
            <Globe standalone={false} />
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="mt-10 text-xs text-gray-400 font-mono tracking-[0.25em] uppercase animate-pulse"
          >
            Click anywhere to continue
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ delay: 1.2, duration: 0.8 }}
            className="mt-2 text-[10px] text-gray-300 font-mono tracking-widest"
          >
            DREADNOUGHT ASRE · NOAA ISD NETWORK
          </motion.p>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
