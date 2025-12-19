import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Button,
  Card,
  CardBody,
  Input,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Progress,
  Switch,
  Textarea,
  Tooltip,
} from "@nextui-org/react";
import { useUnstoppable } from "../providers/UnstoppableProvider";
import { Icons } from "../components/shared/Icons";
import {
  Shield,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Key,
  Copy,
  Plus,
  RefreshCw,
  AlertTriangle,
  Check,
  Wallet,
  Download,
  Upload,
  Fingerprint,
  Ghost,
  TrendingUp,
  ArrowLeftRight,
  BarChart3,
  Settings,
  Sparkles,
  Zap,
  ExternalLink,
} from "lucide-react";
import toast from "react-hot-toast";

export default function UnstoppableDashboard() {
  const navigate = useNavigate();
  const {
    wallet,
    isConnected,
    isLocked,
    createWallet,
    unlockWallet,
    lockWallet,
    importWallet,
    disconnect,
    exportWallet,
    stealthAddresses,
    generateNewStealthAddress,
    isBalanceHidden,
    decoyMode,
    toggleBalanceVisibility,
    toggleDecoyMode,
    toggleAssetVisibility,
    getVisibleBalances,
    privacyScore,
    publicAddress,
    viewingKey,
    simulateReceive,
    // Zcash Privacy Technology
    zcashAddress,
    shieldedNotes,
    createShieldedNote,
    // Multi-chain addresses
    solanaPublicKey,
    aztecAddress,
    minaPublicKey,
    ethereumAddress,
  } = useUnstoppable();

  // Modals
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: onImportOpen, onClose: onImportClose } = useDisclosure();
  const { isOpen: isBackupOpen, onOpen: onBackupOpen, onClose: onBackupClose } = useDisclosure();
  const { isOpen: isUnlockOpen, onOpen: onUnlockOpen, onClose: onUnlockClose } = useDisclosure();

  // Form state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mnemonic, setMnemonic] = useState("");
  const [newMnemonic, setNewMnemonic] = useState("");
  const [showMnemonic, setShowMnemonic] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

  // Check password strength
  useEffect(() => {
    let strength = 0;
    if (password.length >= 8) strength += 25;
    if (password.length >= 12) strength += 15;
    if (/[A-Z]/.test(password)) strength += 15;
    if (/[a-z]/.test(password)) strength += 15;
    if (/[0-9]/.test(password)) strength += 15;
    if (/[^A-Za-z0-9]/.test(password)) strength += 15;
    setPasswordStrength(Math.min(strength, 100));
  }, [password]);

  // Create wallet handler
  const handleCreate = async () => {
    if (password !== confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }
    if (passwordStrength < 50) {
      toast.error("Password is too weak!");
      return;
    }

    try {
      const result = await createWallet(password);
      setNewMnemonic(result.mnemonic);
      setPassword("");
      setConfirmPassword("");
      onCreateClose();
      onBackupOpen();
    } catch (error) {
      console.error(error);
    }
  };

  // Import wallet handler
  const handleImport = async () => {
    if (password !== confirmPassword) {
      toast.error("Passwords don't match!");
      return;
    }
    if (!mnemonic.trim()) {
      toast.error("Please enter your recovery phrase");
      return;
    }

    try {
      await importWallet(mnemonic.trim(), password);
      setMnemonic("");
      setPassword("");
      setConfirmPassword("");
      onImportClose();
    } catch (error) {
      console.error(error);
    }
  };

  // Unlock wallet handler
  const handleUnlock = async () => {
    const success = await unlockWallet(password);
    if (success) {
      setPassword("");
      onUnlockClose();
    }
  };

  // Copy to clipboard
  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied!`);
  };

  // Get privacy score color
  const getScoreColor = (score) => {
    if (score >= 75) return "success";
    if (score >= 50) return "warning";
    return "danger";
  };

  // Determine wallet state
  const hasNoWallet = !wallet || (!wallet.encrypted && !isConnected);
  const hasLockedWallet = wallet?.encrypted && isLocked;
  const hasUnlockedWallet = isConnected && !isLocked;

  return (
    <div className="flex min-h-screen w-full items-start justify-center py-20 px-4 md:px-10 bg-white pb-24">
      <div className="w-full max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#0d08e3' }}>
              <Fingerprint className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3" style={{ color: '#0d08e3' }}>
                Unstoppable Wallet
                <Chip size="sm" className="text-white" style={{ backgroundColor: '#0d08e3' }}>
                  Self-Custody
                </Chip>
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                🔐 Your keys, your crypto, your privacy
              </p>
            </div>
          </div>

          {/* Wallet status */}
          <div className="flex items-center gap-3">
            {hasUnlockedWallet && (
              <>
                <Tooltip content="Privacy Score">
                  <div className="flex items-center gap-2 px-4 py-2 rounded-xl border-2 shadow-sm" style={{ backgroundColor: '#f0f0ff', borderColor: '#0d08e3' }}>
                    <Shield className="w-5 h-5" style={{ color: '#0d08e3' }} />
                    <span className="font-bold" style={{ color: '#0d08e3' }}>{privacyScore}%</span>
                  </div>
                </Tooltip>
                <Button
                  isIconOnly
                  variant="bordered"
                  className="border-2"
                  style={{ borderColor: '#0d08e3', color: '#0d08e3' }}
                  onClick={lockWallet}
                >
                  <Lock className="w-5 h-5" />
                </Button>
              </>
            )}
          </div>
        </div>

        {/* No wallet state - Show create/import buttons */}
        {hasNoWallet && (
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-xl">
            <CardBody className="flex flex-col items-center justify-center py-20">
              <div className="w-28 h-28 rounded-3xl flex items-center justify-center mb-6 shadow-2xl" style={{ backgroundColor: '#0d08e3' }}>
                <Wallet className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-3xl font-bold mb-3" style={{ color: '#0d08e3' }}>
                Self-Custody Wallet
              </h2>
              <p className="text-gray-700 text-center max-w-lg mb-10 text-base">
                Create a fully private, self-custody wallet with stealth addresses,
                balance hiding, and decoy mode. <span className="font-semibold">No external connections, no tracking.</span>
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  className="font-bold px-10 h-12 text-white shadow-lg"
                  style={{ backgroundColor: '#0d08e3' }}
                  onClick={onCreateOpen}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a06b8'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d08e3'}
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Self-Custody Wallet
                </Button>
                <Button
                  variant="bordered"
                  className="border-2 font-semibold px-8 h-12"
                  style={{ borderColor: '#0d08e3', color: '#0d08e3' }}
                  onClick={onImportOpen}
                >
                  <Upload className="w-5 h-5 mr-2" />
                  Import Existing Wallet
                </Button>
              </div>
            </CardBody>
          </Card>
        )}

        {/* Locked state */}
        {hasLockedWallet && (
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 border-2 border-amber-300 shadow-xl">
            <CardBody className="flex flex-col items-center justify-center py-20">
              <div className="w-28 h-28 rounded-3xl bg-amber-500 flex items-center justify-center mb-6 shadow-2xl">
                <Lock className="w-14 h-14 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-amber-900 mb-3">
                Wallet Locked
              </h2>
              <p className="text-amber-800 text-center max-w-md mb-10 text-base">
                Enter your password to unlock your wallet and access your private assets.
              </p>
              <Button
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-10 h-12 shadow-lg"
                onClick={onUnlockOpen}
              >
                <Unlock className="w-5 h-5 mr-2" />
                Unlock Wallet
              </Button>
            </CardBody>
          </Card>
        )}

        {/* Connected and unlocked state */}
        {hasUnlockedWallet && (
          <>
            {/* Privacy Score & Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Privacy Score Card */}
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-lg md:col-span-2">
                <CardBody className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg" style={{ backgroundColor: '#0d08e3' }}>
                        <Shield className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <h3 className="font-bold text-xl" style={{ color: '#0d08e3' }}>Privacy Score</h3>
                        <p className="text-gray-600 text-sm">Based on your privacy practices</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-5xl font-bold" style={{ color: '#0d08e3' }}>
                        {privacyScore}%
                      </p>
                    </div>
                  </div>
                  <Progress
                    value={privacyScore}
                    color={getScoreColor(privacyScore)}
                    className="h-3 mb-4"
                    style={{ '--nextui-primary': '#0d08e3' }}
                  />
                  <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 font-medium">
                    <span>✓ Use stealth addresses</span>
                    <span>✓ Hide balances</span>
                    <span>✓ Enable decoy mode</span>
                    <span>✓ Use shielded transactions</span>
                  </div>
                </CardBody>
              </Card>

              {/* Quick Privacy Controls */}
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 border-2 border-indigo-200 shadow-lg">
                <CardBody className="p-6">
                  <h3 className="font-bold mb-5 flex items-center gap-2 text-base" style={{ color: '#0d08e3' }}>
                    <Settings className="w-5 h-5" />
                    Privacy Controls
                  </h3>
                  <div className="space-y-5">
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                      <div className="flex items-center gap-3">
                        <EyeOff className="w-5 h-5" style={{ color: '#0d08e3' }} />
                        <span className="text-gray-800 font-medium">Hide Balances</span>
                      </div>
                      <Switch
                        isSelected={isBalanceHidden}
                        onValueChange={toggleBalanceVisibility}
                        size="md"
                        style={{ '--nextui-primary': '#0d08e3' }}
                      />
                    </div>
                    <div className="flex items-center justify-between p-3 bg-white rounded-xl">
                      <div className="flex items-center gap-3">
                        <Ghost className="w-5 h-5" style={{ color: '#0d08e3' }} />
                        <span className="text-gray-800 font-medium">Decoy Mode</span>
                      </div>
                      <Switch
                        isSelected={decoyMode}
                        onValueChange={toggleDecoyMode}
                        size="md"
                        style={{ '--nextui-primary': '#0d08e3' }}
                      />
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Quick Access to Privacy Features */}
              <Card className="bg-white border border-gray-200 shadow-sm">
                <CardBody className="p-6">
                  <h3 className="text-gray-900 font-bold mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Quick Access - Privacy Features
                  </h3>
                  <div className="space-y-3">
                    <Button
                      className="w-full justify-between h-auto p-4"
                      variant="flat"
                      onClick={() => navigate("/arcium/swap")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-6 h-6 text-purple-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">Arcium Private Swaps</p>
                          <p className="text-xs text-gray-500">Uses your Solana address</p>
                        </div>
                      </div>
                      <ArrowLeftRight className="w-5 h-5 text-gray-400" />
                    </Button>

                    <Button
                      className="w-full justify-between h-auto p-4"
                      variant="flat"
                      onClick={() => navigate("/zcash")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-yellow-100 flex items-center justify-center flex-shrink-0">
                          <Shield className="w-6 h-6 text-yellow-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">Zcash Privacy</p>
                          <p className="text-xs text-gray-500">Shielded transactions</p>
                        </div>
                      </div>
                      <ArrowLeftRight className="w-5 h-5 text-gray-400" />
                    </Button>

                    <Button
                      className="w-full justify-between h-auto p-4"
                      variant="flat"
                      onClick={() => navigate("/aztec")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                          <Lock className="w-6 h-6 text-blue-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">Aztec Network</p>
                          <p className="text-xs text-gray-500">Uses your Aztec address</p>
                        </div>
                      </div>
                      <ArrowLeftRight className="w-5 h-5 text-gray-400" />
                    </Button>

                    <Button
                      className="w-full justify-between h-auto p-4"
                      variant="flat"
                      onClick={() => navigate("/mina-protocol")}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                          <Sparkles className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div className="text-left">
                          <p className="font-semibold text-gray-900">Mina Protocol</p>
                          <p className="text-xs text-gray-500">Uses your Mina key</p>
                        </div>
                      </div>
                      <ArrowLeftRight className="w-5 h-5 text-gray-400" />
                    </Button>
                  </div>
                </CardBody>
              </Card>
            </div>

            {/* Asset Balances */}
            <Card className="bg-white border border-gray-200 shadow-sm mb-8">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                    <Wallet className="w-5 h-5" />
                    Private Assets
                    {decoyMode && (
                      <Chip size="sm" color="warning" variant="flat">
                        🎭 Decoy Mode
                      </Chip>
                    )}
                  </h3>
                  <Button
                    size="sm"
                    variant="light"
                    className="text-gray-600"
                    onClick={toggleBalanceVisibility}
                  >
                    {isBalanceHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {getVisibleBalances.map((asset) => (
                    <div
                      key={asset.id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer hover:border-primary/50 ${asset.hidden
                        ? "bg-gray-50 border-gray-100"
                        : "bg-white border-gray-200"
                        }`}
                      onClick={() => toggleAssetVisibility(asset.id)}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-gray-900 font-medium">{asset.symbol}</span>
                        {asset.shielded && (
                          <Shield className="w-3 h-3 text-emerald-500" />
                        )}
                      </div>
                      <p className="text-2xl font-bold text-gray-900">
                        {typeof asset.balance === "number"
                          ? asset.balance.toFixed(4)
                          : asset.balance}
                      </p>
                      <p className="text-gray-500 text-xs mt-1">
                        {asset.hidden ? "Hidden" : asset.name}
                      </p>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>

            {/* Stealth Addresses */}
            <Card className="bg-white border border-gray-200 shadow-sm mb-8">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-gray-900 font-bold text-lg flex items-center gap-2">
                    <Fingerprint className="w-5 h-5" />
                    Stealth Addresses
                    <Chip size="sm" color="primary" variant="flat">
                      {stealthAddresses.length}
                    </Chip>
                  </h3>
                  <Button
                    size="sm"
                    color="primary"
                    variant="flat"
                    onClick={generateNewStealthAddress}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Generate New
                  </Button>
                </div>

                {stealthAddresses.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Fingerprint className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No stealth addresses yet</p>
                    <p className="text-sm">Generate one to receive private payments</p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-64 overflow-y-auto">
                    {stealthAddresses.map((addr) => (
                      <div
                        key={addr.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <div>
                          <p className="text-gray-700 text-sm font-mono">
                            {addr.stealthPub.slice(0, 20)}...{addr.stealthPub.slice(-10)}
                          </p>
                          <p className="text-gray-500 text-xs">{addr.label}</p>
                        </div>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onClick={() => copyToClipboard(addr.stealthPub, "Address")}
                        >
                          <Copy className="w-4 h-4 text-gray-500" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>

            {/* Privacy Technology Section */}
            <Card className="bg-white border border-gray-200 shadow-sm">
              <CardBody className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-gray-900 font-bold">Wallet Information</h3>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="flat"
                      className="bg-gray-100 text-gray-700"
                      onClick={onBackupOpen}
                    >
                      <Download className="w-4 h-4 mr-1" />
                      Backup
                    </Button>
                    <Button
                      size="sm"
                      variant="flat"
                      color="danger"
                      onClick={disconnect}
                    >
                      Disconnect
                    </Button>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Public Address</p>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 font-mono text-sm truncate flex-1">
                        {publicAddress?.slice(0, 30)}...
                      </p>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => copyToClipboard(publicAddress, "Address")}
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-gray-500 text-xs mb-1">Viewing Key (Share for read-only)</p>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 font-mono text-sm truncate flex-1">
                        {viewingKey?.slice(0, 30)}...
                      </p>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => copyToClipboard(viewingKey, "Viewing Key")}
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Zcash Privacy Technology Section */}
                {zcashAddress && (
                  <div className="mt-4 p-4 bg-yellow-50 rounded-xl border border-yellow-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-yellow-600" />
                      <p className="text-yellow-800 text-xs font-medium">Zcash Privacy Technology</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <p className="text-gray-900 font-mono text-sm truncate flex-1">
                        {zcashAddress}
                      </p>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => window.open(`https://chain.so/address/ZECTEST/${zcashAddress}`, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 text-gray-500" />
                      </Button>
                      <Button
                        isIconOnly
                        size="sm"
                        variant="light"
                        onClick={() => copyToClipboard(zcashAddress, "Zcash Address")}
                      >
                        <Copy className="w-4 h-4 text-gray-500" />
                      </Button>
                    </div>
                    <p className="text-yellow-700 text-xs mt-2">
                      🛡️ Shielded transactions via Zcash - amounts hidden on-chain
                    </p>
                  </div>
                )}

                {/* Multi-Chain Addresses */}
                {(solanaPublicKey || aztecAddress || minaPublicKey) && (
                  <div className="mt-4 space-y-3">
                    <p className="text-gray-500 text-xs font-medium">Multi-Chain Addresses</p>

                    {solanaPublicKey && (
                      <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-purple-600">SOL</span>
                          </div>
                          <p className="text-purple-800 text-xs font-medium">Solana</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-mono text-xs truncate flex-1">
                            {solanaPublicKey}
                          </p>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => window.open(`https://solscan.io/account/${solanaPublicKey}?cluster=devnet`, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 text-gray-500" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => copyToClipboard(solanaPublicKey, "Solana Public Key")}
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {aztecAddress && (
                      <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-blue-600">AZ</span>
                          </div>
                          <p className="text-blue-800 text-xs font-medium">Aztec</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-mono text-xs truncate flex-1">
                            {aztecAddress}
                          </p>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => copyToClipboard(aztecAddress, "Aztec Address")}
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {minaPublicKey && (
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-emerald-600">MINA</span>
                          </div>
                          <p className="text-emerald-800 text-xs font-medium">Mina</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-mono text-xs truncate flex-1">
                            {minaPublicKey}
                          </p>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => copyToClipboard(minaPublicKey, "Mina Public Key")}
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                    )}

                    {ethereumAddress && (
                      <div className="p-3 bg-indigo-50 rounded-lg border border-indigo-200">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-6 h-6 rounded bg-indigo-100 flex items-center justify-center">
                            <span className="text-xs font-bold text-indigo-600">ETH</span>
                          </div>
                          <p className="text-indigo-800 text-xs font-medium">Ethereum</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-gray-900 font-mono text-xs truncate flex-1">
                            {ethereumAddress}
                          </p>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => window.open(`https://sepolia.etherscan.io/address/${ethereumAddress}`, '_blank')}
                          >
                            <ExternalLink className="w-3 h-3 text-gray-500" />
                          </Button>
                          <Button
                            isIconOnly
                            size="sm"
                            variant="light"
                            onClick={() => copyToClipboard(ethereumAddress, "Ethereum Address")}
                          >
                            <Copy className="w-3 h-3 text-gray-500" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Shielded Notes */}
                {shieldedNotes && shieldedNotes.length > 0 && (
                  <div className="mt-4">
                    <p className="text-gray-500 text-xs mb-2">Shielded Notes ({shieldedNotes.length})</p>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {shieldedNotes.map((note) => (
                        <div key={note.id} className="flex items-center justify-between p-2 bg-emerald-50 rounded-lg border border-emerald-100">
                          <div className="flex items-center gap-2">
                            <Shield className="w-3 h-3 text-emerald-600" />
                            <span className="text-emerald-800 text-xs font-mono">
                              {note.noteCommitment?.slice(0, 16)}...
                            </span>
                          </div>
                          <Chip size="sm" color="success" variant="flat">
                            {note.status}
                          </Chip>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardBody>
            </Card>
          </>
        )}
      </div>

      {/* Create Wallet Modal */}
      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="lg">
        <ModalContent className="bg-gradient-to-br from-white to-indigo-50">
          <ModalHeader className="flex flex-col gap-1 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#0d08e3' }}>
                <Wallet className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#0d08e3' }}>Create Self-Custody Wallet</h3>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="pt-2">
            <div className="space-y-5">
              <Card className="bg-indigo-50 border-2 border-indigo-200 shadow-sm">
                <CardBody className="p-4">
                  <div className="flex gap-3">
                    <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: '#0d08e3' }} />
                    <p className="text-gray-700 text-sm leading-relaxed">
                      Your wallet will be <span className="font-semibold">encrypted with a password</span>. Make sure to <span className="font-semibold">back up your recovery phrase</span> after creation!
                    </p>
                  </div>
                </CardBody>
              </Card>

              <div>
                <Input
                  type="password"
                  label="Password"
                  placeholder="Enter a strong password"
                  value={password}
                  onValueChange={setPassword}
                  variant="bordered"
                  classNames={{
                    label: "font-semibold text-gray-700",
                    input: "text-base",
                  }}
                  startContent={<Lock className="w-4 h-4 text-gray-400" />}
                />
                <div className="space-y-2 mt-3">
                  <Progress
                    value={passwordStrength}
                    color={passwordStrength >= 75 ? "success" : passwordStrength >= 50 ? "warning" : "danger"}
                    size="md"
                    className="h-2"
                  />
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium" style={{
                      color: passwordStrength >= 75 ? '#10b981' : passwordStrength >= 50 ? '#f59e0b' : '#ef4444'
                    }}>
                      {passwordStrength < 50 ? "🔴 Weak password" : passwordStrength < 75 ? "🟡 Medium password" : "🟢 Strong password"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {passwordStrength}% strength
                    </p>
                  </div>
                </div>
              </div>

              <Input
                type="password"
                label="Confirm Password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onValueChange={setConfirmPassword}
                variant="bordered"
                classNames={{
                  label: "font-semibold text-gray-700",
                  input: "text-base",
                }}
                startContent={<Lock className="w-4 h-4 text-gray-400" />}
              />
            </div>
          </ModalBody>
          <ModalFooter className="pt-4">
            <Button
              variant="bordered"
              className="border-2 font-semibold"
              style={{ borderColor: '#0d08e3', color: '#0d08e3' }}
              onClick={onCreateClose}
            >
              Cancel
            </Button>
            <Button
              className="font-bold text-white shadow-lg"
              style={{ backgroundColor: '#0d08e3' }}
              onClick={handleCreate}
              isDisabled={!password || !confirmPassword || passwordStrength < 50}
              onMouseEnter={(e) => !(!password || !confirmPassword || passwordStrength < 50) && (e.currentTarget.style.backgroundColor = '#0a06b8')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d08e3'}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Create Wallet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Import Wallet Modal */}
      <Modal isOpen={isImportOpen} onClose={onImportClose} size="lg">
        <ModalContent className="bg-gradient-to-br from-white to-indigo-50">
          <ModalHeader className="flex flex-col gap-1 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-md" style={{ backgroundColor: '#0d08e3' }}>
                <Upload className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold" style={{ color: '#0d08e3' }}>Import Existing Wallet</h3>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="pt-2">
            <div className="space-y-5">
              <Card className="bg-amber-50 border-2 border-amber-200 shadow-sm">
                <CardBody className="p-4">
                  <div className="flex gap-3">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <p className="text-amber-900 text-sm leading-relaxed">
                      <span className="font-semibold">Never share your recovery phrase</span> with anyone. Only enter it on trusted devices in private.
                    </p>
                  </div>
                </CardBody>
              </Card>

              <div>
                <Textarea
                  label="Recovery Phrase"
                  placeholder="Enter your 12 or 24 word recovery phrase (separated by spaces)"
                  value={mnemonic}
                  onValueChange={setMnemonic}
                  variant="bordered"
                  minRows={4}
                  classNames={{
                    label: "font-semibold text-gray-700 mb-1",
                    input: "font-mono text-sm",
                    inputWrapper: "bg-white",
                  }}
                  startContent={<Key className="w-4 h-4 text-gray-400 mb-auto mt-3" />}
                />
                {mnemonic && (
                  <p className="text-xs text-gray-600 mt-2 ml-1">
                    {mnemonic.trim().split(/\s+/).length} words entered
                  </p>
                )}
              </div>

              <div className="pt-2">
                <p className="text-sm font-semibold text-gray-700 mb-3">Set a password to encrypt your wallet:</p>
                <div className="space-y-4">
                  <Input
                    type="password"
                    label="New Password"
                    placeholder="Enter a password for this wallet"
                    value={password}
                    onValueChange={setPassword}
                    variant="bordered"
                    classNames={{
                      label: "font-semibold text-gray-700",
                      input: "text-base",
                    }}
                    startContent={<Lock className="w-4 h-4 text-gray-400" />}
                  />
                  <Input
                    type="password"
                    label="Confirm Password"
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onValueChange={setConfirmPassword}
                    variant="bordered"
                    classNames={{
                      label: "font-semibold text-gray-700",
                      input: "text-base",
                    }}
                    startContent={<Lock className="w-4 h-4 text-gray-400" />}
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter className="pt-4">
            <Button
              variant="bordered"
              className="border-2 font-semibold"
              style={{ borderColor: '#0d08e3', color: '#0d08e3' }}
              onClick={onImportClose}
            >
              Cancel
            </Button>
            <Button
              className="font-bold text-white shadow-lg"
              style={{ backgroundColor: '#0d08e3' }}
              onClick={handleImport}
              isDisabled={!mnemonic || !password || !confirmPassword}
              onMouseEnter={(e) => !(!mnemonic || !password || !confirmPassword) && (e.currentTarget.style.backgroundColor = '#0a06b8')}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d08e3'}
            >
              <Download className="w-4 h-4 mr-2" />
              Import Wallet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Backup Modal */}
      <Modal isOpen={isBackupOpen} onClose={onBackupClose} size="xl">
        <ModalContent className="bg-gradient-to-br from-white to-red-50">
          <ModalHeader className="flex flex-col gap-1 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500 flex items-center justify-center shadow-md">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-900">Backup Your Recovery Phrase</h3>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="pt-2 pb-4">
            <div className="space-y-4">
              {/* Compact Warning */}
              <Card className="bg-red-50 border-2 border-red-300 shadow-sm">
                <CardBody className="p-3">
                  <div className="flex gap-2">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-600" />
                    <p className="text-red-900 text-sm">
                      <span className="font-bold">⚠️ Write these words down</span> and store safely. Never share online. Anyone with this phrase can access your funds.
                    </p>
                  </div>
                </CardBody>
              </Card>

              {/* Compact Recovery Phrase Grid */}
              <div className="relative">
                <div
                  className={`p-4 bg-white rounded-xl font-mono grid grid-cols-4 gap-2 border-2 shadow-lg transition-all ${!showMnemonic ? "blur-md select-none border-gray-300" : "border-indigo-300"
                    }`}
                >
                  {(newMnemonic || wallet?.mnemonic || "").split(" ").map((word, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 p-2 bg-indigo-50 rounded-lg border border-indigo-200"
                    >
                      <span className="text-indigo-400 text-xs font-bold">{i + 1}.</span>
                      <span className="font-semibold text-gray-900 text-sm">{word}</span>
                    </div>
                  ))}
                </div>
                {!showMnemonic && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Button
                      className="font-bold text-white shadow-xl"
                      style={{ backgroundColor: '#0d08e3' }}
                      size="md"
                      onClick={() => setShowMnemonic(true)}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a06b8'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d08e3'}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      Reveal Phrase
                    </Button>
                  </div>
                )}
              </div>

              {/* Compact Action Buttons */}
              {showMnemonic && (
                <div className="flex gap-2">
                  <Button
                    variant="bordered"
                    className="flex-1 border-2 font-semibold"
                    style={{ borderColor: '#0d08e3', color: '#0d08e3' }}
                    onClick={() => copyToClipboard(newMnemonic || wallet?.mnemonic, "Recovery phrase")}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy
                  </Button>
                  <Button
                    variant="bordered"
                    className="flex-1 border-2 font-semibold border-gray-300 text-gray-700"
                    onClick={() => setShowMnemonic(false)}
                  >
                    <EyeOff className="w-4 h-4 mr-2" />
                    Hide
                  </Button>
                </div>
              )}
            </div>
          </ModalBody>
          <ModalFooter className="pt-2">
            <Button
              className="w-full font-bold text-white shadow-lg"
              style={{ backgroundColor: '#0d08e3' }}
              onClick={() => {
                setShowMnemonic(false);
                setNewMnemonic("");
                onBackupClose();
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#0a06b8'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#0d08e3'}
            >
              <Check className="w-5 h-5 mr-2" />
              I've Saved My Recovery Phrase
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Unlock Modal */}
      <Modal isOpen={isUnlockOpen} onClose={onUnlockClose} size="md">
        <ModalContent className="bg-gradient-to-br from-white to-amber-50">
          <ModalHeader className="flex flex-col gap-1 pb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center shadow-md">
                <Unlock className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-amber-900">Unlock Wallet</h3>
              </div>
            </div>
          </ModalHeader>
          <ModalBody className="pt-2">
            <div className="space-y-4">
              <Card className="bg-amber-50 border-2 border-amber-200 shadow-sm">
                <CardBody className="p-4">
                  <div className="flex gap-3">
                    <Key className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                    <p className="text-amber-900 text-sm leading-relaxed">
                      Enter your password to unlock and access your private assets.
                    </p>
                  </div>
                </CardBody>
              </Card>

              <Input
                type="password"
                label="Password"
                placeholder="Enter your wallet password"
                value={password}
                onValueChange={setPassword}
                variant="bordered"
                size="lg"
                classNames={{
                  label: "font-semibold text-gray-700",
                  input: "text-base",
                }}
                startContent={<Lock className="w-4 h-4 text-gray-400" />}
                onKeyPress={(e) => e.key === "Enter" && handleUnlock()}
                autoFocus
              />
            </div>
          </ModalBody>
          <ModalFooter className="pt-4">
            <Button
              variant="bordered"
              className="border-2 font-semibold border-amber-500 text-amber-700"
              onClick={onUnlockClose}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold shadow-lg"
              onClick={handleUnlock}
              isDisabled={!password}
            >
              <Unlock className="w-4 h-4 mr-2" />
              Unlock Wallet
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
}



