"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

export default function SignupBackground() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-0 pointer-events-none overflow-hidden",
        "bg-white dark:bg-[#020617]"
      )}
    >
      {/* 
        1. Minimalist Fine Grid 
        Provides a subtle structural tech feel without being overpowering.
      */}
      <div
        className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1]"
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(148,163,184,0.15) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(148,163,184,0.15) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 50%, black 20%, transparent 100%)"
        }}
      />

      {/* 
        2. Two Subtle, Slow-Moving Pastel Glows 
        We use very large blur values and low opacity so it feels like soft ambient light 
        rather than defined shapes.
      */}
      <div className="absolute inset-0 filter blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-50 dark:opacity-30">

        {/* Soft Indigo / Blue ambient light on the left */}
        <motion.div
          className="absolute w-[60vw] max-w-[800px] h-[50vw] max-h-[600px] rounded-[100%] bg-indigo-200 dark:bg-indigo-600/40"
          style={{ top: '10%', left: '-10%' }}
          animate={{
            x: [0, 80, -40, 0],
            y: [0, -60, 40, 0],
            scale: [1, 1.1, 0.9, 1],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Soft Sky / Cyan ambient light on the right */}
        <motion.div
          className="absolute w-[50vw] max-w-[700px] h-[60vw] max-h-[800px] rounded-[100%] bg-sky-200 dark:bg-sky-600/30"
          style={{ bottom: '-5%', right: '-5%' }}
          animate={{
            x: [0, -60, 30, 0],
            y: [0, 50, -50, 0],
            scale: [1, 1.05, 0.95, 1],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* 
        3. A few tiny, extremely slow drifting sparks 
        Just enough movement to show it's alive, but not distracting.
      */}
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={`spark-${i}`}
          className="absolute rounded-full bg-slate-300 dark:bg-slate-500"
          style={{
            width: `${Math.random() * 2 + 1}px`,
            height: `${Math.random() * 2 + 1}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{
            y: [0, -40, 0],
            opacity: [0, 0.4, 0],
          }}
          transition={{
            duration: Math.random() * 8 + 8,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut"
          }}
        />
      ))}

    </div>
  )
}
