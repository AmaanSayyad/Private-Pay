import axios from 'axios';
import { Transaction, ComputeBudgetProgram } from '@solana/web3.js';
import bs58 from 'bs58';

// Official SPL Token Program ID (https://solscan.io/account/TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA)
export const SPL_TOKEN_PROGRAM_ID = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';

const HELIUS_API_VERSION = 'v0';
const HELIUS_RPC_VERSION = 'v0';

export class HeliusClient {
  constructor(apiKey, network = 'mainnet') {
    if (!apiKey) {
      throw new Error('Helius API key is required');
    }
    this.apiKey = apiKey;
    this.network = network;
    this.baseRpcUrl = this.getRpcUrl();
    this.baseApiUrl = this.getApiUrl();
  }

  getRpcUrl() {
    const networkUrls = {
      'mainnet': `https://mainnet.helius-rpc.com/?api-key=${this.apiKey}`,
      'devnet': `https://devnet.helius-rpc.com/?api-key=${this.apiKey}`,
    };
    return networkUrls[this.network] || networkUrls['devnet'];
  }

  getApiUrl() {
    const networkUrls = {
      'mainnet': `https://api-mainnet.helius-rpc.com/${HELIUS_API_VERSION}`,
      'devnet': `https://api-devnet.helius-rpc.com/${HELIUS_API_VERSION}`,
    };
    return networkUrls[this.network] || networkUrls['devnet'];
  }

