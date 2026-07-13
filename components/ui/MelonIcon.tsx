import React from "react"

interface MelonIconProps {
  size?: number
  variant?: "slice" | "seed" | "rind"
  className?: string
  style?: React.CSSProperties
}

/**
 * Watermelon design mark. Flat 2D with a hint of 2.5D depth via a soft
 * drop shadow on the "slice" variant. Signature detail, kept subtle.
 */
export function MelonIcon({ size = 24, variant = "slice", className, style }: MelonIconProps) {
  if (variant === "seed") {
    // A single teardrop/oval seed — used as decorative dots and loading pips.
    const w = size
    const h = size * 1.6
    return (
      <svg
        width={w}
        height={h}
        viewBox="0 0 6 10"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <path
          d="M3 0.5 C4.6 3 5.5 5.2 5.5 6.7 C5.5 8.6 4.4 9.5 3 9.5 C1.6 9.5 0.5 8.6 0.5 6.7 C0.5 5.2 1.4 3 3 0.5 Z"
          fill="var(--melon-seed)"
        />
      </svg>
    )
  }

  if (variant === "rind") {
    // Just the outer rind arc — stroke only, no fill.
    return (
      <svg
        width={size}
        height={size / 2}
        viewBox="0 0 48 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
        style={style}
        aria-hidden="true"
      >
        <path
          d="M2 2 A22 22 0 0 0 46 2"
          stroke="var(--melon-green-light)"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      </svg>
    )
  }

  // "slice" — a semicircle watermelon slice viewed from the front.
  return (
    <svg
      width={size}
      height={size / 2 + 2}
      viewBox="0 0 48 26"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.4))", ...style }}
      aria-label="watermelon slice"
      role="img"
    >
      {/* Inner flesh */}
      <path d="M4 3 A20 20 0 0 0 44 3 Z" fill="var(--melon-pink)" fillOpacity="0.8" />
      {/* Outer rind */}
      <path
        d="M2 3 A22 22 0 0 0 46 3"
        stroke="var(--melon-green)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />
      {/* Seeds */}
      <ellipse cx="24" cy="14" rx="1.4" ry="2.4" fill="#000000" />
      <ellipse cx="16" cy="9" rx="1.4" ry="2.4" fill="#000000" transform="rotate(-18 16 9)" />
      <ellipse cx="32" cy="9" rx="1.4" ry="2.4" fill="#000000" transform="rotate(18 32 9)" />
    </svg>
  )
}
