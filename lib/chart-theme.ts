/**
 * Shared Recharts theme configuration.
 * Uses CSS variables for automatic dark mode support.
 */

export const chartColors = {
  primary: "var(--accent)",
  secondary: "var(--purple)",
  success: "var(--green)",
  warning: "var(--amber)",
  danger: "var(--red)",
  info: "var(--blue)",
  muted: "var(--text4)",
  palette: [
    "var(--accent)",
    "var(--purple)",
    "var(--green)",
    "var(--amber)",
    "var(--blue)",
    "var(--pink)",
    "var(--cyan)",
  ],
}

export const tooltipStyle = {
  contentStyle: {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: "10px",
    boxShadow: "var(--shadow-md)",
    padding: "10px 14px",
    fontSize: "12.5px",
    fontFamily: "var(--font)",
  },
  labelStyle: {
    color: "var(--text3)",
    fontSize: "11px",
    marginBottom: "4px",
    fontWeight: 600,
  },
  itemStyle: {
    color: "var(--text)",
    fontSize: "12.5px",
    fontWeight: 600,
    padding: "2px 0",
  },
  cursor: { stroke: "var(--accent)", strokeWidth: 1, strokeDasharray: "4 4" },
}

export const axisStyle = {
  axisLine: false,
  tickLine: false,
  tick: { fontSize: 11, fill: "var(--text3)", fontFamily: "var(--font)" },
}

export const gridStyle = {
  strokeDasharray: "3 3",
  stroke: "var(--border)",
  strokeOpacity: 0.6,
}
