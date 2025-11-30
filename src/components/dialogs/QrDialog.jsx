import { Button, Modal, ModalContent } from "@nextui-org/react";
import { Icons } from "../shared/Icons.jsx";
import toast from "react-hot-toast";
import { QRCode } from "react-qrcode-logo";
import { useRef, useState, useEffect } from "react";
import { useAptos } from "../../providers/AptosProvider.jsx";

export default function QrDialog({ open, setOpen, qrUrl }) {
  const { account } = useAptos();
  const [username, setUsername] = useState("");
  const qrRef = useRef(null);

  useEffect(() => {
    if (account) {
      const savedUsername = localStorage.getItem(`aptos_username_${account}`);
      setUsername(savedUsername || account.slice(2, 8));
    }
  }, [account]);

  const onCopy = (text) => {
    toast.success("Copied to clipboard", {
      id: "copy",
      duration: 1000,
      position: "bottom-center",
    });
    navigator.clipboard.writeText(text);
  };

  const handleShare = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Payment Link",
          text: `${username}.privatepay.me`,
        });
      } else {
        onCopy(`${username}.privatepay.me`);
      }
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleDownload = async () => {
    try {
      await qrRef.current.download("png", {
        name: `${username}-privatepay-qr`,
      });
    } catch (error) {
      console.error("Error downloading the image:", error);
    }
  };

  if (!account) return null;

  return (
    <Modal
      isOpen={open}
      onOpenChange={setOpen}
      size="md"
      placement="center"
      hideCloseButton
    >
      <ModalContent className="relative flex flex-col rounded-4xl items-center justify-center gap-5 p-6">
        <button
          onClick={() => setOpen(false)}
          className="absolute right-6 top-6 bg-[#F8F8F8] rounded-full p-3"
        >
          <Icons.close className="text-black size-6" />
        </button>

        <div className="flex flex-col items-center gap-2">
          <img
            src="/assets/squidl-only.svg"
            alt="logo"
            className="object-contain w-auto h-10"
          />
          <p className="text-2xl font-bold text-primary">PRIVATEPAY</p>
        </div>

        <h1 className="font-medium text-xl text-[#19191B]">Your QR Code</h1>

        <div className="px-5 md:px-12">
          <div className="bg-primary-600 rounded-[24px] px-5 py-4 flex flex-col items-center justify-center w-full">
            <div className="w-full h-full bg-white p-5 rounded-[24px]">
              <QRCode
                ref={qrRef}
                value={`${username}.privatepay.me`}
                qrStyle="dots"
                logoImage="/assets/nouns.png"
                logoWidth={30}
                logoHeight={30}
                style={{
                  width: "100%",
                  height: "100%",
                }}
              />
            </div>

            <div className="flex flex-row items-center gap-2.5 mt-3">
              <h1 className="font-medium text-lg text-[#F4F4F4]">
                {username}.privatepay.me
              </h1>
              <button onClick={() => onCopy(`${username}.privatepay.me`)}>
                <Icons.copy className="text-primary-200" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-sm text-gray-500">Supported Network</p>
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-full">
            <img src="/assets/aptos-logo.png" alt="Aptos Logo" className="h-5 w-auto object-contain" />
          </div>
        </div>

        <div className="flex w-full items-center gap-4 mt-2">
          <Button
            onClick={handleDownload}
            className="bg-primary rounded-4xl h-14 text-white text-sm w-full"
          >
            Download
          </Button>
          <Button
            onClick={handleShare}
            className="bg-light rounded-4xl h-14 text-primary text-sm w-full"
          >
            Share
          </Button>
        </div>
      </ModalContent>
    </Modal>
  );
}
