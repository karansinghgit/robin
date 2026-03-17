import type { RobinBridge } from "./contracts";

declare global {
  interface Window {
    robin: RobinBridge;
  }
}

export {};
