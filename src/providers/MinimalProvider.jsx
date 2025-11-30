import { NextUIProvider } from "@nextui-org/react";
import AptosProvider from "./AptosProvider.jsx";
import { SWRConfig } from "swr";
import { Toaster } from "react-hot-toast";
import { RootLayout } from "../layouts/RootLayout.jsx";

/**
 * Minimal provider for Aptos pages
 * No Dynamic, Web3, Auth, or User providers needed
 */
export default function MinimalProvider({ children }) {
  const isTestnet = import.meta.env.VITE_APP_ENVIRONMENT === "dev";
  
  return (
    <SWRConfig
      value={{
        shouldRetryOnError: false,
        revalidateOnFocus: false,
      }}
    >
      <NextUIProvider>
        <RootLayout>
          <AptosProvider isTestnet={isTestnet}>
            <Toaster />
            {children}
          </AptosProvider>
        </RootLayout>
      </NextUIProvider>
    </SWRConfig>
  );
}

