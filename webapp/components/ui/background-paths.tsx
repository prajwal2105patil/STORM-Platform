"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";

// Deterministic durations — Math.random() causes SSR hydration mismatch
const PATH_DURATIONS = Array.from({ length: 36 }, (_, i) => 20 + ((i * 7 + 3) % 10) + i * 0.15);

export function FloatingPaths({ position }: { position: number }) {
    const paths = Array.from({ length: 36 }, (_, i) => ({
        id: i,
        d: `M-${380 - i * 5 * position} -${189 + i * 6}C-${
            380 - i * 5 * position
        } -${189 + i * 6} -${312 - i * 5 * position} ${216 - i * 6} ${
            152 - i * 5 * position
        } ${343 - i * 6}C${616 - i * 5 * position} ${470 - i * 6} ${
            684 - i * 5 * position
        } ${875 - i * 6} ${684 - i * 5 * position} ${875 - i * 6}`,
        width: 0.5 + i * 0.03,
    }));

    return (
        <div className="absolute inset-0 pointer-events-none">
            <svg
                className="w-full h-full"
                viewBox="0 0 696 316"
                fill="none"
                aria-hidden="true"
            >
                {paths.map((path) => (
                    <motion.path
                        key={path.id}
                        d={path.d}
                        stroke="rgba(96,184,224,1)"
                        strokeWidth={path.width}
                        strokeOpacity={0.06 + path.id * 0.012}
                        initial={{ pathLength: 0.3, opacity: 0.6 }}
                        animate={{
                            pathLength: 1,
                            opacity: [0.3, 0.6, 0.3],
                            pathOffset: [0, 1, 0],
                        }}
                        transition={{
                            duration: PATH_DURATIONS[path.id],
                            repeat: Infinity,
                            ease: "linear",
                        }}
                    />
                ))}
            </svg>
        </div>
    );
}

export function BackgroundPaths({ title = "Force Majeure Adjudicated" }: { title?: string }) {
    const words = title.split(" ");

    return (
        <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-[#040810]">
            <div className="absolute inset-0">
                <FloatingPaths position={1} />
                <FloatingPaths position={-1} />
            </div>

            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background:
                        "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(13,107,142,0.18) 0%, transparent 70%)",
                }}
            />

            <div className="relative z-10 container mx-auto px-4 md:px-6 text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 2 }}
                    className="max-w-4xl mx-auto"
                >
                    <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold mb-8 tracking-tighter">
                        {words.map((word, wordIndex) => (
                            <span
                                key={wordIndex}
                                className="inline-block mr-4 last:mr-0"
                            >
                                {word.split("").map((letter, letterIndex) => (
                                    <motion.span
                                        key={`${wordIndex}-${letterIndex}`}
                                        initial={{ y: 100, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{
                                            delay:
                                                wordIndex * 0.1 +
                                                letterIndex * 0.03,
                                            type: "spring",
                                            stiffness: 150,
                                            damping: 25,
                                        }}
                                        className="inline-block text-transparent bg-clip-text bg-gradient-to-r from-white to-sky-300/80"
                                    >
                                        {letter}
                                    </motion.span>
                                ))}
                            </span>
                        ))}
                    </h1>

                    <div
                        className="inline-block group relative bg-gradient-to-b from-sky-400/20 to-sky-600/10
                        p-px rounded-2xl backdrop-blur-lg overflow-hidden shadow-lg
                        hover:shadow-xl transition-shadow duration-300"
                    >
                        <Link href="/adjudicate">
                            <Button
                                variant="ghost"
                                className="rounded-[1.15rem] px-8 py-6 text-lg font-semibold
                                backdrop-blur-md bg-sky-950/90 hover:bg-sky-900/95
                                text-sky-100 hover:text-white transition-all duration-300
                                group-hover:-translate-y-0.5 border border-sky-400/20
                                hover:shadow-md"
                            >
                                <span className="opacity-90 group-hover:opacity-100 transition-opacity">
                                    Discover Excellence
                                </span>
                                <span
                                    className="ml-3 opacity-70 group-hover:opacity-100
                                    group-hover:translate-x-1.5 transition-all duration-300"
                                >
                                    →
                                </span>
                            </Button>
                        </Link>
                    </div>
                </motion.div>
            </div>
        </div>
    );
}
