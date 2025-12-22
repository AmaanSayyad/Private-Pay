import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import AuthLayout from "./layouts/AuthLayout.jsx";
import ErrorPage from "./pages/ErrorPage.jsx";
import PlainLayout from "./layouts/PlainLayout.jsx";

// Lazy load pages for code-splitting
const IndexPage = lazy(() => import("./pages/IndexPage.jsx"));
const PaymentPage = lazy(() => import("./pages/PaymentPage.jsx"));
const AliasDetailPage = lazy(() => import("./pages/AliasDetailPage.jsx").then(m => ({ default: m.AliasDetailPage })));
const TransferPage = lazy(() => import("./pages/TransferPage.jsx"));
const PaymentLinksPage = lazy(() => import("./pages/PaymentLinksPage.jsx"));
const TransactionsPage = lazy(() => import("./pages/TransactionsPage.jsx"));
const MainBalancePage = lazy(() => import("./pages/MainBalancePage.jsx"));
const PrivateBalancePage = lazy(() => import("./pages/PrivateBalancePage.jsx"));
const SendPage = lazy(() => import("./pages/SendPage.jsx"));
// Arcium Private DeFi Pages
const ArciumDashboard = lazy(() => import("./pages/ArciumDashboard.jsx"));
const PrivateSwapPage = lazy(() => import("./pages/PrivateSwapPage.jsx"));
const DarkPoolPage = lazy(() => import("./pages/DarkPoolPage.jsx"));
const PrivatePaymentsPage = lazy(() => import("./pages/PrivatePaymentsPage.jsx"));
// Zcash-Aztec Integration Pages
const BridgePage = lazy(() => import("./pages/BridgePage.jsx"));
const MinaPage = lazy(() => import("./components/mina-protocol/MinaPage.jsx"));
const ZcashPage = lazy(() => import("./pages/ZcashPage.jsx"));
const ZcashMinaBridgePage = lazy(() => import("./pages/ZcashMinaBridgePage.jsx"));
// Starknet Integration
const StarknetPage = lazy(() => import("./pages/StarknetPage.jsx"));
const ZcashStarknetBridgePage = lazy(() => import("./pages/ZcashStarknetBridgePage.jsx"));
const ZtarknetLendingPage = lazy(() => import("./pages/ZtarknetLendingPage.jsx"));
const ZtarknetSwapPage = lazy(() => import("./pages/ZtarknetSwapPage.jsx"));
// Axelar Cross-Chain Payments
const CrossChainPaymentPage = lazy(() => import("./pages/CrossChainPaymentPage.jsx"));
const OsmosisPage = lazy(() => import("./pages/OsmosisPage.jsx"));
// Unstoppable Wallet - Self-Custody with Zcash Privacy
const UnstoppableDashboard = lazy(() => import("./pages/UnstoppableDashboard.jsx"));
// Solana-Zcash Bridge (Helius-powered)
const SolanaZcashBridgePage = lazy(() => import("./pages/SolanaZcashBridgePage.jsx"));

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
  </div>
);

// Wrapper component for lazy-loaded routes
const LazyRoute = ({ Component }) => (
  <Suspense fallback={<PageLoader />}>
    <Component />
  </Suspense>
);

