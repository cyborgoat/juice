import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

interface TextShimmerProps {
  children: ReactNode
  className?: string
}

export function TextShimmer({ children, className }: TextShimmerProps) {
  return <span className={cn("text-shimmer", className)}>{children}</span>
}
