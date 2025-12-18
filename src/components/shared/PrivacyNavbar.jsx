import { Link, useLocation } from "react-router-dom";
import { Shield, Lock, ArrowLeftRight, Coins, Database, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { cnm } from "../../utils/style.js";

export default function PrivacyNavbar() {
    const location = useLocation();

    return (
        <div className="w-full flex justify-center mb-8 relative z-50">
            <div className="bg-white/80 backdrop-blur-md shadow-lg shadow-black/5 border border-black/10 rounded-full p-1.5 flex flex-wrap justify-center text-sm gap-2 font-medium">
                <Link
                    to={"/mina"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-orange-50",
                        `${location.pathname.startsWith("/mina") ? "bg-orange-500 text-white hover:bg-orange-600 shadow-md shadow-orange-200" : "text-gray-600"}`
                    )}
                >
                    <img src="/assets/mina_logo.png" alt="Mina" className="w-5 h-5 rounded-full" />
                    Mina
                </Link>
                <Link
                    to={"/zcash"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-yellow-50",
                        `${location.pathname.startsWith("/zcash") && !location.pathname.includes("bridge") ? "bg-yellow-500 text-white hover:bg-yellow-600 shadow-md shadow-yellow-200" : "text-gray-600"}`
                    )}
                >
                    <img src="/assets/zcash_logo.png" alt="Zcash" className="w-5 h-5 rounded-full" />
                    Zcash
                </Link>
                <Link
                    to={"/aztec"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-gray-50",
                        `${location.pathname.startsWith("/aztec") ? "bg-black text-white hover:bg-gray-800 shadow-md shadow-gray-200" : "text-gray-600"}`
                    )}
                >
                    <Lock className="size-4" />
                    Aztec
                </Link>
                <Link
                    to={"/bridge"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-purple-50",
                        `${location.pathname === "/bridge" ? "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-200" : "text-gray-600"}`
                    )}
                >
                    <ArrowLeftRight className="size-4" />
                    Bridge
                </Link>
                <Link
                    to={"/zcash-mina-bridge"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-green-50",
                        `${location.pathname.startsWith("/zcash-mina-bridge") ? "bg-green-600 text-white hover:bg-green-700 shadow-md shadow-green-200" : "text-gray-600"}`
                    )}
                >
                    <Database className="size-4" />
                    PoC Bridge
                </Link>
                <Link
                    to={"/stablecoin"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-blue-50",
                        `${location.pathname.startsWith("/stablecoin") ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-200" : "text-gray-600"}`
                    )}
                >
                    <Coins className="size-4" />
                    Stablecoin
                </Link>
                <Link
                    to={"/starknet"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-purple-50",
                        `${location.pathname.startsWith("/starknet") ? "bg-purple-600 text-white hover:bg-purple-700 shadow-md shadow-purple-200" : "text-gray-600"}`
                    )}
                >
                    <Zap className="size-4" />
                    Starknet
                </Link>
                <Link
                    to={"/zcash-starknet-bridge"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-indigo-50",
                        `${location.pathname.startsWith("/zcash-starknet-bridge") ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200" : "text-gray-600"}`
                    )}
                >
                    <Shield className="size-4" />
                    Ztarknet
                </Link>
                <Link
                    to={"/ztarknet-lending"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-violet-50",
                        `${location.pathname.startsWith("/ztarknet-lending") ? "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200" : "text-gray-600"}`
                    )}
                >
                    <TrendingUp className="size-4" />
                    Lending
                </Link>
                <Link
                    to={"/ztarknet-swap"}
                    className={cnm(
                        "px-4 py-2 rounded-full flex items-center gap-2 transition-all duration-300 hover:bg-cyan-50",
                        `${location.pathname.startsWith("/ztarknet-swap") ? "bg-cyan-600 text-white hover:bg-cyan-700 shadow-md shadow-cyan-200" : "text-gray-600"}`
                    )}
                >
                    <RefreshCw className="size-4" />
                    Swap
                </Link>
            </div>
        </div>
    );
}
