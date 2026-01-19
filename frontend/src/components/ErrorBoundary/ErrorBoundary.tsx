/**
 * ErrorBoundary Component - Agentic Mobile Map
 *
 * Catches JavaScript errors anywhere in the child component tree
 * and displays a fallback UI instead of crashing the entire app.
 *
 * Features:
 * - Catches render errors, lifecycle errors, and errors in constructors
 * - Displays customizable fallback UI
 * - Supports error logging/reporting
 * - Reset functionality to recover from errors
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ErrorFallback, ErrorFallbackProps } from './ErrorFallback';

/**
 * Error information structure
 */
export interface ErrorDetails {
  error: Error;
  errorInfo: ErrorInfo;
  timestamp: number;
  componentStack?: string;
}

/**
 * ErrorBoundary Props
 */
export interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Custom fallback component */
  FallbackComponent?: React.ComponentType<ErrorFallbackProps>;
  /** Called when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  /** Called when the error boundary resets */
  onReset?: () => void;
  /** Fallback level for styling */
  level?: 'app' | 'screen' | 'section';
  /** Custom title for the fallback */
  title?: string;
  /** Custom message for the fallback */
  message?: string;
  /** Show technical details in dev mode */
  showDetails?: boolean;
}

/**
 * ErrorBoundary State
 */
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary Class Component
 *
 * Note: Error boundaries must be class components as of React 18.
 * Hooks like useErrorBoundary don't exist in core React.
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  /**
   * Update state when an error is caught
   */
  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  /**
   * Log error information
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Log error in development
    if (__DEV__) {
      console.error('[ErrorBoundary] Caught error:', error);
      console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack);
    }

    // In production, you would send this to an error reporting service
    // e.g., Sentry, Bugsnag, etc.
    this.logErrorToService({
      error,
      errorInfo,
      timestamp: Date.now(),
      componentStack: errorInfo.componentStack || undefined,
    });
  }

  /**
   * Log error to external service (placeholder)
   */
  private logErrorToService(errorDetails: ErrorDetails): void {
    // TODO: Integrate with error reporting service (Sentry, Bugsnag, etc.)
    // For now, just log to console in production
    if (!__DEV__) {
      console.error('[ErrorBoundary] Error logged:', {
        message: errorDetails.error.message,
        stack: errorDetails.error.stack,
        componentStack: errorDetails.componentStack,
        timestamp: new Date(errorDetails.timestamp).toISOString(),
      });
    }
  }

  /**
   * Reset the error boundary
   */
  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const {
      children,
      FallbackComponent = ErrorFallback,
      level = 'app',
      title,
      message,
      showDetails = __DEV__,
    } = this.props;

    if (hasError && error) {
      return (
        <FallbackComponent
          error={error}
          errorInfo={errorInfo}
          level={level}
          title={title}
          message={message}
          showDetails={showDetails}
          onReset={this.handleReset}
        />
      );
    }

    return children;
  }
}

/**
 * withErrorBoundary HOC
 *
 * Wraps a component with an error boundary.
 */
export function withErrorBoundary<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  errorBoundaryProps?: Omit<ErrorBoundaryProps, 'children'>
): React.FC<P> {
  const WithErrorBoundary: React.FC<P> = (props) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <WrappedComponent {...props} />
    </ErrorBoundary>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${
    WrappedComponent.displayName || WrappedComponent.name || 'Component'
  })`;

  return WithErrorBoundary;
}

export default ErrorBoundary;
