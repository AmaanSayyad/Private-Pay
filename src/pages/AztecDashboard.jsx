import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, CardBody, Chip } from "@nextui-org/react";
import { Icons } from "../components/shared/Icons";
import {
  Lock,
  ArrowLeftRight,
  Coins,
  Shield,
  Zap,
  Eye,
  EyeOff
} from "lucide-react";

export default function AztecDashboard() {
  const navigate = useNavigate();

  const features = [
    {
      title: "Zcash Bridge",
      description: "Bridge between Zcash and Aztec for private transfers",
      icon: <ArrowLeftRight className="w-6 h-6" />,
      path: "/bridge",
      stats: "Private Bridge",
    },
    {
      title: "Private Stablecoin",
      description: "Privacy-first stablecoin (pZUSD) backed by Zcash",
      icon: <Coins className="w-6 h-6" />,
      path: "/stablecoin",
      stats: "100% Private",
    },
  ];

  const securityFeatures = [
    { icon: <Lock className="w-4 h-4" />, text: "Encrypted State" },
    { icon: <Zap className="w-4 h-4" />, text: "Fast Execution" },
    { icon: <Shield className="w-4 h-4" />, text: "Private Contracts" },
  ];

  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10 bg-gradient-to-br from-white to-indigo-50/30">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Button
              isIconOnly
              variant="light"
              className="text-gray-600"
              onClick={() => navigate("/")}
            >
              <Icons.back className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <span className="text-primary">Aztec</span>
                <Chip size="sm" color="primary" variant="flat">
                  Private Smart Contracts
                </Chip>
              </h1>
              <p className="text-gray-500 text-sm mt-1">
                Encrypted computation and private state
              </p>
            </div>
          </div>
        </div>

        {/* Security Badge */}
        <Card className="mb-8 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200">
          <CardBody className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-indigo-100 rounded-full">
                  <Shield className="w-6 h-6 text-indigo-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">
                    Privacy-First Infrastructure
                  </h3>
                  <p className="text-sm text-gray-600">
                    Private smart contracts with encrypted state
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                {securityFeatures.map((feature, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-full border border-indigo-200"
                  >
                    {feature.icon}
                    <span className="text-xs font-medium text-gray-700">
                      {feature.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {features.map((feature, idx) => (
            <Card
              key={idx}
              isPressable
              onPress={() => navigate(feature.path)}
              className="hover:shadow-lg transition-shadow cursor-pointer border border-gray-200"
            >
              <CardBody className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="p-3 bg-indigo-100 rounded-xl">
                    {feature.icon}
                  </div>
                  <Chip size="sm" color="primary" variant="flat">
                    {feature.stats}
                  </Chip>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {feature.title}
                </h3>
                <p className="text-gray-600 text-sm mb-4">
                  {feature.description}
                </p>
                <Button
                  color="primary"
                  variant="flat"
                  className="w-full"
                  onPress={() => navigate(feature.path)}
                >
                  Explore {feature.title}
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <Card className="bg-gray-50 border border-gray-200">
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Eye className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  About Aztec Integration
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Aztec provides a privacy-first smart contract platform with encrypted state.
                  Bridge assets between Zcash and Aztec, or use private stablecoins for
                  completely private transactions with hidden amounts and recipients.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}