const EXCLUDED_SUBDOMAINS = [
  "www",
  "admin",
  "api",
  "app",
  "auth",
  "blog",
  "cdn",
  "dev",
  "forum",
  "mail",
  "shop",
  "support",
  "test",
  "server",
  "webmail",
];

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AuthLayout />,
    loader: () => {
      const host = window.location.hostname;
      const websiteHost = import.meta.env.VITE_WEBSITE_HOST || 'privatepay.me';
      const suffix = `.${websiteHost}`;

      if (host.endsWith(suffix)) {
        const subdomain = host.slice(0, -suffix.length);
        if (!EXCLUDED_SUBDOMAINS.includes(subdomain))
          return { subdomain: subdomain };
        else return { subdomain: null };
      }

      return { subdomain: null };
    },
    errorElement: <ErrorPage />,
    children: [
      {
        path: "/",
        element: <LazyRoute Component={IndexPage} />,
      },
      {
        path: "/:alias/detail/:parent",
        loader: ({ params, request }) => {
          const url = new URL(request.url);
          const id = url.searchParams.get("id");

          return { fullAlias: `${params.alias}.squidl.me`, aliasId: id };
        },
        element: <LazyRoute Component={AliasDetailPage} />,
        children: [
          {
            path: "transfer",
            element: <LazyRoute Component={TransferPage} />,
          },
        ],
      },
      {
        path: "/:alias/transfer",
        element: <LazyRoute Component={TransferPage} />,
      },
      {
        path: "/payment-links",
        element: <LazyRoute Component={PaymentLinksPage} />,
      },
      {
        path: "/transactions",
        element: <LazyRoute Component={TransactionsPage} />,
      },
      {
        path: "/main-details",
        element: <LazyRoute Component={MainBalancePage} />,
      },
      {
        path: "/private-details",
        element: <LazyRoute Component={PrivateBalancePage} />,
      },
      {
        path: "/send",
        element: <LazyRoute Component={SendPage} />,
      },
      {
        path: "/transfer",
        element: <LazyRoute Component={TransferPage} />,
      },
      // Arcium Private DeFi Routes
      {
        path: "/arcium",
        element: <LazyRoute Component={ArciumDashboard} />,
      },
      {
        path: "/arcium/swap",
        element: <LazyRoute Component={PrivateSwapPage} />,
      },
      {
        path: "/arcium/darkpool",
        element: <LazyRoute Component={DarkPoolPage} />,
      },
      {
        path: "/arcium/payments",
        element: <LazyRoute Component={PrivatePaymentsPage} />,
      },
      // Zcash-Aztec Integration Routes
      {
        path: "/aztec",
        element: <Navigate to="/bridge" replace />,
      },
      {
        path: "/bridge",
        element: <LazyRoute Component={BridgePage} />,
      },
      {
        path: "/mina",
        element: <LazyRoute Component={MinaPage} />,
      },
      {
        path: "/zcash",
        element: <LazyRoute Component={ZcashPage} />,
      },
      {
        path: "/zcash-mina-bridge",
        element: <LazyRoute Component={ZcashMinaBridgePage} />,
      },
      // Starknet Integration Routes
      {
        path: "/starknet",
        element: <LazyRoute Component={StarknetPage} />,
      },
      {
        path: "/zcash-starknet-bridge",
        element: <LazyRoute Component={ZcashStarknetBridgePage} />,
      },
      {
        path: "/ztarknet-lending",
        element: <LazyRoute Component={ZtarknetLendingPage} />,
      },
      {
        path: "/ztarknet-swap",
        element: <LazyRoute Component={ZtarknetSwapPage} />,
      },
      // Axelar Cross-Chain Payment
      {
        path: "/cross-chain",
        element: <LazyRoute Component={CrossChainPaymentPage} />,
      },
      // Cosmos / Osmosis Integration
      {
        path: "/osmosis",
        element: <LazyRoute Component={OsmosisPage} />,
      },
      // Unstoppable Wallet - Zcash Self-Custody
      {
        path: "/unstoppable",
        element: <LazyRoute Component={UnstoppableDashboard} />,
      },
      // Solana-Zcash Bridge (Helius-powered)
      {
        path: "/solana-zcash-bridge",
        element: <LazyRoute Component={SolanaZcashBridgePage} />,
      },
    ],
  },
  {
    path: "/payment",
    element: <PlainLayout />,
    errorElement: <ErrorPage />,
    children: [
      {
        path: ":alias_url",
        element: <LazyRoute Component={PaymentPage} />,
      },
    ],
  },
]);
