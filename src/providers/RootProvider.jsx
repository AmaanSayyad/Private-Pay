import { NextUIProvider } from "@nextui-org/react";
import DynamicProvider from "./DynamicProvider.jsx";
import AuthProvider from "./AuthProvider.jsx";
import Web3Provider from "./Web3Provider.jsx";
import AptosProvider from "./AptosProvider.jsx";
import PhotonProvider from "./PhotonProvider.jsx";
import PhotonErrorBoundary from "../components/shared/PhotonErrorBoundary.jsx";
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
        <AptosProvider isTestnet={isTestnet}>
          <DynamicProvider>
            <Web3Provider>
              <AuthProvider>
                <UserProvider>
                  <PhotonErrorBoundary
                    title="Photon Integration Error"
                    message="The Photon rewards system encountered an error. Don't worry, the rest of the app is working fine!"
                    showReset={true}
                  >
                    <PhotonProvider>
                      {children}
                    </PhotonProvider>
                  </PhotonErrorBoundary>
                </UserProvider>
              </AuthProvider>
            </Web3Provider>
          </DynamicProvider>
        </AptosProvider>
      </NextUIProvider>
    </SWRConfig>
  );
}
