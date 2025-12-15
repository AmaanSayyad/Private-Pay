import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { getSigner, getWeb3Provider } from "@dynamic-labs/ethers-v6";
import { createContext, useContext, useEffect, useState } from "react";
import { squidlAPI, squidlPublicAPI } from "../api/squidl";
import { isGetStartedDialogAtom } from "../store/dialog-store";
import { useAtom } from "jotai";
import { useWeb3 } from "./Web3Provider";
import { CONTRACT_ADDRESS } from "../config";
import { signAuthToken } from "../lib/ethers";
import { isSignedInAtom } from "../store/auth-store";
import { useSession } from "../hooks/use-session";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import useSWR, { mutate } from "swr";

// Safe wrapper for useDynamicContext
const useDynamicContextSafe = () => {
  try {
    return useDynamicContext();
  } catch (error) {
    return { handleLogOut: null, user: null, primaryWallet: null };
  }
};

const AuthContext = createContext({
  userData: {},
});

export default function AuthProvider({ children }) {
  const { isLoaded, provider, signer } = useWeb3();
  const { handleLogOut, user, primaryWallet } = useDynamicContextSafe();
  const [isReadyToSign, setIsReadyToSign] = useState(false);
  const [isSigningIn, setSigningIn] = useState(false);
  const [hasAttemptedLogin, setHasAttemptedLogin] = useState(false);
  const [, setOpen] = useAtom(isGetStartedDialogAtom);
  const [, setSignedIn] = useAtom(isSignedInAtom);
  const { isSignedIn, isLoading } = useSession();

  const { data: userData } = useSWR(
    isSignedIn ? "/auth/me" : null,
    async (url) => {
      try {
        const { data } = await squidlAPI.get(url);
        return data;
      } catch (error) {
        // If backend is not available, return fallback user data
        if (error.code === 'ERR_NETWORK' || error.message?.includes('CONNECTION_REFUSED')) {
          console.warn("[AuthProvider] Backend not available, using fallback user data");
          // Return fallback user data based on wallet address
          const authSigner = localStorage.getItem("auth_signer");
          if (authSigner) {
            try {
              const signerData = JSON.parse(authSigner);
              return {
                user: {
                  address: primaryWallet?.address || signerData.user,
                  username: null, // Will trigger GetStartedDialog
                },
                // Return empty data to allow app to continue
              };
            } catch (e) {
              console.error("[AuthProvider] Error parsing auth_signer:", e);
            }
          }
          // Return minimal user data to prevent blocking
          return {
            user: {
              address: primaryWallet?.address,
              username: null,
            },
          };
        }
        // Re-throw other errors
        throw error;
      }
    },
    {
      revalidateOnFocus: false, // Disable auto-revalidation when backend is down
      revalidateOnReconnect: false,
      shouldRetryOnError: false, // Don't retry if backend is down
      errorRetryCount: 0,
    }
  );

  // console.log({ primaryWallet, user });

  const login = async (user) => {
    if (isSigningIn || !user || !primaryWallet) return;

    setSigningIn(true);
    
    // Set a flag to prevent logout during login (will be checked by DynamicProvider)
    if (typeof window !== "undefined") {
      window.__isAuthenticating = true;
    }

    try {
      toast.loading("Please sign the request to continue", {
        id: "signing",
      });

      // Get provider and signer - use direct provider if Web3Provider isn't ready
      // This allows login on any network, not just Sapphire
      let authProvider = provider;
      let authSigner = signer;
      let chainId;
      
      if (!authProvider || !authSigner) {
        // Web3Provider might not be ready (e.g., network switch in progress)
        // Get provider directly from Dynamic wallet - works on any network
        console.log("[AuthProvider] Web3Provider not ready, using direct provider from wallet");
        authProvider = await getWeb3Provider(primaryWallet);
        authSigner = await getSigner(primaryWallet);
      }
      
      if (!authProvider || !authSigner) {
        throw new Error("Provider not initialized. Please ensure your wallet is connected.");
      }
      
      const network = await authProvider.getNetwork();
      if (!network || network.chainId === undefined || network.chainId === null) {
        throw new Error("Provider chainId is not available. Please ensure your wallet is connected to a supported network.");
      }
      
      chainId = network.chainId;
      console.log("[AuthProvider] Signing auth token on network:", network.name, "chainId:", chainId.toString());

      const auth = await signAuthToken(authSigner, CONTRACT_ADDRESS, chainId);

      toast.loading("Verifying data, please wait...", {
        id: "signing",
      });

      let data;
      try {
        data = await squidlPublicAPI.post("/auth/login", {
          address: primaryWallet.address,
          username: "",
          walletType: primaryWallet.key !== "turnkeyhd" ? "EOA" : "SOCIAL",
        }).then(res => res.data);
      } catch (backendError) {
        // If backend is not available, allow local authentication
        if (backendError.code === 'ERR_NETWORK' || backendError.message?.includes('CONNECTION_REFUSED')) {
          console.warn("[AuthProvider] Backend not available, using local authentication mode");
          localStorage.setItem("auth_signer", JSON.stringify(auth));
          toast.success("Signed in successfully (local mode)", {
            id: "signing",
          });
          setSignedIn(true);
          if (typeof window !== "undefined") {
            setTimeout(() => {
              window.__isAuthenticating = false;
            }, 2000);
          }
          return;
        }
        throw backendError; // Re-throw if it's not a network error
      }

      localStorage.setItem("auth_signer", JSON.stringify(auth));
      Cookies.set("access_token", data.access_token, {
        expires: 4,
      });

      if (!data.user?.username) {
        setOpen(true);
      }

      toast.success("Signed in successfully", {
        id: "signing",
      });
      
      setSignedIn(true);
      
      // Clear authentication flag after successful login
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.__isAuthenticating = false;
        }, 2000);
      }
    } catch (e) {
      console.error("Error logging in", e);
      toast.error("Error signing in", {
        id: "signing",
      });
      
      // Don't logout immediately on error - might be recoverable
      // Only clear session if it's a critical error
      const isCriticalError = e?.response?.status === 401 || 
                              e?.message?.includes("Unauthorized") ||
                              e?.message?.includes("Invalid");
      
      if (isCriticalError) {
        setSignedIn(false);
        localStorage.removeItem("auth_signer");
        Cookies.remove("access_token");
        if (user && handleLogOut) {
          console.log("Critical error during login, logging out", e);
          // Don't call handleLogOut immediately - it might trigger a reload
          // Instead, just clear the session and let the user try again
        }
      } else {
        console.warn("Non-critical error during login, keeping session", e);
        // For non-critical errors, keep the session and let user retry
      }
    } finally {
      toast.dismiss("signing");
      setSigningIn(false);
      
      // Clear authentication flag if login failed
      if (typeof window !== "undefined") {
        setTimeout(() => {
          window.__isAuthenticating = false;
        }, 5000);
      }
    }
  };

  useEffect(() => {
    if (isSignedIn || isLoading || isSigningIn || hasAttemptedLogin) return;
    
    // Only trigger login if:
    // 1. User is ready to sign
    // 2. User exists
    // 3. Provider has a valid chainId (network has been selected)
    if (isReadyToSign && user && provider) {
      // Check if provider has a valid network/chainId
      provider.getNetwork()
        .then((network) => {
          if (network && network.chainId !== undefined && network.chainId !== null) {
            console.log("[AuthProvider] Network selected, triggering login on chainId:", network.chainId.toString());
            // Mark that we've attempted login to prevent duplicate calls
            setHasAttemptedLogin(true);
            // Network is selected, proceed with login
            login(user);
          } else {
            console.log("[AuthProvider] Waiting for network selection...");
          }
        })
        .catch((error) => {
          console.warn("[AuthProvider] Error getting network, waiting for network selection:", error);
        });
    }
  }, [isReadyToSign, isSignedIn, isLoading, user, provider, isSigningIn, hasAttemptedLogin]);

  useEffect(() => {
    // Only set ready to sign when user is loaded AND provider has a valid network
    if (user && isLoaded && provider) {
      provider.getNetwork()
        .then((network) => {
          if (network && network.chainId !== undefined && network.chainId !== null) {
            console.log("[AuthProvider] User and network ready, setting isReadyToSign");
            setIsReadyToSign(true);
          } else {
            console.log("[AuthProvider] User loaded but network not selected yet");
            setIsReadyToSign(false);
          }
        })
        .catch((error) => {
          console.warn("[AuthProvider] Error checking network:", error);
          setIsReadyToSign(false);
        });
    } else if (user && isLoaded && !provider) {
      // If provider is not ready yet, wait for it
      console.log("[AuthProvider] User loaded but provider not ready yet");
      setIsReadyToSign(false);
    } else if (!user || !isLoaded) {
      // Reset ready state if user or provider is not loaded
      setIsReadyToSign(false);
      setHasAttemptedLogin(false);
    }
  }, [user, isLoaded, provider]);

  useEffect(() => {
    if (userData) {
      // Only open dialog if username is empty AND user hasn't skipped it
      // This prevents reopening after successful signup or if user skipped
      const username = userData.user?.username || userData.username;
      const hasSkipped = localStorage.getItem("username_setup_skipped") === "true";
      
      if ((username === "" || !username) && !hasSkipped) {
        // Small delay to avoid race condition with signup completion
        const timer = setTimeout(() => {
          setOpen(true);
        }, 500);
        return () => clearTimeout(timer);
      } else {
        // If username exists or user skipped, make sure dialog is closed
        setOpen(false);
      }
    }
  }, [userData, setOpen]);

  return (
    <AuthContext.Provider
      value={{
        userData: userData || {},
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  return useContext(AuthContext);
};
