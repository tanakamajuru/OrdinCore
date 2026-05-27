import * as React from "react";
import { cn } from "../../lib/utils";

export type ButtonVariant = "default" | "secondary" | "outline" | "ghost" | "success";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
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

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", ...props }, ref) => (
    <button ref={ref} className={cn(buttonVariants[variant], className)} {...props} />
  ),
);
Button.displayName = "Button";

export { Button, buttonVariants };
