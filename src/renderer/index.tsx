import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const container = document.getElementById("root");

if (!container) {
  throw new Error("Root container not found.");
}

type RootBoundaryProps = {
  children: React.ReactNode;
};

type RootBoundaryState = {
  hasError: boolean;
  message: string;
};

class RootBoundary extends React.Component<
  RootBoundaryProps,
  RootBoundaryState
> {
  state: RootBoundaryState = {
    hasError: false,
    message: ""
  };

  static getDerivedStateFromError(error: unknown): RootBoundaryState {
    return {
      hasError: true,
      message:
        error instanceof Error ? error.message : "Unknown renderer error."
    };
  }

  componentDidCatch(error: unknown): void {
    // Keep logging explicit so black-screen root causes are visible in dev/prod logs.
    console.error("Renderer crashed:", error);
  }

  render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "grid",
          placeItems: "center",
          background: "#050507",
          color: "#efefef",
          fontFamily:
            "SF Pro Text, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif",
          padding: "24px"
        }}
      >
        <div style={{ maxWidth: "440px", textAlign: "center" }}>
          <p style={{ fontSize: "16px", fontWeight: 600, marginBottom: "8px" }}>
            Robin hit a renderer error.
          </p>
          <p style={{ fontSize: "13px", opacity: 0.72, lineHeight: 1.5 }}>
            {this.state.message ||
              "Please restart Robin. If this continues, clear local app data and retry."}
          </p>
        </div>
      </div>
    );
  }
}

createRoot(container).render(
  <React.StrictMode>
    <RootBoundary>
      <App />
    </RootBoundary>
  </React.StrictMode>
);
