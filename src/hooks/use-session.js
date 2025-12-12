import { useIsLoggedIn } from "@dynamic-labs/sdk-react-core";
import { useEffect, useState } from "react";
import { isSignedInAtom } from "../store/auth-store";
import { useAtom } from "jotai";
import Cookies from "js-cookie";

// Safe wrapper for useIsLoggedIn
const useIsLoggedInSafe = () => {
  try {
    return useIsLoggedIn();
  } catch (error) {
    return false;
  }
};

export const useSession = () => {
  const isLoggedIn = useIsLoggedInSafe();
  const [isSignedIn, setSignedIn] = useAtom(isSignedInAtom);
  const [isLoading, setIsLoading] = useState(false);
  const access_token = Cookies.get("access_token");

  // Log session state for debugging
  console.log("[useSession] Session state:", {
    isLoggedIn,
    isSignedIn,
    hasAccessToken: !!access_token,
    hasAuthSigner: !!localStorage.getItem("auth_signer"),
  });

  useEffect(() => {
    let timeout;
    const auth_signer = localStorage.getItem("auth_signer");
    if (isLoggedIn && auth_signer && access_token) {
      setIsLoading(true);
      setSignedIn(true);
      timeout = setTimeout(() => {
        setIsLoading(false);
      }, 500);
    }

    return () => {
      clearTimeout(timeout);
    };
  }, [isLoggedIn, access_token]);

  return {
    isSignedIn,
    isLoading,
  };
};
