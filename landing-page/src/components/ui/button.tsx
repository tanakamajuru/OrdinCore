import * as React from "react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "success";
export type ButtonSize = "default" | "icon";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const buttonVariants: Record<ButtonVariant, string> = {
  default:
    "inline-flex items-center justify-center gap-2 rounded-full bg-[#2F6CB5] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#1A3259]",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-full border border-[#B8D3EA] bg-[#E2EEF8] px-6 py-3 text-sm font-semibold text-[#1A3259] transition hover:bg-[#DCE8F0]",
  outline:
    "inline-flex items-center justify-center gap-2 rounded-full border border-[#2F6CB5] bg-white px-6 py-3 text-sm font-semibold text-[#2F6CB5] transition hover:bg-[#EAF4FF]",
  ghost:
    "inline-flex items-center justify-center gap-2 rounded-full bg-transparent px-6 py-3 text-sm font-semibold text-[#2F6CB5] transition hover:bg-[#EFF6FF]",
  success:
    "inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-emerald-400",
};

// A square icon button (reui/shadcn "icon" size) replaces a variant's own padding/shape with a
// fixed 36x36 box — kept separate from buttonVariants above so adding it never changes the
// regular pill-shaped buttons elsewhere on the page.
const iconSizeVariants: Record<ButtonVariant, string> = {
  default: "inline-flex items-center justify-center h-9 w-9 rounded-full bg-[#2F6CB5] text-white transition hover:bg-[#1A3259]",
  secondary: "inline-flex items-center justify-center h-9 w-9 rounded-full border border-[#B8D3EA] bg-[#E2EEF8] text-[#1A3259] transition hover:bg-[#DCE8F0]",
  outline: "relative inline-flex items-center justify-center h-9 w-9 rounded-full border border-[#C6D5E1] dark:border-slate-700 bg-white dark:bg-slate-800 text-[#28536F] dark:text-slate-200 transition hover:border-[#28536F] hover:bg-[#E6EDF2]/45 dark:hover:bg-slate-700",
  ghost: "inline-flex items-center justify-center h-9 w-9 rounded-full bg-transparent text-[#2F6CB5] transition hover:bg-[#EFF6FF]",
  success: "inline-flex items-center justify-center h-9 w-9 rounded-full bg-emerald-500 text-slate-950 transition hover:bg-emerald-400",
};

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(size === "icon" ? iconSizeVariants[variant] : buttonVariants[variant], className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
