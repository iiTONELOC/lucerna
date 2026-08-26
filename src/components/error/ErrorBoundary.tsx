import { Component, type ErrorInfo, type ReactNode } from 'react';
import { errorDiagnosticsFrom, persistErrorDiagnostics } from './diagnostics.ts';
import { ErrorView } from './ErrorView.tsx';

type ErrorBoundaryProps = {
  readonly children: ReactNode;
};

type ErrorBoundaryState = {
  readonly diagnostics: string | null;
  readonly error: Error | null;
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  override readonly state: ErrorBoundaryState = {
    diagnostics: null,
    error: null,
  };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { diagnostics: errorDiagnosticsFrom(error), error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    const diagnostics = errorDiagnosticsFrom(error, errorInfo.componentStack);
    persistErrorDiagnostics(diagnostics);
    this.setState({ diagnostics });
  }

  private readonly reset = (): void => {
    this.setState({ diagnostics: null, error: null });
  };

  override render(): ReactNode {
    const { diagnostics, error } = this.state;

    if (error !== null) {
      return (
        <ErrorView diagnostics={diagnostics ?? errorDiagnosticsFrom(error)} onRetry={this.reset} />
      );
    }

    return this.props.children;
  }
}
