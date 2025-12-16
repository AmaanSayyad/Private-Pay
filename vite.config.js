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
        // Shim for @aptos-labs/ts-sdk to avoid heavy deps like poseidon-lite
        "@aptos-labs/ts-sdk": path.resolve(
          __dirname,
          "./src/lib/aptos-ts-sdk-shim.js",
        ),
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
        requireReturnsDefault: 'auto',
        esmExternals: true,
        defaultIsModuleExports: 'auto',
      },
      rollupOptions: {
        plugins: [],
        output: {
          manualChunks(id) {
            // Split large vendor libraries into separate chunks to reduce memory usage
            if (id.includes('node_modules')) {
              if (id.includes('@solana')) {
                return 'vendor-solana';
              }
              if (id.includes('@aptos-labs')) {
                return 'vendor-aptos';
              }
              if (id.includes('viem') || id.includes('ethers')) {
                return 'vendor-eth';
              }
              if (id.includes('@dynamic-labs')) {
                return 'vendor-dynamic';
              }
              if (id.includes('react') || id.includes('react-dom')) {
                return 'vendor-react';
              }
              return 'vendor-other';
            }
          },
        },
      },
      chunkSizeWarningLimit: 1000,
      sourcemap: false,
    },
  };
});
