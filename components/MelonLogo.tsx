"use client"

import { cn } from "@/lib/utils"

interface MelonLogoProps {
  className?: string
  size?: "xs" | "sm" | "md" | "lg" | "xl"
}

const sizeMap = {
  xs: "w-4 h-4",
  sm: "w-5 h-5",
  md: "w-6 h-6",
  lg: "w-8 h-8",
  xl: "w-16 h-16",
}

export function MelonLogo({ className, size = "md" }: MelonLogoProps) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn(sizeMap[size], className)}
      aria-label="OptiMelon logo"
    >
      {/* Outer green rind */}
      <path
        d="M10 90 Q10 10 90 10 L90 20 Q20 20 20 90 Z"
        fill="#4ade80"
      />
      {/* Light green inner rind */}
      <path
        d="M20 90 Q20 25 85 15 L85 25 Q30 30 30 90 Z"
        fill="#86efac"
      />
      {/* Deep watermelon red flesh */}
      <path
        d="M30 90 Q30 35 80 25 L80 35 Q40 42 40 90 Z"
        fill="#E53935"
      />
      {/* Inner lighter red flesh */}
      <path
        d="M40 90 Q40 48 75 38 L75 48 Q50 55 50 90 Z"
        fill="#EF5350"
      />
      {/* Seeds */}
      <ellipse cx="45" cy="70" rx="3" ry="5" fill="#1a1a1f" transform="rotate(-20 45 70)" />
      <ellipse cx="55" cy="60" rx="2.5" ry="4" fill="#1a1a1f" transform="rotate(-25 55 60)" />
      <ellipse cx="38" cy="82" rx="2" ry="3.5" fill="#1a1a1f" transform="rotate(-15 38 82)" />
    </svg>
  )
}
