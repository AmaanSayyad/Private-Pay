import { Link, useLocation } from "react-router-dom";
import { 
  DollarSign, 
  LayoutDashboard, 
  Wallet, 
  Shield, 
  Lock, 
  ArrowLeftRight, 
  Zap,
  Coins,
  Network,
  TrendingUp,
  Repeat,
  ChevronDown,
  Fingerprint
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cnm } from "../../utils/style.js";

export default function Navbar() {
  const location = useLocation();
  const [starknetOpen, setStarknetOpen] = useState(false);
  const starknetRef = useRef(null);
  const [dropdownPosition, setDropdownPosition] = useState({ bottom: 0, left: 0 });

  const isStarknetActive = 
    location.pathname.startsWith("/starknet") || 
    location.pathname.startsWith("/ztarknet") || 
    location.pathname.startsWith("/zcash-starknet");

  useEffect(() => {
    if (starknetOpen && starknetRef.current) {
      const rect = starknetRef.current.getBoundingClientRect();
      setDropdownPosition({
        bottom: window.innerHeight - rect.top + 8,
        left: rect.left
      });
    }
  }, [starknetOpen, location.pathname]);

  return (
    <div className="fixed z-50 bottom-0 left-0 w-full py-5 flex items-center justify-center" style={{ overflow: 'visible' }}>
      <div className="bg-light-white shadow-xl shadow-black/10 border border-black/20 rounded-full p-1 flex text-sm gap-1.5 font-medium max-w-[95vw] overflow-x-auto overflow-y-visible [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        {/* Core */}
        <Link
          to={"/"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname === "/" ? "bg-primary text-white" : ""}`
          )}
        >
          <LayoutDashboard className="size-3.5" />
          <span>Dashboard</span>
        </Link>

        <Link
          to={"/payment-links"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname === "/payment-links" ? "bg-primary text-white" : ""}`
          )}
        >
          <Wallet className="size-3.5" />
          <span>Payment Links</span>
        </Link>

        <Link
          to={"/transactions"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname === "/transactions" ? "bg-primary text-white" : ""}`
          )}
        >
          <DollarSign className="size-3.5" />
          <span>Transactions</span>
        </Link>

        <div className="w-px h-6 bg-black/10 mx-0.5" />

        {/* Wallets & Privacy */}
        <Link
          to={"/unstoppable"}
          className={cnm(
            "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/unstoppable") ? "bg-primary text-white" : ""}`
          )}
        >
          <Fingerprint className="size-3.5" />
          <span>Unstoppable</span>
        </Link>

        <Link
          to={"/zcash"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/zcash") && !location.pathname.includes("bridge") && !location.pathname.includes("starknet") ? "bg-primary text-white" : ""}`
          )}
        >
          <Shield className="size-3.5" />
          <span>Zcash</span>
        </Link>

        <div className="w-px h-6 bg-black/10 mx-0.5" />

        {/* Privacy Protocols */}
        <Link
          to={"/arcium"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/arcium") ? "bg-primary text-white" : ""}`
          )}
        >
          <Shield className="size-3.5" />
          <span>Arcium</span>
        </Link>

        <Link
          to={"/aztec"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/aztec") || location.pathname.startsWith("/bridge") ? "bg-primary text-white" : ""}`
          )}
        >
          <Lock className="size-3.5" />
          <span>Aztec</span>
        </Link>

        <Link
          to={"/mina"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/mina") ? "bg-primary text-white" : ""}`
          )}
        >
          <Network className="size-3.5" />
          <span>Mina</span>
        </Link>

        <Link
          to={"/fhenix"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/fhenix") ? "bg-primary text-white" : ""}`
          )}
        >
          <Lock className="size-3.5" />
          <span>Fhenix</span>
        </Link>

        <div className="w-px h-6 bg-black/10 mx-0.5" />

        {/* Starknet Group with Dropdown */}
        <div 
          className="relative" 
          ref={starknetRef}
          onMouseEnter={() => {
            if (starknetRef.current) {
              const rect = starknetRef.current.getBoundingClientRect();
              setDropdownPosition({
                bottom: window.innerHeight - rect.top + 8,
                left: rect.left
              });
            }
            setStarknetOpen(true);
          }}
          onMouseLeave={() => setStarknetOpen(false)}
        >
          <div className="flex items-center rounded-full" style={{ background: isStarknetActive ? '#0d08e3' : 'transparent' }}>
            <Link
              to={"/starknet"}
              className={cnm(
                "px-3 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
                `${isStarknetActive ? "text-white" : ""}`
              )}
            >
              <Zap className="size-3.5" />
              <span>Starknet</span>
            </Link>
            <button
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setStarknetOpen(!starknetOpen);
              }}
              className={cnm(
                "px-1 py-2 rounded-full transition-all duration-300 flex items-center",
                `${isStarknetActive ? "text-white" : ""}`
              )}
            >
              <ChevronDown className={cnm("size-3 transition-transform", starknetOpen && "rotate-180")} />
            </button>
          </div>
        </div>

        {/* Dropdown rendered in fixed position */}
        {starknetOpen && (
          <div 
            className="fixed bg-white shadow-2xl border border-black/20 rounded-2xl p-2 min-w-[220px] flex flex-col gap-1"
            style={{ 
              bottom: `${dropdownPosition.bottom}px`,
              left: `${dropdownPosition.left}px`,
              zIndex: 100
            }}
            onMouseEnter={() => setStarknetOpen(true)}
            onMouseLeave={() => setStarknetOpen(false)}
          >
              <Link
                to={"/starknet"}
                onClick={() => setStarknetOpen(false)}
                className={cnm(
                  "px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-300",
                  `${location.pathname === "/starknet" ? "bg-primary text-white" : "hover:bg-black/5"}`
                )}
              >
                <Zap className="size-3.5" />
                <span>Starknet</span>
              </Link>
              <Link
                to={"/zcash-starknet-bridge"}
                onClick={() => setStarknetOpen(false)}
                className={cnm(
                  "px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-300",
                  `${location.pathname.startsWith("/zcash-starknet-bridge") ? "bg-primary text-white" : "hover:bg-black/5"}`
                )}
              >
                <ArrowLeftRight className="size-3.5" />
                <span>Zcash-Starknet Bridge</span>
              </Link>
              <Link
                to={"/ztarknet-lending"}
                onClick={() => setStarknetOpen(false)}
                className={cnm(
                  "px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-300",
                  `${location.pathname.startsWith("/ztarknet-lending") ? "bg-primary text-white" : "hover:bg-black/5"}`
                )}
              >
                <TrendingUp className="size-3.5" />
                <span>Ztarknet Lending</span>
              </Link>
              <Link
                to={"/ztarknet-swap"}
                onClick={() => setStarknetOpen(false)}
                className={cnm(
                  "px-3 py-2 rounded-lg flex items-center gap-2 transition-all duration-300",
                  `${location.pathname.startsWith("/ztarknet-swap") ? "bg-primary text-white" : "hover:bg-black/5"}`
                )}
              >
                <Repeat className="size-3.5" />
                <span>Ztarknet Swap</span>
              </Link>
            </div>
        )}

        <div className="w-px h-6 bg-black/10 mx-0.5" />

        {/* Cross-Chain & Bridges */}
        <Link
          to={"/cross-chain"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname === "/cross-chain" ? "bg-primary text-white" : ""}`
          )}
        >
          <ArrowLeftRight className="size-3.5" />
          <span>Axelar</span>
        </Link>

        <Link
          to={"/osmosis"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/osmosis") ? "bg-primary text-white" : ""}`
          )}
        >
          <Coins className="size-3.5" />
          <span>Osmosis</span>
        </Link>

        <Link
          to={"/solana-zcash-bridge"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/solana-zcash-bridge") ? "bg-primary text-white" : ""}`
          )}
        >
          <ArrowLeftRight className="size-3.5" />
          <span>Sol-ZEC</span>
        </Link>

        <Link
          to={"/zcash-mina-bridge"}
          className={cnm(
            "px-2.5 py-2 rounded-full flex items-center gap-1.5 transition-all duration-300 whitespace-nowrap",
            `${location.pathname.startsWith("/zcash-mina-bridge") ? "bg-primary text-white" : ""}`
          )}
        >
          <ArrowLeftRight className="size-3.5" />
          <span>ZEC-Mina</span>
        </Link>

      </div>

    </div>
  );
}
