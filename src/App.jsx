import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import RootProvider from "./providers/RootProvider";
import { RootLayout } from "./layouts/RootLayout.jsx";
import activityLogger from "./lib/activityLogger.js";
import { useEffect } from "react";

function App() {
  console.log("[App] Rendering App component...");
  activityLogger.info('App', 'App component rendering...');
  
  useEffect(() => {
    activityLogger.success('App', 'App component mounted successfully');
    
    // Log initial page load
    activityLogger.info('App', 'Initial page load', {
      url: window.location.href,
      pathname: window.location.pathname,
      referrer: document.referrer,
      userAgent: navigator.userAgent.substring(0, 100),
    });
  }, []);
  
  try {
    return (
      <RootLayout>
        <RootProvider>
          <RouterProvider router={router} />
        </RootProvider>
      </RootLayout>
    );
  } catch (error) {
    console.error("[App] Error in App component:", error);
    activityLogger.error('App', 'Error in App component', { error: error.message, stack: error.stack });
    throw error;
  }
}

export default App;
