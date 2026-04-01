import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: { "@": path.resolve(__dirname, ".") },
        },
        test: {
          name: "browser",
          globals: true,
          environment: "jsdom",
          setupFiles: ["./src/test/setup.ts"],
          include: ["src/**/*.test.{ts,tsx}"],
        },
      },
      {
        test: {
          name: "node",
          globals: true,
          environment: "node",
          include: ["server.test.ts"],
        },
      },
    ],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}", "server.ts"],
      exclude: ["src/main.tsx", "src/test/**"],
    },
  },
});
