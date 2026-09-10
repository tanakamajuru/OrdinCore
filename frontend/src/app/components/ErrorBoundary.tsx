import React from "react";
import { useLocation, useNavigate } from "react-router";

// Why this exists: every screen runs a 60-second background refresh (see useGovernanceRefresh)
// and a live socket refresh. If a background refresh pulls data in a shape a screen does not
// expect, that screen throws while re-rendering. With no boundary, React unmounts the WHOLE
// app — which reads to the user as "the screen suddenly refreshed and jumped somewhere else".
// This boundary contains the failure to the current screen, keeps the user signed in, shows the
// actual error (so it can be reported and fixed), and recovers automatically on navigation.

interface Props {
  children: React.ReactNode;
  resetKey: string;              // when this changes (route change), the boundary clears itself
  onReset: () => void;           // navigate home
  onReload: () => void;          // hard reload the current screen
}
interface State { error: Error | null; info: string | null }

class ErrorBoundaryInner extends React.Component<Props, State> {
  state: State = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  componentDidUpdate(prev: Props) {
    // A route change means the user has moved on — clear the error so the next screen renders.
    if (this.state.error && prev.resetKey !== this.props.resetKey) {
      this.setState({ error: null, info: null });
    }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.setState({ info: info.componentStack || null });
    // Surface it for anyone with the console open; harmless in production.
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary] a screen crashed while rendering:", error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-xl border-2 border-border bg-card p-6 shadow-sm">
          <h1 className="text-lg font-semibold text-foreground mb-1">This screen hit a snag</h1>
          <p className="text-sm text-muted-foreground mb-4">
            Something on this screen failed to load correctly. Your session is fine and nothing was
            changed — you can reload this screen or go back to your dashboard.
          </p>
          <div className="rounded-lg bg-muted/50 border border-border p-3 mb-4 text-xs text-foreground overflow-auto max-h-40">
            <p className="font-mono break-words">{this.state.error.message || String(this.state.error)}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={this.props.onReload}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90"
            >
              Reload this screen
            </button>
            <button
              onClick={() => { this.setState({ error: null, info: null }); this.props.onReset(); }}
              className="px-4 py-2 rounded-lg border border-border text-sm hover:bg-muted"
            >
              Go to dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }
}

// Functional wrapper so the class can react to the router (reset on navigation) without pulling
// hooks into the class itself.
export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <ErrorBoundaryInner
      resetKey={location.pathname}
      onReset={() => navigate("/dashboard")}
      onReload={() => window.location.reload()}
    >
      {children}
    </ErrorBoundaryInner>
  );
}
