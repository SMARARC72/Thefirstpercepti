import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
      },
      output: {
        manualChunks: {
          vendor: ["tone", "gsap", "inkjs"],
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@engine": resolve(__dirname, "../../packages/engine/src"),
      "@narrative": resolve(__dirname, "../../packages/narrative/src"),
      "@audio": resolve(__dirname, "../../packages/audio/src"),
      "@types": resolve(__dirname, "../../packages/types/src"),
      "@ui": resolve(__dirname, "../../packages/ui-system/src"),
    },
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
  preview: {
    host: "127.0.0.1",
  },
  plugins: [
    {
      name: "wasm-mime",
      configurePreviewServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url?.endsWith(".wasm")) {
            res.setHeader("Content-Type", "application/wasm");
          }
          next();
        });
      },
    },
  ],
});
