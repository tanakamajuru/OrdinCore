import { useCallback, useRef, useState } from "react";

export type ConfirmOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  // When set, shows a text input (for a prompt()-style "briefly record why" confirmation) and the
  // resolved value is that text; otherwise resolves to "" on confirm.
  requireReason?: boolean;
  reasonPlaceholder?: string;
  defaultValue?: string;
};

type DialogState = ConfirmOptions & { resolve: (value: string | null) => void };

// Replaces window.confirm()/window.prompt() (browser-native, unstyled, and blocking) with a
// themed in-app modal (user-reported, 6 Nov 2026: "all these popups should be proper modals").
// Usage: const { confirm, ConfirmModal } = useConfirmDialog(); ... render {ConfirmModal} once in
// the component's JSX; const reason = await confirm({ message, requireReason: true }); reason ===
// null means cancelled, otherwise it's the entered text ("" when requireReason is not set).
export function useConfirmDialog() {
  const [state, setState] = useState<DialogState | null>(null);
  const [text, setText] = useState("");
  const resolver = useRef<((value: string | null) => void) | null>(null);

  const confirm = useCallback((opts: ConfirmOptions): Promise<string | null> => {
    return new Promise((resolve) => {
      resolver.current = resolve;
      setText(opts.defaultValue || "");
      setState({ ...opts, resolve });
    });
  }, []);

  const close = (value: string | null) => {
    resolver.current?.(value);
    resolver.current = null;
    setState(null);
    setText("");
  };

  const ConfirmModal = state ? (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" onClick={() => close(null)}>
      <div className="bg-card border-2 border-border rounded-xl w-full max-w-md p-5 shadow-lg" onClick={(e) => e.stopPropagation()}>
        {state.title && <h3 className="text-base font-semibold text-foreground mb-2">{state.title}</h3>}
        <p className="text-sm text-muted-foreground whitespace-pre-line mb-4">{state.message}</p>
        {state.requireReason && (
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={state.reasonPlaceholder || ""}
            className="w-full p-2.5 border-2 border-border rounded-lg bg-background text-sm mb-4"
            onKeyDown={(e) => { if (e.key === "Enter" && text.trim()) close(text.trim()); }}
          />
        )}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => close(null)} className="px-3 py-1.5 rounded-lg border border-border text-sm">
            {state.cancelLabel || "Cancel"}
          </button>
          <button
            type="button"
            disabled={state.requireReason && !text.trim()}
            onClick={() => close(state.requireReason ? text.trim() : "")}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50 ${state.danger ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"}`}
          >
            {state.confirmLabel || "OK"}
          </button>
        </div>
      </div>
    </div>
  ) : null;

  return { confirm, ConfirmModal };
}
