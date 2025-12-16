import { Link, useLocation } from "react-router-dom";
import { DollarSign, LayoutDashboard, Wallet, Shield, Lock, ArrowLeftRight, Sparkles } from "lucide-react";
import { cnm } from "../../utils/style.js";

export default function Navbar() {
  const location = useLocation();

  return (
    <div className="fixed z-50 bottom-0 left-0 w-full py-5 flex items-center justify-center">
      <div className="bg-light-white shadow-xl shadow-black/10 border border-black/20 rounded-full p-1 flex text-sm gap-2 font-medium">
        <Link
          to={"/"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname === "/" ? "bg-primary text-white" : ""}`
          )}
        >
          <LayoutDashboard className="size-3" />
          Dashboard
        </Link>

        <Link
          to={"/payment-links"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname === "/payment-links" ? "bg-primary text-white" : ""}`
          )}
        >
          <Wallet className="size-3" />
          Payment Links
        </Link>

        <Link
          to={"/transactions"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname === "/transactions" ? "bg-primary text-white" : ""}`
          )}
        >
          <DollarSign className="size-3" />
          Transactions
        </Link>

        <Link
          to={"/arcium"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname.startsWith("/arcium") ? "bg-primary text-white" : ""}`
          )}
        >
          <Shield className="size-3" />
          Arcium
        </Link>

        <Link
          to={"/aztec"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname.startsWith("/aztec") ? "bg-primary text-white" : ""}`
          )}
        >
          <Lock className="size-3" />
          Aztec
        </Link>
        <Link
          to={"/mina"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname.startsWith("/mina") ? "bg-primary text-white" : ""}`
          )}
        >
          <Shield className="size-3" />
          Mina
        </Link>
        <Link
          to={"/bridge"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname.startsWith("/bridge") ? "bg-primary text-white" : ""}`
          )}
        >
          <Shield className="size-3" />
          Bridge
        </Link>
        <Link
          to={"/zcash"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname.startsWith("/zcash") ? "bg-primary text-white" : ""}`
          )}
        >
          <Shield className="size-3" />
          Zcash
        </Link>
        <Link to={"/zcash-mina-bridge"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname.startsWith("/zcash-mina-bridge") ? "bg-primary text-white" : ""}`
          )}
        >
          <Shield className="size-3" />
          Zcash-Mina Bridge
        </Link>
        <Link
          to={"/stablecoin"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname.startsWith("/stablecoin") ? "bg-primary text-white" : ""}`
          )}
        >
          <Shield className="size-3" />
          Stablecoin
        </Link>

        <Link
          to={"/cross-chain"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname === "/cross-chain" ? "bg-primary text-white" : ""}`
          )}
        >
          <ArrowLeftRight className="size-3" />
          Axelar
        </Link>
        <Link
          to={"/say-and-pay"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1 transition-all duration-300",
            `${location.pathname === "/say-and-pay" ? "bg-primary text-white" : ""}`
          )}
        >
          <Sparkles className="size-3" />
          Say & Pay
        </Link>
      </div>
    </div>
  );
}
