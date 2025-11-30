import { Transfer } from "../components/transfer/Transfer.jsx";
import { AptosWithdraw } from "../components/transfer/AptosWithdraw.jsx";
import { useAptos } from "../providers/AptosProvider.jsx";

export default function TransferPage() {
  const { isConnected } = useAptos();

  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10">
      {isConnected ? <AptosWithdraw /> : <Transfer />}
    </div>
  );
}
