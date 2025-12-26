/**
 * Aleo-Ethereum Bridge Integration Library
 * Handles cross-chain asset transfers between Aleo and Ethereum
 */

import { ethers } from 'ethers';
import { AleoKeyProvider } from '@provablehq/sdk';
import AleoEthereumBridgeABI from '../abi/AleoEthereumBridge.json';

// Bridge contract addresses (to be configured per network)
const BRIDGE_CONTRACTS = {
  ethereum: {
    mainnet: '0x0000000000000000000000000000000000000000', // To be deployed
    sepolia: '0x0000000000000000000000000000000000000000', // To be deployed
  },
  arbitrum: {
    mainnet: '0x0000000000000000000000000000000000000000', // To be deployed
    sepolia: '0x0000000000000000000000000000000000000000', // To be deployed
  },
  polygon: {
    mainnet: '0x0000000000000000000000000000000000000000', // To be deployed
    mumbai: '0x0000000000000000000000000000000000000000', // To be deployed
  }
};

// Aleo network configurations
const ALEO_NETWORKS = {
  testnet: {
    rpc: 'https://api.explorer.aleo.org/v1',
    chainId: 'aleo-testnet',
  },
  mainnet: {
    rpc: 'https://api.explorer.aleo.org/v1',
    chainId: 'aleo-mainnet',
  }
};

/**
 * Aleo-Ethereum Bridge Client
 */
export class AleoEthereumBridge {
  constructor(ethereumProvider, aleoKeyProvider, network = 'testnet') {
    this.ethereumProvider = ethereumProvider;
    this.aleoKeyProvider = aleoKeyProvider;
    this.network = network;
    this.aleoConfig = ALEO_NETWORKS[network];
  }

  /**
   * Get bridge contract instance
   */
  getBridgeContract(chainName, networkName) {
    const contractAddress = BRIDGE_CONTRACTS[chainName]?.[networkName];
    if (!contractAddress || contractAddress === '0x0000000000000000000000000000000000000000') {
      throw new Error(`Bridge contract not deployed on ${chainName} ${networkName}`);
    }

    const signer = this.ethereumProvider.getSigner();
    return new ethers.Contract(contractAddress, AleoEthereumBridgeABI, signer);
  }

  /**
   * Lock Ethereum assets for Aleo vault deposit
   */
  async lockForAleoVault({
    token,
    amount,
    vaultId,
    strategyId,
    chainName = 'ethereum',
    networkName = 'sepolia',
    gasLimit = 500000
  }) {
    try {
      const bridge = this.getBridgeContract(chainName, networkName);
      const signer = this.ethereumProvider.getSigner();
      
      // Convert amount to proper units
      const tokenContract = new ethers.Contract(token, [
        'function decimals() view returns (uint8)',
        'function approve(address spender, uint256 amount) returns (bool)',
        'function allowance(address owner, address spender) view returns (uint256)'
      ], signer);
      
      const decimals = await tokenContract.decimals();
      const amountWei = ethers.parseUnits(amount.toString(), decimals);
      
      // Check and approve token if needed
      const allowance = await tokenContract.allowance(
        await signer.getAddress(),
        await bridge.getAddress()
      );
      
      if (allowance < amountWei) {
        console.log('Approving token spend...');
        const approveTx = await tokenContract.approve(
          await bridge.getAddress(),
          amountWei
        );
        await approveTx.wait();
        console.log('Token approved');
      }
      
      // Estimate gas for bridge transaction
      const gasEstimate = await bridge.lockForAleoVault.estimateGas(
        token,
        amountWei,
        this.aleoConfig.chainId,
        vaultId,
        strategyId,
        { value: ethers.parseEther('0.01') } // Gas payment for Axelar
      );
      
      // Execute bridge transaction
      const tx = await bridge.lockForAleoVault(
        token,
        amountWei,
        this.aleoConfig.chainId,
        vaultId,
        strategyId,
        {
          value: ethers.parseEther('0.01'), // Gas payment for Axelar
          gasLimit: gasEstimate * 120n / 100n // 20% buffer
        }
      );
      
      console.log('Bridge transaction submitted:', tx.hash);
      const receipt = await tx.wait();
      
      // Parse events to get bridge request ID
      const lockEvent = receipt.logs.find(log => {
        try {
          const parsed = bridge.interface.parseLog(log);
          return parsed.name === 'AssetLocked';
        } catch {
          return false;
        }
      });
      
      if (lockEvent) {
        const parsed = bridge.interface.parseLog(lockEvent);
        return {
          success: true,
          txHash: tx.hash,
          requestId: parsed.args.requestId,
          amount: parsed.args.amount,
          vaultId: parsed.args.aleoVaultId,
          strategyId: parsed.args.aleoStrategyId
        };
      }
      
      return {
        success: true,
        txHash: tx.hash,
        receipt
      };
      
    } catch (error) {
      console.error('Error locking assets for Aleo vault:', error);
      throw error;
    }
  }

