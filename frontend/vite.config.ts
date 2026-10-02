import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import { env } from "node:process";

const proxy = { "/api": env.API_PROXY_TARGET ?? "http://127.0.0.1:3000" };

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    strictPort: true,
    proxy,
  },
  preview: { proxy },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    restoreMocks: true,
  },
});
