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
          manualChunks(id) {
            // Don't split node polyfills - keep them together
            if (id.includes('node_modules')) {
              // Keep polyfills together - CRITICAL for Buffer initialization
              if (id.includes('buffer') || id.includes('node-polyfills') || id.includes('readable-stream') || id.includes('stream-browserify')) {
                return 'polyfills';
              }
              // React and core
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router')) {
                return 'react-vendor';
              }
              // UI libraries
              if (id.includes('@nextui-org') || id.includes('framer-motion') || id.includes('lucide-react')) {
                return 'ui-vendor';
              }
              // Wallet adapters
              if (id.includes('@dynamic-labs') || id.includes('@solana/wallet-adapter')) {
                return 'wallet-vendor';
              }
              // Ethers
              if (id.includes('ethers') || id.includes('@oasisprotocol/sapphire-ethers')) {
                return 'ethers-vendor';
              }
              // Blockchain SDKs - split to avoid Buffer issues
              if (id.includes('@aptos-labs')) {
                return 'aptos-vendor';
              }
              if (id.includes('@solana/web3.js')) {
                return 'solana-vendor';
              }
              if (id.includes('@coral-xyz/anchor')) {
                return 'anchor-vendor';
              }
              // Arcium
              if (id.includes('@arcium-hq')) {
                return 'arcium-vendor';
              }
              // Crypto
              if (id.includes('@noble') || id.includes('bs58') || id.includes('bn.js')) {
                return 'crypto-vendor';
              }
              // Utils
              if (id.includes('axios') || id.includes('@supabase') || id.includes('swr') || id.includes('date-fns') || id.includes('dayjs')) {
                return 'utils-vendor';
              }
              // Default vendor chunk
              return 'vendor';
            }
          },
        },
      },
    },
  };
});
