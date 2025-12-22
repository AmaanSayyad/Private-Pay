import { ScrollRestoration } from "react-router-dom";
import Dashboard from "../components/home/dashboard/Dashboard";
import { MobilePageWrapper } from "../components/shared/MobileNav";

export default function IndexPage() {
  return (
    <MobilePageWrapper>
      <Dashboard />
      <ScrollRestoration />
    </MobilePageWrapper>
  );
}
