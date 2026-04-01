import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock fetch globally (browser environment only)
if (typeof globalThis !== "undefined" && typeof window !== "undefined") {
  globalThis.fetch = vi.fn();

  // Mock window.confirm
  Object.defineProperty(window, "confirm", {
    writable: true,
    value: vi.fn(),
  });
}
