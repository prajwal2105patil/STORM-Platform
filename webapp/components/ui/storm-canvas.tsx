"use client";
import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  r: number;
  opacity: number;
  color: string;
  pulse: number;
  pulseSpeed: number;
}

const COLORS = [
  "#60B8E0", "#0D6B8E", "#1E88BE",
  "#ffffff", "#22c55e", "#38bdf8",
];

export function StormCanvas({ className }: { className?: string }) {
  const canvasRef  = useRef<HTMLCanvasElement>(null);
  const mouseRef   = useRef({ x: -9999, y: -9999 });
  const stateRef   = useRef<{
    particles: Particle[];
    W: number;
    H: number;
    animId: number;
  }>({ particles: [], W: 0, H: 0, animId: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const state = stateRef.current;

    const buildParticles = (W: number, H: number) => {
      const N = Math.min(Math.floor((W * H) / 7000), 200);
      state.particles = Array.from({ length: N }, () => ({
        x:          Math.random() * W,
        y:          Math.random() * H,
        vx:         (Math.random() - 0.5) * 0.45,
        vy:         (Math.random() - 0.5) * 0.45,
        r:          Math.random() * 2.0 + 0.4,
        opacity:    Math.random() * 0.55 + 0.08,
        color:      COLORS[Math.floor(Math.random() * COLORS.length)],
        pulse:      Math.random() * Math.PI * 2,
        pulseSpeed: 0.01 + Math.random() * 0.02,
      }));
    };

    const resize = () => {
      state.W = canvas.offsetWidth;
      state.H = canvas.offsetHeight;
      canvas.width  = state.W;
      canvas.height = state.H;
      buildParticles(state.W, state.H);
    };
    resize();

    const draw = () => {
      const { W, H, particles } = state;
      ctx.clearRect(0, 0, W, H);
      const mouse = mouseRef.current;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        // Pulse opacity
        p.pulse += p.pulseSpeed;
        const displayOpacity = p.opacity * (0.7 + 0.3 * Math.sin(p.pulse));

        // Gentle mouse pull
        const dx = mouse.x - p.x;
        const dy = mouse.y - p.y;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < 40000 && dist2 > 0) {
          const dist = Math.sqrt(dist2);
          p.vx += (dx / dist) * 0.009;
          p.vy += (dy / dist) * 0.009;
        }

        // Damping + position
        p.vx *= 0.988;
        p.vy *= 0.988;
        p.x  += p.vx;
        p.y  += p.vy;

        // Wrap edges
        if (p.x < 0)  p.x = W;
        if (p.x > W)  p.x = 0;
        if (p.y < 0)  p.y = H;
        if (p.y > H)  p.y = 0;

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        const hex = Math.round(displayOpacity * 255).toString(16).padStart(2, "0");
        ctx.fillStyle = p.color + hex;
        ctx.fill();

        // Connect nearby pairs
        for (let j = i + 1; j < particles.length; j++) {
          const q = particles[j];
          const ddx = p.x - q.x;
          const ddy = p.y - q.y;
          const d2  = ddx * ddx + ddy * ddy;
          if (d2 < 14400) { // 120px
            const alpha = (1 - Math.sqrt(d2) / 120) * 0.13;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.strokeStyle = `rgba(96,184,224,${alpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      }

      state.animId = requestAnimationFrame(draw);
    };

    draw();

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    const onResize = () => resize();

    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(state.animId);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block" }}
    />
  );
}
