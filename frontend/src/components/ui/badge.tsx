import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-[20px] border px-2.5 py-1 text-[12px] font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        effective: "border-transparent bg-[#2E7D32] text-primary-foreground",
        success: "border-transparent bg-[#2E7D32] text-primary-foreground",
        neutral: "border-transparent bg-[#ED6C02] text-primary-foreground",
        warning: "border-transparent bg-[#ED6C02] text-primary-foreground",
        ineffective: "border-transparent bg-[#D32F2F] text-primary-foreground",
        critical: "border-transparent bg-[#D32F2F] text-primary-foreground",
        emerging: "border-transparent bg-[#00A3B2] text-primary-foreground",
        active: "border-transparent bg-[#00A3B2] text-primary-foreground",
        closed: "border-transparent bg-[#4A5568] text-[#E2E8F0]",
        resolved: "border-transparent bg-[#4A5568] text-[#E2E8F0]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
