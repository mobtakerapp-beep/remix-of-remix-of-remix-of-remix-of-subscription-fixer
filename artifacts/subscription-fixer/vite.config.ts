import { defineConfig } from "@lovable.dev/vite-tanstack-config";

const port = Number(process.env["PORT"]);

export default defineConfig({
  server: {
    host: "0.0.0.0",
    port,
    strictPort: true,
  },
  preview: {
    host: "0.0.0.0",
    port,
    strictPort: true,
  },
});
