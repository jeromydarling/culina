import * as React from 'react';
import { Button } from '@/components/ui/button';

interface State {
  error: Error | null;
}

/**
 * Top-level error boundary. Catches render/runtime errors anywhere in the tree
 * and shows a recoverable fallback instead of a blank white screen.
 */
export class ErrorBoundary extends React.Component<{ children: React.ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // Hook for a real error reporter (Sentry, etc.) in production.
    console.error('Culina UI error:', error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="grid min-h-screen place-items-center bg-muted/40 p-6 text-center">
          <div className="max-w-md">
            <div className="font-heading text-5xl font-bold text-primary">Oops</div>
            <h1 className="mt-3 font-heading text-xl font-semibold">Something went wrong</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              An unexpected error occurred. Reloading usually fixes it.
            </p>
            <div className="mt-6 flex justify-center gap-2">
              <Button onClick={() => this.setState({ error: null })} variant="outline">
                Try again
              </Button>
              <Button onClick={() => (window.location.href = '/')}>Back home</Button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
