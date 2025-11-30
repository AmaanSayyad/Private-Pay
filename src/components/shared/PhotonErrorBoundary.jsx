/**
 * PhotonErrorBoundary Component
 * 
 * Error boundary specifically for Photon-related components.
 * Catches errors in child components and provides graceful fallback UI.
 * Prevents Photon errors from crashing the entire application.
 * 
 * Requirement 1.5: Display error messages on failure
 * Requirement 5.5: Graceful degradation for missing configuration
 */

import { Component } from 'react';

class PhotonErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // Log error details for debugging
    console.error('Photon Error Boundary caught an error:', error, errorInfo);
    
    this.setState({
      error,
      errorInfo,
    });

    // Optional: Send error to logging service
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });

    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-red-50 rounded-2xl border border-red-200">
          <div className="flex items-center gap-2 mb-3">
            <ErrorIcon className="w-6 h-6 text-red-600" />
            <h3 className="text-lg font-semibold text-red-900">
              {this.props.title || 'Photon Error'}
            </h3>
          </div>
          
          <p className="text-sm text-red-700 text-center mb-4">
            {this.props.message || 'Something went wrong with Photon integration. The rest of the app is working normally.'}
          </p>

          {this.props.showDetails && this.state.error && (
            <details className="w-full mb-4">
              <summary className="text-xs text-red-600 cursor-pointer hover:text-red-800">
                Error details
              </summary>
              <pre className="mt-2 p-3 bg-red-100 rounded text-xs text-red-900 overflow-auto max-h-40">
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}

          {this.props.showReset && (
            <button
              onClick={this.handleReset}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Try Again
            </button>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

// Error Icon Component
const ErrorIcon = ({ className }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 8V12"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M12 16H12.01"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export default PhotonErrorBoundary;
