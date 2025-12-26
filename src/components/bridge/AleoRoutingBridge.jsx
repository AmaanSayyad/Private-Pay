/**
 * Aleo Routing Bridge Component
 * Provides UI for three-way bridge operations: Solana ↔ Aleo ↔ Zcash
 */

import React, { useState, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Select,
  SelectItem,
  Tabs,
  Tab,
  Progress,
  Chip,
  Divider,
  Textarea,
  Switch,
  Spinner,
} from '@nextui-org/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { toast } from 'react-hot-toast';
import { 
  createSolanaZcashAleoClient, 
  AleoBridgeUtils 
} from '../../lib/solanaZcashBridge/aleoExtension.js';
import { HeliusClient } from '../../lib/helius/index.js';

const ALEO_STRATEGIES = [
  { key: 'yield_farming', label: 'Yield Farming', description: 'Automated yield farming across DeFi protocols' },
  { key: 'liquidity_provision', label: 'Liquidity Provision', description: 'Provide liquidity to AMM pools' },
  { key: 'lending', label: 'Lending', description: 'Lend assets to earn interest' },
  { key: 'arbitrage', label: 'Arbitrage', description: 'Automated arbitrage trading' },
];

const FINAL_DESTINATIONS = [
  { key: 'aleo', label: 'Aleo Network', description: 'Keep funds on Aleo for privacy' },
  { key: 'zcash', label: 'Zcash Network', description: 'Bridge to Zcash for maximum privacy' },
];

