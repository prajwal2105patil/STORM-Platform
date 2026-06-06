"use client";
import { useEffect, useRef, useState } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const NODES = [
  { id: "intent-router",   label: "IntentRouter",   desc: "Validating claim payload"      },
  { id: "sql-generator",   label: "SQLGenerator",   desc: "Translating to partition SQL"  },
  { id: "execution-cage",  label: "ExecutionCage",  desc: "Executing against DuckDB"      },
  { id: "adjudicator",     label: "Adjudicator",    desc: "Issuing legal verdict"         },
];

// Each node gets progressively more time to feel realistic
const NODE_DURATIONS = [480, 620, 780, 520]; // ms

interface PipelineTrackerProps {
  active: boolean;
  onComplete?: () => void;
}

export function PipelineTracker({ active, onComplete }: PipelineTrackerProps) {
  const [completedIdx, setCompletedIdx] = useState(-1);
  const [activeIdx,    setActiveIdx]    = useState(-1);
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Clear previous timers
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (!active) {
      setCompletedIdx(-1);
      setActiveIdx(-1);
      return;
    }

    setActiveIdx(0);

    let accumulated = 0;
    NODE_DURATIONS.forEach((dur, i) => {
      const activateNext = setTimeout(() => {
        setActiveIdx(i + 1 < NODES.length ? i + 1 : -1);
        setCompletedIdx(i);
        if (i === NODES.length - 1) onComplete?.();
      }, accumulated + dur);
      timersRef.current.push(activateNext);
      accumulated += dur;
    });

    return () => timersRef.current.forEach(clearTimeout);
  }, [active]);

  return (
    <div className="space-y-2.5">
      {NODES.map((node, i) => {
        const isDone    = i <= completedIdx;
        const isActive  = i === activeIdx;
        const isPending = !isDone && !isActive;

        return (
          <div key={node.id} className="flex items-center gap-3">
            {/* Node circle */}
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-500 text-xs font-bold",
                isDone   && "bg-green-500 text-white",
                isActive && "bg-[#1A3A5C] text-white animate-[node-pulse_1.2s_ease-in-out_infinite]",
                isPending && "bg-gray-100 text-gray-400 border border-gray-200",
              )}
            >
              {isDone   ? <CheckCircle2 size={14} className="text-white" /> :
               isActive ? <Loader2 size={13} className="animate-spin" /> :
               <span>{i + 1}</span>}
            </div>

            {/* Label + desc */}
            <div className="min-w-0 flex-1">
              <p className={cn(
                "text-sm font-medium leading-none transition-colors duration-300",
                isDone   && "text-green-700",
                isActive && "text-[#1A3A5C] font-bold",
                isPending && "text-gray-400",
              )}>
                {node.label}
              </p>
              <p className={cn(
                "text-[11px] mt-0.5 transition-colors duration-300",
                isDone   && "text-green-600",
                isActive && "text-[#0D6B8E]",
                isPending && "text-gray-300",
              )}>
                {node.desc}
              </p>
            </div>

            {/* Status tag */}
            {(isDone || isActive) && (
              <span className={cn(
                "text-[10px] font-semibold uppercase tracking-wide flex-shrink-0 transition-all",
                isDone   && "text-green-500",
                isActive && "text-[#0D6B8E] animate-pulse",
              )}>
                {isDone ? "✓ done" : "running"}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
