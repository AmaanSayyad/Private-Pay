import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Tabs, Tab } from "@nextui-org/react";
import { Icons } from "../components/shared/Icons.jsx";
import { MobilePageWrapper } from "../components/shared/MobileNav";
import AptosSendToUsername from "../components/aptos/AptosSendToUsername.jsx";
import AptosSendPayment from "../components/aptos/AptosSendPayment.jsx";

export default function SendPage() {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState("username");

  return (
    <MobilePageWrapper>
      <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10">
      <div className="relative flex flex-col gap-4 w-full max-w-md items-start justify-center bg-[#F9F9FA] rounded-[32px] p-4 md:p-6">
        <div className="flex items-center justify-between w-full mb-2">
          <h1 className="font-bold text-lg text-[#19191B]">Send Payment</h1>
          <Button
            onClick={() => navigate("/")}
            className="bg-white rounded-full px-4 h-10 flex items-center gap-2"
          >
            <Icons.back className="size-4" />
            <span className="text-sm">Back</span>
          </Button>
        </div>

        <Tabs
          selectedKey={selectedTab}
          onSelectionChange={setSelectedTab}
          variant="bordered"
          classNames={{
            tabList: "w-full bg-white rounded-full p-1",
            tab: "rounded-full",
            cursor: "rounded-full bg-primary",
          }}
        >
          <Tab key="username" title="To Username">
            <div className="mt-4">
              <AptosSendToUsername />
            </div>
          </Tab>
          <Tab key="stealth" title="Stealth Payment">
            <div className="mt-4">
              <AptosSendPayment />
            </div>
          </Tab>
        </Tabs>
      </div>
    </div>
    </MobilePageWrapper>
  );
}
