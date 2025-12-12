import { RouterProvider } from "react-router-dom";
import { router } from "./router";
import RootProvider from "./providers/RootProvider";
import { RootLayout } from "./layouts/RootLayout.jsx";

function App() {
  console.log("[App] Rendering App component...");
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
    throw error;
  }
}

export default App;
