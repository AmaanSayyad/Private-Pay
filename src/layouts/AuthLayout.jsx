import { Navigate, Outlet, useLoaderData } from "react-router-dom";
import { DynamicEmbeddedWidget } from "@dynamic-labs/sdk-react-core";
import AuthProvider from "../providers/AuthProvider";
import { Toaster } from "react-hot-toast";
import Header from "../components/shared/Header";
import Navbar from "../components/shared/Navbar";
import CreateLinkDialog from "../components/dialogs/CreateLinkDialog.jsx";
import GetStartedDialog from "../components/dialogs/GetStartedDialog.jsx";
import { useSession } from "../hooks/use-session.js";
import Payment from "../components/payment/Payment.jsx";
import PaymentLayout from "./PaymentLayout.jsx";
import AsciiFlame from "../components/shared/AsciiFlame.jsx";
import EngowlWatermark from "../components/shared/EngowlWatermark.jsx";
import EnvDebug from "../components/debug/EnvDebug.jsx";

// Component to safely use Dynamic context
function DynamicWidgetWrapper() {
  // Just render the widget - it doesn't need useDynamicContext
  // The widget will work as long as DynamicContextProvider is in the tree
  return <DynamicEmbeddedWidget background="with-border" />;
}

export default function AuthLayout() {
  const { isSignedIn } = useSession();
  const loaderData = useLoaderData();
  const subdomain = loaderData?.subdomain;
  const dynamicEnvId = import.meta.env.VITE_DYNAMIC_ENV_ID;
  const hasDynamic = dynamicEnvId && dynamicEnvId !== "your_dynamic_environment_id" && dynamicEnvId !== "";

  // Log Dynamic configuration status for debugging
  console.log("[AuthLayout] Dynamic configuration:", {
    hasDynamic,
    dynamicEnvId: dynamicEnvId ? `${dynamicEnvId.substring(0, 10)}...` : "Not set",
    dynamicEnvIdLength: dynamicEnvId?.length || 0,
    isSignedIn,
    allEnvVars: Object.keys(import.meta.env).filter(k => k.startsWith('VITE_')),
  });

  if (subdomain) {
    return (
      <PaymentLayout>
        <div className="flex min-h-screen w-full items-center justify-center py-5 md:py-20 px-4 md:px-10">
          <Payment />
        </div>
      </PaymentLayout>
    );
  }

  // If Dynamic is not configured, skip authentication and go directly to dashboard
  if (!hasDynamic) {
    console.warn("[AuthLayout] Dynamic.xyz not configured. Skipping authentication screen.");
    return (
      <AuthProvider>
        {/* <EngowlWatermark /> */}
        <CreateLinkDialog />
        <GetStartedDialog />
        <Toaster />
        <Header />
        <Outlet />
        <Navbar />
      </AuthProvider>
    );
  }

  if (!isSignedIn) {
    console.log("[AuthLayout] User not signed in. Showing login screen with Dynamic widget.");
    return (
      <div className="flex min-h-screen w-full items-center justify-center px-5 md:px-10 bg-primary-50">
        <EnvDebug />
        <AsciiFlame />
        {/* <EngowlWatermark /> */}

        <div className="w-full max-w-md">
          <div className="flex flex-col items-center text-center mb-4">
            <img src="/assets/squidl-only.svg" className="w-36" alt="PrivatePay Logo" />
            <div className="text-md font-medium opacity-50 mt-2">
              Stealth Addresses for Untraceable Payments.
            </div>
          </div>

          {/* Wrap DynamicEmbeddedWidget in error boundary */}
          <div 
            id="dynamic-widget-container" 
            style={{ 
              minHeight: '400px', 
              position: 'relative',
              border: '2px dashed #e5e7eb',
              borderRadius: '8px',
              padding: '20px',
              backgroundColor: '#f9fafb'
            }}
          >
            {/* Debug info */}
            {!hasDynamic && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-center">
                <p className="text-yellow-800 text-sm font-semibold">⚠️ Dynamic.xyz not configured</p>
                <p className="text-yellow-600 text-xs mt-1">
                  VITE_DYNAMIC_ENV_ID is missing. Widget will not render.
                </p>
              </div>
            )}
            
            {/* Widget container with loading state */}
            <div id="dynamic-widget-wrapper">
              {hasDynamic ? (
                <>
                  <div className="text-center text-gray-500 text-xs mb-2">
                    Loading authentication widget...
                  </div>
                  <DynamicWidgetWrapper />
                </>
              ) : (
                <div className="p-6 bg-white rounded-lg border border-gray-200 text-center">
                  <p className="text-gray-700 font-semibold mb-2">Authentication Required</p>
                  <p className="text-gray-500 text-sm">
                    Please configure VITE_DYNAMIC_ENV_ID in your Vercel environment variables
                  </p>
                  <p className="text-gray-400 text-xs mt-2">
                    Check the browser console for detailed debug information
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center mt-2">
            <div className="mt-8 opacity-60">Powered by</div>
            <div className="mt-1">
              <img src="/assets/oasis-long-logo.svg" className="w-32" alt="Oasis Logo" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthProvider>
      {/* <EngowlWatermark /> */}
      <CreateLinkDialog />
      <GetStartedDialog />
      <Toaster />
      <Header />
      <Outlet />
      <Navbar />
    </AuthProvider>
  );
}
