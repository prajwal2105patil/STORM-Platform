"use client";
import { useEffect, useRef, useState } from "react";

interface AnimatedCounterProps {
  value: number;
  duration?: number;       // ms
  suffix?: string;
  prefix?: string;
  decimals?: number;
  className?: string;
}

export function AnimatedCounter({
  value,
  duration = 1200,
  suffix = "",
  prefix = "",
  decimals = 0,
  className,
}: AnimatedCounterProps) {
  const [display, setDisplay] = useState(0);
  // Track the value we're actually showing. Animating FROM this ref (updated
  // only inside the rAF callback) makes the counter resilient to React
  // StrictMode's double effect-invoke: the cancelled first pass never advances
  // displayRef, so the second pass still animates 0 -> value instead of
  // short-circuiting on from === to and freezing at 0.
  const displayRef = useRef(0);

  useEffect(() => {
    const from = displayRef.current;
    const to   = value;

    if (from === to) {
      setDisplay(to);
      return;
    }

    let raf = 0;
    let start: number | null = null;

    const animate = (timestamp: number) => {
      if (start === null) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased    = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current  = from + (to - from) * eased;
      displayRef.current = current;
      setDisplay(current);

      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      } else {
        displayRef.current = to;
        setDisplay(to);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  const formatted = decimals > 0
    ? display.toFixed(decimals)
    : Math.round(display).toLocaleString();

  return (
    <span className={className}>
      {prefix}{formatted}{suffix}
    </span>
  );
}
