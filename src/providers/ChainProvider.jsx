const chainConfigs =
  import.meta.env.VITE_APP_ENVIRONMENT === "production" ? [] : {};

export default function ChainProvider({ children }) {
  return <>{children}</>;
}