  async rpcCall(method, params = []) {
    const response = await axios.post(this.baseRpcUrl, {
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.data.error) {
      throw new Error(`Helius RPC Error: ${response.data.error.message}`);
    }

    return response.data.result;
  }

  normalizePriorityOptions(options = {}) {
    // Allow passing an array of account keys directly for convenience
    if (Array.isArray(options)) {
      return {
        accountKeys: options,
        priorityLevel: 'Medium',
      };
    }

    return options;
  }

  async getPriorityFeeEstimate(options = {}) {
    const normalized = this.normalizePriorityOptions(options);
    const {
      transaction,
      accountKeys,
      priorityLevel = 'Medium',
      includeAllPriorityFeeLevels = false,
      lookbackSlots = 150,
    } = normalized;

    // Build the params object according to Helius API spec
    const params = {
      options: {
        priorityLevel,
        includeAllPriorityFeeLevels,
        lookbackSlots,
        recommended: true,
      },
    };

    // Helius requires either transaction OR accountKeys, not both
    if (transaction) {
      params.transaction = transaction;
    } else if (accountKeys && accountKeys.length > 0) {
      params.accountKeys = accountKeys;
    } else {
      // Fallback: return default estimates if no keys provided
      return {
        priorityFeeEstimate: 5000,
        priorityFeeLevels: {
          low: 1000,
          medium: 5000,
          high: 10000,
          veryHigh: 50000,
          unsafeMax: 100000,
        },
      };
    }

    // Skip API call on devnet to avoid 400 errors (API not supported on devnet)
    if (this.network === 'devnet') {
      return {
        priorityFeeEstimate: 5000,
        priorityFeeLevels: {
          low: 1000,
          medium: 5000,
          high: 10000,
          veryHigh: 50000,
          unsafeMax: 100000,
        },
      };
    }

    try {
      return await this.rpcCall('getPriorityFeeEstimate', [params]);
    } catch (error) {
      // getPriorityFeeEstimate may not be available on devnet, silently use defaults
      return {
        priorityFeeEstimate: 5000,
        priorityFeeLevels: {
          low: 1000,
          medium: 5000,
          high: 10000,
          veryHigh: 50000,
          unsafeMax: 100000,
        },
      };
    }
  }

  async addPriorityFee(transaction, options = {}) {
    const { priorityLevel = 'Medium', accountKeys = [] } = this.normalizePriorityOptions(options);

    let priorityFee = 5000; // Default fallback

    try {
      const serializedTx = bs58.encode(transaction.serialize({ requireAllSignatures: false }));

      const estimate = await this.getPriorityFeeEstimate({
        transaction: serializedTx,
        priorityLevel,
        accountKeys,
      });

      priorityFee = estimate?.priorityFeeEstimate || estimate?.priorityFeeLevels?.medium || 5000;
    } catch (error) {
      // Silently use default priority fee
    }

    const priorityFeeIx = ComputeBudgetProgram.setComputeUnitPrice({
      microLamports: priorityFee,
    });

    transaction.instructions.unshift(priorityFeeIx);

    return { transaction, priorityFee };
  }

  async parseTransactions(signatures) {
    const url = `${this.baseApiUrl}/transactions/?api-key=${this.apiKey}`;

    const response = await axios.post(url, {
      transactions: signatures,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  }

  async getTransactionHistory(address, options = {}) {
    const { limit = 100, before, until, type } = options;

    let url = `${this.baseApiUrl}/addresses/${address}/transactions?api-key=${this.apiKey}`;

    if (limit) url += `&limit=${limit}`;
    if (before) url += `&before=${before}`;
    if (until) url += `&until=${until}`;
    if (type) url += `&type=${type}`;

    const response = await axios.get(url);
    return response.data;
  }

  async getAllTransactionHistory(address, options = {}) {
    const { maxTransactions = 1000 } = options;
    const allTransactions = [];
    let lastSignature = null;

    while (allTransactions.length < maxTransactions) {
      const queryOptions = { ...options };
      if (lastSignature) {
        queryOptions.before = lastSignature;
      }

      const transactions = await this.getTransactionHistory(address, queryOptions);

      if (!transactions || transactions.length === 0) {
        break;
      }

      allTransactions.push(...transactions);
      lastSignature = transactions[transactions.length - 1].signature;
    }

    return allTransactions.slice(0, maxTransactions);
  }

  async createWebhook(webhookConfig) {
    const url = `https://api.helius.xyz/v0/webhooks?api-key=${this.apiKey}`;

    const response = await axios.post(url, webhookConfig, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  }

  async createBridgeWebhook(webhookUrl, addresses, transactionTypes = ['TRANSFER']) {
    return this.createWebhook({
      webhookURL: webhookUrl,
      accountAddresses: addresses,
      transactionTypes,
      webhookType: 'enhanced',
    });
  }

  async createRawWebhook(webhookUrl, addresses) {
    return this.createWebhook({
      webhookURL: webhookUrl,
      accountAddresses: addresses,
      webhookType: 'raw',
    });
  }

  async listWebhooks() {
    const url = `https://api.helius.xyz/v0/webhooks?api-key=${this.apiKey}`;
    const response = await axios.get(url);
    return response.data;
  }

  async deleteWebhook(webhookId) {
    const url = `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${this.apiKey}`;
    await axios.delete(url);
  }

  async updateWebhookAddresses(webhookId, addresses) {
    const url = `https://api.helius.xyz/v0/webhooks/${webhookId}?api-key=${this.apiKey}`;

    const response = await axios.put(url, {
      accountAddresses: addresses,
    }, {
      headers: { 'Content-Type': 'application/json' },
    });

    return response.data;
  }

  async getAccountInfo(address) {
    return this.rpcCall('getAccountInfo', [address, { encoding: 'jsonParsed' }]);
  }

  async getMultipleAccountsInfo(addresses) {
    return this.rpcCall('getMultipleAccounts', [addresses, { encoding: 'jsonParsed' }]);
  }

  async getTokenBalances(address) {
    return this.rpcCall('getTokenAccountsByOwner', [
      address,
      { programId: SPL_TOKEN_PROGRAM_ID },
      { encoding: 'jsonParsed' },
    ]);
  }

  async getRecentBlockhashWithPriorityFee(priorityLevel = 'Medium') {
    const blockhashResult = await this.rpcCall('getLatestBlockhash', [{ commitment: 'finalized' }]);

    let priorityFee = 5000; // Default
    try {
      const priorityFeeResult = await this.getPriorityFeeEstimate({ priorityLevel });
      priorityFee = priorityFeeResult?.priorityFeeEstimate || priorityFeeResult?.priorityFeeLevels?.medium || 5000;
    } catch (error) {
      console.warn('Failed to get priority fee estimate:', error.message);
    }

    return {
      blockhash: blockhashResult.value.blockhash,
      lastValidBlockHeight: blockhashResult.value.lastValidBlockHeight,
      priorityFee,
    };
  }

  async sendTransactionWithRetry(transaction, options = {}) {
    const {
      maxRetries = 3,
      priorityLevel = 'Medium',
      skipPreflight = false,
      commitment = 'confirmed',
    } = options;

    const { transaction: txWithFee } = await this.addPriorityFee(transaction, priorityLevel);

    let lastError;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const serializedTx = txWithFee.serialize();
        const signature = await this.rpcCall('sendTransaction', [
          bs58.encode(serializedTx),
          { skipPreflight, preflightCommitment: commitment },
        ]);
        return signature;
      } catch (error) {
        lastError = error;
        if (i < maxRetries - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      }
    }

    throw lastError;
  }

  async getSignatureStatuses(signatures) {
    return this.rpcCall('getSignatureStatuses', [signatures, { searchTransactionHistory: true }]);
  }

  async confirmTransaction(signature, timeout = 30000, commitment = 'confirmed') {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
      const result = await this.getSignatureStatuses([signature]);

      if (result?.value?.[0]) {
        const status = result.value[0];
        if (status.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(status.err)}`);
        }
        if (status.confirmationStatus === commitment ||
          status.confirmationStatus === 'finalized') {
          return { signature, status };
        }
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error(`Transaction confirmation timeout: ${signature}`);
  }
}

export function createHeliusClient(apiKey, network = 'devnet') {
  return new HeliusClient(apiKey, network);
}

export function getHeliusClientFromEnv() {
  const apiKey = import.meta.env?.VITE_HELIUS_API_KEY || process.env?.HELIUS_API_KEY;
  const network = import.meta.env?.VITE_SOLANA_NETWORK || process.env?.SOLANA_NETWORK || 'devnet';

  if (!apiKey) {
    throw new Error('HELIUS_API_KEY environment variable is required');
  }

  return createHeliusClient(apiKey, network);
}
