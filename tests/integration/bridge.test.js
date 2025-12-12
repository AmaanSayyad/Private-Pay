/**
 * Bridge Integration Tests
 * 
 * Tests end-to-end bridge flow
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { createBridgeManager } from '../../src/lib/aztec/bridge.js';
import { createZcashWallet, createConfiguredRPCClient } from '../../src/lib/zcash/index.js';
import { createConfiguredPXEClient } from '../../src/lib/aztec/index.js';

describe('Bridge Integration Tests', () => {
  let bridgeManager;
  let zcashWallet;
  let aztecClient;

  beforeAll(async () => {
    // Initialize clients
    const zcashRPC = createConfiguredRPCClient('testnet');
    zcashWallet = createZcashWallet(zcashRPC);
    await zcashWallet.initialize();

    aztecClient = createConfiguredPXEClient('testnet');
    await aztecClient.connect();

    bridgeManager = createBridgeManager(aztecClient, zcashWallet);
  });

  it('should create deposit request', async () => {
    const mockZcashNote = {
      cm: '0x1234...',
      nf: '0x5678...',
      value: 0.1,
      memo: 'ticket_test123',
      txid: '0xabcd...',
    };

    const deposit = await bridgeManager.createDeposit(
      mockZcashNote.txid,
      mockZcashNote,
      0.1
    );

    expect(deposit).toBeDefined();
    expect(deposit.ticketId).toBeDefined();
    expect(deposit.amount).toBe(0.1);
    expect(deposit.status).toBe('pending');
  });

  it('should create withdrawal request', async () => {
    const mockEncryptedNote = {
      commitment: '0x1234...',
      nullifier: '0x5678...',
      value: '0.1',
      owner: '0xabcd...',
      assetId: 0,
    };

    const withdrawal = await bridgeManager.createWithdrawal(
      0.1,
      'ztest...',
      mockEncryptedNote
    );

    expect(withdrawal).toBeDefined();
    expect(withdrawal.aztecTxId).toBeDefined();
    expect(withdrawal.bzecAmount).toBe(0.1);
    expect(withdrawal.status).toBe('pending');
  });
});