  /**
   * Generate Aleo vault deposit transaction
   */
  async generateAleoVaultDeposit({
    bridgedAsset,
    vaultId,
    strategyId
  }) {
    try {
      // This would integrate with Aleo SDK to create the deposit transaction
      // For now, return the structure that would be used
      
      const depositData = {
        program: 'cross_chain_vault.aleo',
        function: 'deposit_bridged',
        inputs: [
          {
            bridged_asset: {
              owner: await this.aleoKeyProvider.getAddress(),
              source_chain: '1field', // Ethereum chain ID
              source_token: `${bridgedAsset.token}field`,
              amount: `${bridgedAsset.amount}u64`,
              bridge_proof: `${bridgedAsset.bridgeProof}field`,
              bridge_nonce: `${bridgedAsset.bridgeNonce}field`
            }
          },
          `${vaultId}field`,
          `${strategyId}field`
        ]
      };
      
      console.log('Generated Aleo vault deposit:', depositData);
      return depositData;
      
    } catch (error) {
      console.error('Error generating Aleo vault deposit:', error);
      throw error;
    }
  }

  /**
   * Withdraw from Aleo vault to Ethereum
   */
  async withdrawFromAleoVault({
    vaultPosition,
    withdrawAmount,
    targetChain = 'ethereum',
    targetAddress
  }) {
    try {
      // This would integrate with Aleo SDK to create the withdrawal transaction
      const withdrawalData = {
        program: 'cross_chain_vault.aleo',
        function: 'withdraw_to_chain',
        inputs: [
          {
            position: vaultPosition
          },
          `${withdrawAmount}u64`,
          `${this.getChainId(targetChain)}field`,
          `${targetAddress}field`
        ]
      };
      
      console.log('Generated Aleo vault withdrawal:', withdrawalData);
      return withdrawalData;
      
    } catch (error) {
      console.error('Error withdrawing from Aleo vault:', error);
      throw error;
    }
  }

  /**
   * Generate reserve proof for bridge solvency
   */
  async generateReserveProof(token, chainName = 'ethereum', networkName = 'sepolia') {
    try {
      const bridge = this.getBridgeContract(chainName, networkName);
      const proof = await bridge.generateReserveProof(token);
      
      return {
        token: proof.token,
        totalReserves: proof.totalReserves.toString(),
        totalLocked: proof.totalLocked.toString(),
        totalUnlocked: proof.totalUnlocked.toString(),
        proofHash: proof.proofHash,
        timestamp: proof.timestamp.toString()
      };
      
    } catch (error) {
      console.error('Error generating reserve proof:', error);
      throw error;
    }
  }

  /**
   * Verify reserve proof
   */
  async verifyReserveProof(proof, chainName = 'ethereum', networkName = 'sepolia') {
    try {
      const bridge = this.getBridgeContract(chainName, networkName);
      const isValid = await bridge.verifyReserveProof(proof);
      
      return isValid;
      
    } catch (error) {
      console.error('Error verifying reserve proof:', error);
      throw error;
    }
  }

