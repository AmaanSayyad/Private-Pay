import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import { nodePolyfills } from "vite-plugin-node-polyfills";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // eslint-disable-next-line no-undef
  const env = loadEnv(mode, process.cwd());

  const serverConfig =
    env.VITE_ENABLE_LOCAL_DNS === "true"
      ? {
          host: "squidl.test",
          port: 5173,
          hmr: {
            host: "squidl.test",
            protocol: "ws",
          },
        }
      : {
          strictPort: false,
        };

  return {
    base: '/', // Explicit base path for Vercel
    plugins: [
      react(),
      svgr(),
      nodePolyfills({
        globals: {
          Buffer: true,
          global: true,
          process: true,
        },
        protocolImports: true,
      }),
    ],
    server: serverConfig,
    define: {
      "process.env": {},
      global: "globalThis",
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Override nested readable-stream in ripemd160/hash-base
        "readable-stream": "readable-stream",
      },
    },
    optimizeDeps: {
      include: [
        "readable-stream",
        "buffer",
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
      },
    },
    build: {
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/node_modules/],
      },
      rollupOptions: {
        plugins: [],
        output: {
          // Let Vite handle chunking automatically to avoid circular dependencies
          // and execution order issues (like "id is not a function").
          manualChunks: undefined,
        },
      },
    },
  };
});