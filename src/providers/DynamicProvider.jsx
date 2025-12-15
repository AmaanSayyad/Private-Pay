import {
  DynamicContextProvider,
  mergeNetworks,
} from "@dynamic-labs/sdk-react-core";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { customEvmNetworks } from "../config";
import { useAtom } from "jotai";
import { isSignedInAtom } from "../store/auth-store";
import Cookies from "js-cookie";

export default function DynamicProvider({ children }) {
  const [, setSignedIn] = useAtom(isSignedInAtom);
  const dynamicEnvId = import.meta.env.VITE_DYNAMIC_ENV_ID;

  // Log Dynamic configuration for debugging
  console.log("[DynamicProvider] Initializing with env ID:", dynamicEnvId ? `${dynamicEnvId.substring(0, 10)}...` : "NOT SET");
  console.log("[DynamicProvider] Full env check:", {
    hasEnvId: !!dynamicEnvId,
    envIdLength: dynamicEnvId?.length || 0,
    envIdType: typeof dynamicEnvId,
    isPlaceholder: dynamicEnvId === "your_dynamic_environment_id",
    isEmpty: dynamicEnvId === "",
  });

  // If Dynamic environment ID is not set or is placeholder, skip Dynamic provider
  if (!dynamicEnvId || dynamicEnvId === "your_dynamic_environment_id" || dynamicEnvId === "") {
    console.warn("[DynamicProvider] ⚠️ Dynamic.xyz environment ID not configured!");
    console.warn("[DynamicProvider] To enable authentication, set VITE_DYNAMIC_ENV_ID in your environment variables.");
    console.warn("[DynamicProvider] App will work without authentication, but login screen will be skipped.");
    return <>{children}</>;
  }

  try {
    console.log("[DynamicProvider] ✅ Initializing DynamicContextProvider...");
    return (
      <DynamicContextProvider
        settings={{
          environmentId: dynamicEnvId,
          walletConnectors: [EthereumWalletConnectors],
          overrides: {
            evmNetworks: (networks) => mergeNetworks(customEvmNetworks, networks),
          },
          events: {
            onLogout: (args) => {
              Cookies.remove("access_token");
              localStorage.removeItem("auth_signer");
              setSignedIn(false);
              window.location.reload();
              console.log("onLogout was called", args);
            },
          },
        }}
      >
        {children}
      </DynamicContextProvider>
    );
  } catch (error) {
    console.error("[DynamicProvider] ❌ Error initializing Dynamic Labs:", error);
    console.error("[DynamicProvider] Error details:", {
      message: error.message,
      stack: error.stack,
    });
    console.warn("[DynamicProvider] Falling back to app without Dynamic authentication.");
    return <>{children}</>;
  }
}