  /**
   * Get bridge request status
   */
  async getBridgeRequestStatus(requestId, chainName = 'ethereum', networkName = 'sepolia') {
    try {
      const bridge = this.getBridgeContract(chainName, networkName);
      const request = await bridge.getBridgeRequest(requestId);
      const isProcessed = await bridge.isRequestProcessed(requestId);
      
      return {
        user: request.user,
        token: request.token,
        amount: request.amount.toString(),
        targetChain: request.targetChain,
        aleoVaultId: request.aleoVaultId,
        aleoStrategyId: request.aleoStrategyId,
        timestamp: request.timestamp.toString(),
        status: request.status,
        isProcessed
      };
      
    } catch (error) {
      console.error('Error getting bridge request status:', error);
      throw error;
    }
  }

  /**
   * Get token reserves
   */
  async getTokenReserves(token, chainName = 'ethereum', networkName = 'sepolia') {
    try {
      const bridge = this.getBridgeContract(chainName, networkName);
      const reserves = await bridge.getTokenReserves(token);
      const totalLocked = await bridge.getTotalLocked(token);
      const totalUnlocked = await bridge.getTotalUnlocked(token);
      
      return {
        reserves: reserves.toString(),
        totalLocked: totalLocked.toString(),
        totalUnlocked: totalUnlocked.toString()
      };
      
    } catch (error) {
      console.error('Error getting token reserves:', error);
      throw error;
    }
  }

  /**
   * Monitor bridge events
   */
  async monitorBridgeEvents(callback, chainName = 'ethereum', networkName = 'sepolia') {
    try {
      const bridge = this.getBridgeContract(chainName, networkName);
      
      // Listen for AssetLocked events
      bridge.on('AssetLocked', (user, token, amount, targetChain, requestId, vaultId, strategyId, event) => {
        callback({
          type: 'AssetLocked',
          user,
          token,
          amount: amount.toString(),
          targetChain,
          requestId,
          vaultId,
          strategyId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        });
      });
      
      // Listen for AssetUnlocked events
      bridge.on('AssetUnlocked', (user, token, amount, requestId, event) => {
        callback({
          type: 'AssetUnlocked',
          user,
          token,
          amount: amount.toString(),
          requestId,
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        });
      });
      
      // Listen for ReserveProofGenerated events
      bridge.on('ReserveProofGenerated', (token, totalReserves, proofHash, timestamp, event) => {
        callback({
          type: 'ReserveProofGenerated',
          token,
          totalReserves: totalReserves.toString(),
          proofHash,
          timestamp: timestamp.toString(),
          blockNumber: event.blockNumber,
          transactionHash: event.transactionHash
        });
      });
      
      console.log('Bridge event monitoring started');
      
    } catch (error) {
      console.error('Error monitoring bridge events:', error);
      throw error;
    }
  }

  /**
   * Get chain ID for target chain
   */
  getChainId(chainName) {
    const chainIds = {
      ethereum: 1,
      arbitrum: 42161,
      polygon: 137,
      base: 8453,
      optimism: 10
    };
    
    return chainIds[chainName] || 1;
  }

  /**
   * Format amount for display
   */
  formatAmount(amount, decimals = 18) {
    return ethers.formatUnits(amount, decimals);
  }

  /**
   * Parse amount from user input
   */
  parseAmount(amount, decimals = 18) {
    return ethers.parseUnits(amount.toString(), decimals);
  }
}

/**
 * Create bridge client instance
 */
export function createAleoEthereumBridge(ethereumProvider, aleoKeyProvider, network = 'testnet') {
  return new AleoEthereumBridge(ethereumProvider, aleoKeyProvider, network);
}

/**
 * Bridge configuration utilities
 */
export const BridgeConfig = {
  BRIDGE_CONTRACTS,
  ALEO_NETWORKS,
  
  getSupportedChains() {
    return Object.keys(BRIDGE_CONTRACTS);
  },
  
  getSupportedNetworks(chainName) {
    return Object.keys(BRIDGE_CONTRACTS[chainName] || {});
  },
  
  getBridgeAddress(chainName, networkName) {
    return BRIDGE_CONTRACTS[chainName]?.[networkName];
  }
};

export default AleoEthereumBridge;