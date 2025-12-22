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
      // Plugin to fix WebAssembly MIME type for CoFHE
      {
        name: 'configure-response-headers',
        configureServer(server) {
          server.middlewares.use((req, res, next) => {
            // Fix WASM MIME type for all WASM files (including in node_modules/.vite/deps/)
            if (req.url.endsWith('.wasm') || req.url.includes('.wasm')) {
              res.setHeader('Content-Type', 'application/wasm');
              res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
              res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
            }
            next();
          });
        },
      },
    ],
    server: {
      ...serverConfig,
      headers: {
        'Cross-Origin-Embedder-Policy': 'require-corp',
        'Cross-Origin-Opener-Policy': 'same-origin',
      },
    },
    // Enable WebAssembly and top-level await support for Zcash shielded transactions
    optimizeDeps: {
      include: [
        "readable-stream",
        "buffer",
      ],
      esbuildOptions: {
        define: {
          global: "globalThis",
        },
        target: 'esnext',
      },
      exclude: ['@chainsafe/webzjs-wallet', '@chainsafe/webzjs-keys', 'cofhejs'],
    },
    worker: {
      format: 'es',
    },
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
    build: {
      target: 'esnext',
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