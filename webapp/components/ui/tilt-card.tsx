"use client";
import { useRef, MouseEvent, ReactNode } from "react";
import { cn } from "@/lib/utils";

interface TiltCardProps {
  children: ReactNode;
  className?: string;
  intensity?: number;
  glare?: boolean;
  scale?: number;
}

export function TiltCard({
  children,
  className,
  intensity = 7,
  glare = true,
  scale = 1.02,
}: TiltCardProps) {
  const cardRef  = useRef<HTMLDivElement>(null);
  const glareRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const dx = (e.clientX - cx) / (rect.width  / 2);
    const dy = (e.clientY - cy) / (rect.height / 2);

    card.style.transform = `perspective(900px) rotateY(${dx * intensity}deg) rotateX(${-dy * intensity}deg) scale(${scale})`;

    if (glare && glareRef.current) {
      const gx = ((e.clientX - rect.left) / rect.width)  * 100;
      const gy = ((e.clientY - rect.top)  / rect.height) * 100;
      glareRef.current.style.background =
        `radial-gradient(circle at ${gx}% ${gy}%, rgba(255,255,255,0.14) 0%, transparent 65%)`;
      glareRef.current.style.opacity = "1";
    }
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.transform =
      "perspective(900px) rotateY(0deg) rotateX(0deg) scale(1)";
    if (glare && glareRef.current) {
      glareRef.current.style.opacity = "0";
    }
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn("relative will-change-transform", className)}
      style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.08s ease-out",
      }}
    >
      {children}
      {glare && (
        <div
          ref={glareRef}
          className="absolute inset-0 rounded-[inherit] pointer-events-none z-20 opacity-0 transition-opacity duration-200"
        />
      )}
    </div>
  );
}
