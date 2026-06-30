import { useNavigate } from "react-router";
import { ArrowLeft } from "lucide-react";

/**
 * Shared "← Back" control for detail / sub screens. Standardised so every screen
 * below the top-level nav has it in the same place. Defaults to history-back;
 * pass `to` to navigate to a specific route instead.
 */
export function BackButton({ to, label = "Back", className = "" }: { to?: string; label?: string; className?: string }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => (to ? navigate(to) : navigate(-1))}
      className={`inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4 ${className}`}
    >
      <ArrowLeft className="w-4 h-4" /> {label}
    </button>
  );
}

export default BackButton;
