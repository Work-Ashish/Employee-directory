"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

/* ------------------------------------------------------------------ */
/*  Orb configuration — 6 ambient glow orbs                          */
/* ------------------------------------------------------------------ */
const ORBS = [
  {
    className: "top-[5%] left-[8%] w-[320px] h-[320px]",
    color: "bg-[rgba(0,122,255,0.18)] dark:bg-[rgba(10,132,255,0.12)]",
    duration: 18,
    yKeyframes: [0, -20, 10, 0],
  },
  {
    className: "top-[2%] right-[10%] w-[260px] h-[260px]",
    color: "bg-[rgba(175,82,222,0.14)] dark:bg-[rgba(191,90,242,0.10)]",
    duration: 22,
    yKeyframes: [0, -15, 12, 0],
  },
  {
    className: "bottom-[8%] left-[35%] w-[400px] h-[400px]",
    color: "bg-[rgba(90,200,250,0.14)] dark:bg-[rgba(100,210,255,0.10)]",
    duration: 25,
    yKeyframes: [0, -18, 8, 0],
  },
  {
    className: "top-[40%] left-[60%] w-[240px] h-[240px]",
    color: "bg-[rgba(0,122,255,0.12)] dark:bg-[rgba(10,132,255,0.08)]",
    duration: 20,
    yKeyframes: [0, -12, 16, 0],
  },
  {
    className: "bottom-[25%] right-[5%] w-[180px] h-[180px]",
    color: "bg-[rgba(175,82,222,0.16)] dark:bg-[rgba(191,90,242,0.10)]",
    duration: 16,
    yKeyframes: [0, -20, 6, 0],
  },
  {
    className: "top-[60%] left-[5%] w-[300px] h-[300px]",
    color: "bg-[rgba(90,200,250,0.12)] dark:bg-[rgba(100,210,255,0.08)]",
    duration: 23,
    yKeyframes: [0, -14, 10, 0],
  },
]

/* ------------------------------------------------------------------ */
/*  Particle configuration — 12 small floating dots                   */
/* ------------------------------------------------------------------ */
const PARTICLE_COLORS = [
  "bg-[rgba(0,122,255,0.6)] dark:bg-[rgba(10,132,255,0.5)]",
  "bg-[rgba(175,82,222,0.6)] dark:bg-[rgba(191,90,242,0.5)]",
  "bg-[rgba(90,200,250,0.6)] dark:bg-[rgba(100,210,255,0.5)]",
]

const PARTICLES = [
  { top: "8%", left: "12%", size: "w-1 h-1", duration: 7, delay: 0 },
  { top: "15%", left: "78%", size: "w-1.5 h-1.5", duration: 8, delay: 0.5 },
  { top: "25%", left: "45%", size: "w-1 h-1", duration: 6, delay: 1.2 },
  { top: "35%", left: "90%", size: "w-1.5 h-1.5", duration: 9, delay: 0.3 },
  { top: "48%", left: "22%", size: "w-1 h-1", duration: 7.5, delay: 1.8 },
  { top: "55%", left: "65%", size: "w-1.5 h-1.5", duration: 10, delay: 0.8 },
  { top: "62%", left: "8%", size: "w-1 h-1", duration: 6.5, delay: 2.1 },
  { top: "70%", left: "52%", size: "w-1.5 h-1.5", duration: 8.5, delay: 1.0 },
  { top: "78%", left: "85%", size: "w-1 h-1", duration: 7, delay: 1.5 },
  { top: "82%", left: "30%", size: "w-1.5 h-1.5", duration: 9.5, delay: 0.6 },
  { top: "90%", left: "70%", size: "w-1 h-1", duration: 6, delay: 2.0 },
  { top: "5%", left: "55%", size: "w-1.5 h-1.5", duration: 8, delay: 1.3 },
]

/* ------------------------------------------------------------------ */
/*  SVG network node positions for geometric line layers              */
/* ------------------------------------------------------------------ */
const NETWORK_NODES_A = [
  [80, 120],
  [220, 60],
  [380, 140],
  [500, 80],
  [640, 160],
  [780, 100],
  [920, 180],
  [1060, 90],
  [1200, 150],
  [1340, 70],
  [1480, 130],
] as const

