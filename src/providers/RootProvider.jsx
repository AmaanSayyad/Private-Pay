import { NextUIProvider } from "@nextui-org/react";
import DynamicProvider from "./DynamicProvider.jsx";
import AuthProvider from "./AuthProvider.jsx";
import Web3Provider from "./Web3Provider.jsx";
import AptosProvider from "./AptosProvider.jsx";
import SolanaProvider from "./SolanaProvider.jsx";
import MinaProvider from "../components/mina-protocol/MinaProvider";
import ZcashProvider from "./ZcashProvider.jsx";
import { CosmosProvider } from "./CosmosProvider.jsx";
import UnstoppableProvider from "./UnstoppableProvider.jsx";
import { SWRConfig } from "swr";
import UserProvider from "./UserProvider.jsx";

export default function RootProvider({ children }) {
  const isTestnet = import.meta.env.VITE_APP_ENVIRONMENT === "dev";

  return (
    <SWRConfig
      value={{
        shouldRetryOnError: false,
        revalidateOnFocus: false,
      }}
    >
      <NextUIProvider>
        <SolanaProvider>
          <MinaProvider>
            <CosmosProvider>
              <ZcashProvider>
                <UnstoppableProvider>
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
                </UnstoppableProvider>
              </ZcashProvider>
            </CosmosProvider>
          </MinaProvider>
        </SolanaProvider>
      </NextUIProvider>
    </SWRConfig>
  );
}
