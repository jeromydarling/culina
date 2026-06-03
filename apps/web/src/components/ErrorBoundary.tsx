import * as React from 'react';
import { Button } from '@/components/ui/button';
import { reportError } from '@/lib/telemetry';
import { openSupport } from '@/lib/errors';

interface State {
  error: Error | null;
  incident: string;
}

/**
 * Top-level error boundary. Catches render/runtime errors, reports them, shows a
 * recoverable fallback with an incident reference and a direct path to support.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null, incident: '' };

  static getDerivedStateFromError(error: Error): State {
    return { error, incident: Math.random().toString(36).slice(2, 10) };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    reportError(error, { componentStack: info.componentStack, incident: this.state.incident });
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-muted/40 p-6 text-center">
          <div className="max-w-md">
            <div className="font-heading text-5xl font-bold text-primary">Oops</div>
            <h1 className="mt-3 font-heading text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred — we’ve logged it and our team has been notified. Reloading usually fixes it.
            </p>
            {this.state.incident && (
              <p className="mt-1 text-xs text-muted-foreground">Reference: <span className="font-mono">{this.state.incident}</span></p>
            )}
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Button onClick={() => this.setState({ error: null, incident: '' })} variant="outline">Try again</Button>
              <Button onClick={() => (window.location.href = '/')}>Back home</Button>
              <Button variant="ghost" onClick={() => openSupport('Culina error report', `Reference: ${this.state.incident}\nError: ${this.state.error?.message}`)}>
                Contact support
              </Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
