"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NODES = [
  { id: "intent-router",  label: "IntentRouter",  desc: "Validating claim payload",      color: "#60B8E0" },
  { id: "sql-generator",  label: "SQLGenerator",  desc: "Translating to partition SQL",  color: "#22c55e" },
  { id: "execution-cage", label: "ExecutionCage", desc: "Executing against DuckDB",      color: "#a855f7" },
  { id: "adjudicator",    label: "Adjudicator",   desc: "Issuing legal verdict",         color: "#f59e0b" },
];

const NODE_DURATIONS = [480, 620, 780, 520];

interface PipelineTrackerProps {
  active:      boolean;
  onComplete?: () => void;
}

export function PipelineTracker({ active, onComplete }: PipelineTrackerProps) {
  const [completedIdx, setCompletedIdx] = useState(-1);
  const [activeIdx,    setActiveIdx]    = useState(-1);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!active) {
      setCompletedIdx(-1);
      setActiveIdx(-1);
      return;
    }

    setActiveIdx(0);

    let acc = 0;
    NODE_DURATIONS.forEach((dur, i) => {
      const t = setTimeout(() => {
        setActiveIdx(i + 1 < NODES.length ? i + 1 : -1);
        setCompletedIdx(i);
        if (i === NODES.length - 1) onComplete?.();
      }, acc + dur);
      timersRef.current.push(t);
      acc += dur;
    });

    return () => timersRef.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="space-y-3">
      {NODES.map((node, i) => {
        const isDone    = i <= completedIdx;
        const isActive  = i === activeIdx;
        const isPending = !isDone && !isActive;
        const color     = node.color;

        return (
          <div
            key={node.id}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-3 border transition-all duration-400",
              isDone    && "border-green-500/25 bg-green-500/5",
              isActive  && "border-transparent bg-white/5 animate-glow-border",
              isPending && "border-white/6 bg-white/3",
            )}
            style={isActive ? { borderColor: `${color}40`, boxShadow: `0 0 16px ${color}20` } : {}}
          >
            {/* Circle */}
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-xs",
                "transition-all duration-500",
                isDone    && "bg-green-500 text-white",
                isPending && "border border-white/15 text-white/30",
              )}
              style={isActive ? {
                background: `${color}22`,
                border:     `1px solid ${color}60`,
                boxShadow:  `0 0 12px ${color}40`,
                color,
                animation:  "node-pulse 1.2s ease-in-out infinite",
              } : {}}
            >
              {isDone    ? <CheckCircle2 size={15} className="text-white" /> :
               isActive  ? <Loader2 size={13} className="animate-spin" style={{ color }} /> :
               <span>{i + 1}</span>}
            </div>

            {/* Text */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                "text-sm font-bold leading-none transition-colors duration-300",
                isDone    && "text-green-400",
                isPending && "text-white/30",
              )}
              style={isActive ? { color } : {}}>
                {node.label}
              </p>
              <p className={cn(
                "text-[11px] mt-0.5 transition-colors duration-300",
                isDone    && "text-green-500/70",
                isPending && "text-white/20",
              )}
              style={isActive ? { color: `${color}80` } : {}}>
                {node.desc}
              </p>
            </div>

            {/* Status tag */}
            {(isDone || isActive) && (
              <span
                className={cn(
                  "text-[10px] font-bold uppercase tracking-wider flex-shrink-0",
                  isDone   && "text-green-500",
                )}
                style={isActive ? { color, animation: "glow-pulse 1.5s ease-in-out infinite" } : {}}
              >
                {isDone ? "✓ done" : "running"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