export default function AleoRoutingBridge() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  
  // State
  const [bridgeClient, setBridgeClient] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('deposit');
  
  // Deposit state
  const [depositAmount, setDepositAmount] = useState('');
  const [selectedStrategy, setSelectedStrategy] = useState('yield_farming');
  const [finalDestination, setFinalDestination] = useState('aleo');
  const [zcashAddress, setZcashAddress] = useState('');
  const [customVaultId, setCustomVaultId] = useState('');
  const [useCustomVault, setUseCustomVault] = useState(false);
  
  // Withdrawal state
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [vaultPosition, setVaultPosition] = useState('');
  
  // Route tracking
  const [activeRoutes, setActiveRoutes] = useState([]);
  const [bridgeStats, setBridgeStats] = useState(null);

  // Initialize bridge client
  useEffect(() => {
    if (publicKey && connection) {
      const initializeClient = async () => {
        try {
          const heliusClient = new HeliusClient();
          const client = createSolanaZcashAleoClient(
            connection,
            { publicKey, sendTransaction },
            heliusClient
          );
          
          await client.initialize();
          setBridgeClient(client);
          
          // Load existing routes
          const routes = client.getAllAleoRoutes();
          setActiveRoutes(routes);
          
          // Load bridge stats
          const stats = await client.getExtendedBridgeStats();
          setBridgeStats(stats);
          
        } catch (error) {
          console.error('Failed to initialize bridge client:', error);
          toast.error('Failed to initialize bridge client');
        }
      };
      
      initializeClient();
    }
  }, [publicKey, connection, sendTransaction]);

  // Handle deposit to Aleo vault
  const handleDeposit = async () => {
    if (!bridgeClient || !depositAmount) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (finalDestination === 'zcash' && !zcashAddress) {
      toast.error('Zcash address required for Zcash destination');
      return;
    }

    setIsLoading(true);
    
    try {
      const amount = parseFloat(depositAmount);
      const vaultId = useCustomVault ? customVaultId : `vault_${selectedStrategy}`;
      const strategyId = selectedStrategy;
      
      // Initiate deposit
      const result = await bridgeClient.initiateAleoVaultDeposit({
        amount,
        aleoVaultId: vaultId,
        aleoStrategyId: strategyId,
        finalDestination,
        zcashAddress: finalDestination === 'zcash' ? zcashAddress : null,
      });
      
      toast.success(`Deposit initiated! Route ID: ${result.routeId}`);
      
      // Process Aleo side
      setTimeout(async () => {
        try {
          const aleoResult = await bridgeClient.processAleoVaultDeposit(result.routeId);
          toast.success('Aleo vault deposit processed!');
          
          // Update routes
          const routes = bridgeClient.getAllAleoRoutes();
          setActiveRoutes(routes);
          
        } catch (error) {
          console.error('Error processing Aleo deposit:', error);
          toast.error('Failed to process Aleo deposit');
        }
      }, 5000); // Wait 5 seconds for Solana confirmation
      
      // Reset form
      setDepositAmount('');
      setZcashAddress('');
      setCustomVaultId('');
      
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error(error.message || 'Deposit failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle withdrawal from Aleo vault
  const handleWithdrawal = async () => {
    if (!bridgeClient || !withdrawAmount || !vaultPosition) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsLoading(true);
    
    try {
      const amount = parseFloat(withdrawAmount);
      
      // Parse vault position (simplified - in production would be proper Aleo record)
      const position = JSON.parse(vaultPosition);
      
      const result = await bridgeClient.initiateAleoVaultWithdrawal({
        aleoVaultPosition: position,
        withdrawAmount: amount,
        targetChain: 'solana',
      });
      
      toast.success(`Withdrawal initiated! Route ID: ${result.routeId}`);
      
      // Update routes
      const routes = bridgeClient.getAllAleoRoutes();
      setActiveRoutes(routes);
      
      // Reset form
      setWithdrawAmount('');
      setVaultPosition('');
      
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error(error.message || 'Withdrawal failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Get route status color
  const getRouteStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'success';
      case 'failed': return 'danger';
      case 'processing_aleo': return 'warning';
      default: return 'primary';
    }
  };

  // Format amount for display
  const formatAmount = (amount) => {
    return (amount / 1e9).toFixed(4); // Convert lamports to SOL
  };

  if (!publicKey) {
    return (
      <Card className="max-w-md mx-auto">
        <CardBody className="text-center">
          <p className="text-gray-600">Please connect your wallet to use the Aleo bridge</p>
        </CardBody>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col space-y-2">
            <h2 className="text-2xl font-bold">Aleo Routing Bridge</h2>
            <p className="text-gray-600">
              Bridge assets between Solana, Aleo, and Zcash with privacy-preserving yield farming
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Bridge Stats */}
      {bridgeStats && (
        <Card>
          <CardBody>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{bridgeStats.aleo?.totalAleoRoutes || 0}</p>
                <p className="text-sm text-gray-600">Total Routes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-warning">{bridgeStats.aleo?.activeAleoRoutes || 0}</p>
                <p className="text-sm text-gray-600">Active Routes</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-success">{bridgeStats.aleo?.completedAleoRoutes || 0}</p>
                <p className="text-sm text-gray-600">Completed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-secondary">
                  {formatAmount(bridgeStats.aleo?.totalAleoVolume || 0)} SOL
                </p>
                <p className="text-sm text-gray-600">Total Volume</p>
              </div>
            </div>
          </CardBody>
        </Card>
      )}

      {/* Main Interface */}
      <Card>
        <CardBody>
          <Tabs 
            selectedKey={activeTab} 
            onSelectionChange={setActiveTab}
            className="w-full"
          >
            {/* Deposit Tab */}
            <Tab key="deposit" title="Deposit to Aleo Vault">
              <div className="space-y-4 mt-4">
                <Input
                  label="Amount (SOL)"
                  placeholder="0.0"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(e.target.value)}
                  type="number"
                  min="0.1"
                  max="1000"
                  step="0.1"
                />

                <Select
                  label="Strategy"
                  placeholder="Select a strategy"
                  selectedKeys={[selectedStrategy]}
                  onSelectionChange={(keys) => setSelectedStrategy(Array.from(keys)[0])}
                >
                  {ALEO_STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy.key} value={strategy.key}>
                      <div>
                        <p className="font-medium">{strategy.label}</p>
                        <p className="text-sm text-gray-600">{strategy.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </Select>

                <div className="flex items-center space-x-2">
                  <Switch
                    isSelected={useCustomVault}
                    onValueChange={setUseCustomVault}
                  />
                  <span className="text-sm">Use custom vault ID</span>
                </div>

                {useCustomVault && (
                  <Input
                    label="Custom Vault ID"
                    placeholder="Enter vault ID"
                    value={customVaultId}
                    onChange={(e) => setCustomVaultId(e.target.value)}
                  />
                )}

                <Select
                  label="Final Destination"
                  placeholder="Select final destination"
                  selectedKeys={[finalDestination]}
                  onSelectionChange={(keys) => setFinalDestination(Array.from(keys)[0])}
                >
                  {FINAL_DESTINATIONS.map((dest) => (
                    <SelectItem key={dest.key} value={dest.key}>
                      <div>
                        <p className="font-medium">{dest.label}</p>
                        <p className="text-sm text-gray-600">{dest.description}</p>
                      </div>
                    </SelectItem>
                  ))}
                </Select>

                {finalDestination === 'zcash' && (
                  <Input
                    label="Zcash Address"
                    placeholder="Enter Zcash shielded address"
                    value={zcashAddress}
                    onChange={(e) => setZcashAddress(e.target.value)}
                  />
                )}

                <Button
                  color="primary"
                  size="lg"
                  className="w-full"
                  onPress={handleDeposit}
                  isLoading={isLoading}
                  isDisabled={!depositAmount || !bridgeClient}
                >
                  {isLoading ? 'Processing...' : 'Deposit to Aleo Vault'}
                </Button>
              </div>
            </Tab>

            {/* Withdrawal Tab */}
            <Tab key="withdraw" title="Withdraw from Aleo Vault">
              <div className="space-y-4 mt-4">
                <Input
                  label="Withdrawal Amount (SOL)"
                  placeholder="0.0"
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  type="number"
                  min="0.1"
                  step="0.1"
                />

                <Textarea
                  label="Vault Position (JSON)"
                  placeholder="Paste your Aleo vault position record here"
                  value={vaultPosition}
                  onChange={(e) => setVaultPosition(e.target.value)}
                  minRows={4}
                />

                <Button
                  color="secondary"
                  size="lg"
                  className="w-full"
                  onPress={handleWithdrawal}
                  isLoading={isLoading}
                  isDisabled={!withdrawAmount || !vaultPosition || !bridgeClient}
                >
                  {isLoading ? 'Processing...' : 'Withdraw from Aleo Vault'}
                </Button>
              </div>
            </Tab>

            {/* Routes Tab */}
            <Tab key="routes" title="Active Routes">
              <div className="space-y-4 mt-4">
                {activeRoutes.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-600">No active routes</p>
                  </div>
                ) : (
                  activeRoutes.map((route, index) => (
                    <Card key={route.routeId || index} className="border">
                      <CardBody>
                        <div className="flex justify-between items-start">
                          <div className="space-y-2">
                            <div className="flex items-center space-x-2">
                              <Chip 
                                color={getRouteStatusColor(route.status)}
                                size="sm"
                              >
                                {route.status}
                              </Chip>
                              <span className="text-sm text-gray-600">
                                {route.type || 'deposit'}
                              </span>
                            </div>
                            
                            <p className="font-medium">
                              {formatAmount(route.amount || 0)} SOL
                            </p>
                            
                            {route.aleoVaultId && (
                              <p className="text-sm text-gray-600">
                                Vault: {route.aleoVaultId}
                              </p>
                            )}
                            
                            {route.aleoStrategyId && (
                              <p className="text-sm text-gray-600">
                                Strategy: {route.aleoStrategyId}
                              </p>
                            )}
                            
                            {route.finalDestination && (
                              <p className="text-sm text-gray-600">
                                Destination: {route.finalDestination}
                              </p>
                            )}
                          </div>
                          
                          <div className="text-right text-sm text-gray-600">
                            <p>Route ID: {route.routeId?.slice(0, 8)}...</p>
                            <p>{new Date(route.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        
                        {route.status === 'processing_aleo' && (
                          <div className="mt-4">
                            <Progress 
                              size="sm" 
                              isIndeterminate 
                              color="warning"
                              className="w-full"
                            />
                            <p className="text-sm text-gray-600 mt-1">
                              Processing on Aleo network...
                            </p>
                          </div>
                        )}
                      </CardBody>
                    </Card>
                  ))
                )}
              </div>
            </Tab>
          </Tabs>
        </CardBody>
      </Card>

      {/* Info Card */}
      <Card>
        <CardBody>
          <h3 className="font-semibold mb-2">How Aleo Routing Works</h3>
          <div className="space-y-2 text-sm text-gray-600">
            <p>1. <strong>Deposit:</strong> Lock SOL/tokens on Solana bridge</p>
            <p>2. <strong>Route to Aleo:</strong> Assets are bridged to Aleo private vaults</p>
            <p>3. <strong>Yield Generation:</strong> Earn returns through private DeFi strategies</p>
            <p>4. <strong>Optional Zcash Bridge:</strong> Further bridge to Zcash for maximum privacy</p>
            <p>5. <strong>Withdraw:</strong> Return assets to Solana with accumulated yield</p>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}