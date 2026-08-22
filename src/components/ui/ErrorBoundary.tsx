'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.warn('RadarX UI ErrorBoundary caught exception:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 max-w-lg mx-auto my-12 bg-white border border-[#DC2626]/30 rounded-2xl shadow-lg text-xs font-mono space-y-4">
          <div className="flex items-center gap-2 text-[#991B1B]">
            <AlertCircle className="w-5 h-5 text-[#DC2626]" />
            <h2 className="font-extrabold text-sm">RadarX Component Exception</h2>
          </div>
          <p className="text-[#374151] font-sans">
            RadarX encountered a client component rendering issue. The rest of the platform remains functional.
          </p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-[#111827] text-white rounded-xl text-xs font-bold hover:bg-black cursor-pointer"
          >
            RETRY COMPONENT
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