const NETWORK_EDGES_A = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
  [5, 6], [6, 7], [7, 8], [8, 9], [9, 10],
  [0, 2], [1, 3], [3, 5], [5, 7], [7, 9],
  [2, 4], [4, 6], [6, 8], [8, 10],
] as const

const NETWORK_NODES_B = [
  [120, 200],
  [300, 260],
  [460, 220],
  [600, 300],
  [740, 240],
  [880, 280],
  [1020, 210],
  [1160, 290],
  [1300, 230],
  [1440, 270],
] as const

const NETWORK_EDGES_B = [
  [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
  [5, 6], [6, 7], [7, 8], [8, 9],
  [0, 2], [1, 3], [2, 4], [4, 6], [6, 8],
  [3, 5], [5, 7], [7, 9],
] as const

/* ------------------------------------------------------------------ */
/*  Helper: build SVG path string from nodes + edges                  */
/* ------------------------------------------------------------------ */
function buildNetworkPath(
  nodes: ReadonlyArray<readonly [number, number]>,
  edges: ReadonlyArray<readonly [number, number]>,
): string {
  return edges
    .map(([from, to]) => {
      const [x1, y1] = nodes[from]
      const [x2, y2] = nodes[to]
      return `M${x1},${y1} L${x2},${y2}`
    })
    .join(" ")
}

/* ================================================================== */
/*  SignupBackground                                                   */
/* ================================================================== */
export default function SignupBackground() {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "fixed inset-0 z-0 pointer-events-none overflow-hidden",
        "bg-gradient-to-br",
      )}
      style={{
        background:
          "linear-gradient(-45deg, rgba(0,122,255,0.08), rgba(175,82,222,0.06), rgba(90,200,250,0.08), #eef0f8)",
        backgroundSize: "400% 400%",
        animation: "meshGradient 15s ease infinite",
      }}
    >
      {/* Dark-mode overlay — CSS will swap via .dark parent */}
      <div
        className="absolute inset-0 hidden dark:block"
        style={{
          background:
            "linear-gradient(-45deg, rgba(10,132,255,0.06), rgba(191,90,242,0.04), rgba(100,210,255,0.06), #000000)",
          backgroundSize: "400% 400%",
          animation: "meshGradient 15s ease infinite",
        }}
      />

      {/* ---- Floating orbs ---- */}
      {ORBS.map((orb, i) => (
        <motion.div
          key={`orb-${i}`}
          className={cn(
            "absolute rounded-full filter blur-[80px]",
            orb.className,
            orb.color,
          )}
          animate={{
            y: orb.yKeyframes,
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: orb.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ---- Floating particles ---- */}
      {PARTICLES.map((p, i) => (
        <motion.div
          key={`particle-${i}`}
          className={cn(
            "absolute rounded-full",
            p.size,
            PARTICLE_COLORS[i % PARTICLE_COLORS.length],
          )}
          style={{ top: p.top, left: p.left }}
          animate={{
            y: [0, -60, 0],
            opacity: [0.15, 0.6, 0.15],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* ---- SVG network layer A ---- */}
      <motion.svg
        className="absolute top-0 left-0 w-[200%] h-full"
        viewBox="0 0 1600 400"
        preserveAspectRatio="none"
        animate={{ x: [0, -200, 0] }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <path
          d={buildNetworkPath(NETWORK_NODES_A, NETWORK_EDGES_A)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeOpacity="0.08"
        />
        {NETWORK_NODES_A.map(([x, y], i) => (
          <circle
            key={`nodeA-${i}`}
            cx={x}
            cy={y}
            r="2"
            fill="var(--accent)"
            fillOpacity="0.10"
          />
        ))}
      </motion.svg>

      {/* ---- SVG network layer B ---- */}
      <motion.svg
        className="absolute bottom-0 left-0 w-[200%] h-full"
        viewBox="0 0 1600 400"
        preserveAspectRatio="none"
        animate={{ x: [-100, 100, -100] }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
      >
        <path
          d={buildNetworkPath(NETWORK_NODES_B, NETWORK_EDGES_B)}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="1"
          strokeOpacity="0.12"
        />
        {NETWORK_NODES_B.map(([x, y], i) => (
          <circle
            key={`nodeB-${i}`}
            cx={x}
            cy={y}
            r="2"
            fill="var(--accent)"
            fillOpacity="0.12"
          />
        ))}
      </motion.svg>
    </div>
  )
}
