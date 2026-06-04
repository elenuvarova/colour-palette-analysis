import { AlertTriangle } from "lucide-react";
import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Button } from "./ui/Button";

interface ErrorBoundaryProps {
  children: ReactNode;
  /** Optional label so we can tell which part of the tree failed in logs. */
  label?: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Catches render-time errors in its subtree so a single throw no longer
 * white-screens the whole SPA. Renders an on-system fallback card with a
 * "Try again" button that clears the error (and a full reload as a backstop).
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // No remote error service here; log so it's visible in the console while
    // the user sees the friendly fallback instead of a blank page.
    console.error(
      `[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`,
      error,
      info.componentStack,
    );
  }

  private handleReset = () => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-full bg-ink-800 text-accent-400">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <p className="text-sm font-medium text-ink-100">Something broke</p>
        <p className="max-w-sm text-sm text-ink-500">
          That part of the page hit an unexpected error. Try again, or reload if
          it keeps happening.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button size="sm" onClick={this.handleReset}>
            Try again
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      </div>
    );
  }
}
