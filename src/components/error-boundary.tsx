"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { error as logError } from "@/lib/debug";

type Props = { children: ReactNode };
type State = { error: Error | null };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    logError("React tree crashed", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen bg-[#07090c] px-6 py-16 text-[#e8f0ec]">
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-[#ff8b5c]">
            render fault
          </p>
          <h1 className="mt-3 text-3xl font-semibold">RiboSense failed to mount</h1>
          <p className="mt-3 max-w-xl text-sm text-white/70">
            Check the browser console for <code>[RiboSense]</code> logs. The
            error below is what broke the page:
          </p>
          <pre className="mt-6 max-w-3xl overflow-auto rounded-2xl border border-white/10 bg-black/40 p-4 text-xs text-[#ff8b5c]">
            {this.state.error.message}
            {"\n\n"}
            {this.state.error.stack}
          </pre>
          <button
            type="button"
            className="mt-6 rounded-full bg-[#c8f542] px-5 py-2.5 text-sm font-semibold text-[#08100a]"
            onClick={() => {
              this.setState({ error: null });
              window.location.reload();
            }}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
