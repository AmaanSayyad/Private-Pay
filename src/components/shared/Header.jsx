import { Button } from "@nextui-org/react";
import { Link } from "react-router-dom";
import { Icons } from "./Icons.jsx";
import Nounsies from "./Nounsies.jsx";
import { useSetAtom } from "jotai";
import { isCreateLinkDialogAtom } from "../../store/dialog-store.js";
import { useAptos } from "../../providers/AptosProvider";
import { useState } from "react";

export default function Header() {
  const setCreateLinkModal = useSetAtom(isCreateLinkDialogAtom);

  return (
    <nav className="fixed top-0 z-50 flex items-center px-5 md:px-12 h-20 justify-between bg-white md:bg-transparent w-full">
      <div className="flex flex-row items-center gap-12">
        <Link to={"/"} className="w-12">
          <img
            src="/assets/squidl-only.svg"
            alt="squidl-logo"
            className="w-full h-full object-contain"
          />
        </Link>
      </div>

      <div className="flex gap-4 items-center justify-center">
        <Button
          onClick={() => setCreateLinkModal(true)}
          className={"bg-primary h-12 rounded-[24px] px-4"}
        >
          <Icons.link className="text-white" />
          <h1 className={"text-sm font-medium text-white"}>Create Link</h1>
        </Button>

        <UserProfileButton />
      </div>
    </nav>
  );
}

const UserProfileButton = () => {
  const { account, isConnected, connect, disconnect } = useAptos();
  const [showMenu, setShowMenu] = useState(false);

  const handleConnect = async () => {
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnect();
      setShowMenu(false);
    } catch (error) {
      console.error("Failed to disconnect wallet:", error);
    }
  };

  if (!isConnected) {
    return (
      <Button
        onClick={handleConnect}
        className="h-12 rounded-full bg-primary-50 text-primary font-medium px-6"
      >
        Connect Aptos Wallet
      </Button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="size-12 rounded-full overflow-hidden relative border-[4px] border-[#563EEA]"
      >
        <Nounsies address={account || ""} />
      </button>

      {showMenu && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />
          <div className="absolute right-0 top-14 z-50 bg-white rounded-2xl shadow-lg border border-neutral-200 p-4 min-w-[280px]">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-3 pb-3 border-b border-neutral-200">
                <div className="size-10 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                  <Nounsies address={account || ""} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </p>
                  <p className="text-xs text-gray-500">Aptos Wallet</p>
                </div>
              </div>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(account || "");
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <Icons.copy className="size-4 text-gray-600" />
                <span className="text-sm text-gray-700">Copy Address</span>
              </button>

              <button
                onClick={() => {
                  window.open(
                    `https://explorer.aptoslabs.com/account/${account}?network=testnet`,
                    "_blank"
                  );
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 hover:bg-neutral-50 rounded-lg transition-colors"
              >
                <Icons.externalLink className="size-4 text-gray-600" />
                <span className="text-sm text-gray-700">View on Explorer</span>
              </button>

              <div className="border-t border-neutral-200 pt-2">
                <button
                  onClick={handleDisconnect}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-red-50 rounded-lg transition-colors w-full text-red-600"
                >
                  <Icons.logout className="size-4" />
                  <span className="text-sm font-medium">Disconnect</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
