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
        target: "esnext",
        define: {
          global: "globalThis",
        },
      },
    },
    // o1js requires headers for SharedArrayBuffer
    server: {
      ...serverConfig,
      headers: {
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Embedder-Policy": "require-corp",
      },
    },
    build: {
      target: "esnext",
      commonjsOptions: {
        transformMixedEsModules: true,
        include: [/node_modules/],
      },
      rollupOptions: {
        plugins: [],
        output: {
          manualChunks: {
            // Vendor chunks - split large dependencies
            'react-vendor': ['react', 'react-dom', 'react-router-dom'],
            'ui-vendor': ['@nextui-org/react', 'framer-motion', 'lucide-react'],
            'wallet-vendor': [
              '@dynamic-labs/sdk-react-core',
              '@dynamic-labs/ethereum',
              '@dynamic-labs/ethers-v6',
              '@solana/wallet-adapter-react',
              '@solana/wallet-adapter-react-ui',
              '@solana/wallet-adapter-wallets',
            ],
            'ethers-vendor': [
              'ethers',
              '@oasisprotocol/sapphire-ethers-v6',
            ],
            'viem-vendor': [
              'viem',
            ],
            'blockchain-vendor': [
              '@aptos-labs/ts-sdk',
              '@solana/web3.js',
              '@coral-xyz/anchor',
            ],
            'arcium-vendor': ['@arcium-hq/client'],
            'crypto-vendor': [
              '@noble/secp256k1',
              '@noble/hashes',
              'bs58',
              'bn.js',
            ],
            'utils-vendor': [
              'axios',
              '@supabase/supabase-js',
              'swr',
              'date-fns',
              'dayjs',
            ],
          },
        },
      },
    },
  };
});
