import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    let readable = error.message || 'An unexpected application error occurred.';
    try {
      const parsed = JSON.parse(error.message);
      if (parsed && typeof parsed.error === 'string') {
        readable = `${parsed.error} (${parsed.operationType} on ${parsed.path || 'database'})`;
      }
    } catch {
      // keep raw message
    }
    return { hasError: true, message: readable };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF9F6] flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white border border-[#E2E8E5] rounded-2xl p-8 text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-2xl font-semibold text-[#0F1F1A] mb-2">
              Something needs attention
            </h2>
            <p className="text-sm text-[#475A53] mb-6 leading-relaxed">
              {this.state.message}
            </p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#065F46] text-white text-sm font-medium hover:bg-[#047857] transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Reload Academy
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
