import { NextUIProvider } from "@nextui-org/react";
import DynamicProvider from "./DynamicProvider.jsx";
import AuthProvider from "./AuthProvider.jsx";
import Web3Provider from "./Web3Provider.jsx";
import AptosProvider from "./AptosProvider.jsx";
import SolanaProvider from "./SolanaProvider.jsx";
import MinaProvider from "../components/mina-protocol/MinaProvider";
import ZcashProvider from "./ZcashProvider.jsx";
import ShieldedZcashProvider from "./ShieldedZcashProvider.jsx";
import { CosmosProvider } from "./CosmosProvider.jsx";
import StarknetProvider from "./StarknetProvider.jsx";
import PrivacyProvider from "./PrivacyProvider.jsx";
import UnstoppableProvider from "./UnstoppableProvider.jsx";
import AleoProvider from "./AleoProvider.jsx";
import { SWRConfig } from "swr";
import UserProvider from "./UserProvider.jsx";
import { useZcashWasm } from "@/hooks/useZcashWasm";

export default function RootProvider({ children }) {
  const isTestnet = import.meta.env.VITE_APP_ENVIRONMENT === "dev";

  // Initialize Zcash WASM for shielded transactions
  // This runs once at app level to prevent memory leaks
  const { isInitialized: wasmReady, error: wasmError } = useZcashWasm();

  // Log WASM status (shielded features will work once WebZjs is built)
  if (wasmError) {
    console.info('[RootProvider] Shielded Zcash unavailable:', wasmError);
    console.info('[RootProvider] Transparent wallet still works normally');
  } else if (wasmReady) {
    console.info('[RootProvider] Shielded Zcash initialized successfully ✓');
  }

  return (
    <SWRConfig
      value={{
        shouldRetryOnError: false,
        revalidateOnFocus: false,
      }}
    >
      <NextUIProvider>
        <AleoProvider>
          <PrivacyProvider>
            <SolanaProvider>
              <MinaProvider>
                <CosmosProvider>
                  <ZcashProvider>
                    <ShieldedZcashProvider>
                      <UnstoppableProvider>
                        <StarknetProvider>
                          <AptosProvider isTestnet={isTestnet}>
                            <DynamicProvider>
                              <Web3Provider>
                                <AuthProvider>
                                  <UserProvider>
                                    {children}
                                  </UserProvider>
                                </AuthProvider>
                              </Web3Provider>
                            </DynamicProvider>
                          </AptosProvider>
                        </StarknetProvider>
                      </UnstoppableProvider>
                    </ShieldedZcashProvider>
                  </ZcashProvider>
                </CosmosProvider>
              </MinaProvider>
            </SolanaProvider>
          </PrivacyProvider>
        </AleoProvider>
      </NextUIProvider>
    </SWRConfig>
  );
}
