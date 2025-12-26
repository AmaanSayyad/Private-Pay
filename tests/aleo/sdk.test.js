// Aleo SDK Wrapper Tests
// Comprehensive tests for the Aleo SDK wrapper library

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AleoSDK, aleoSDK, ProofProgress, RecordManager, ViewKeyManager } from '../../src/lib/aleo/sdk.js';
import { ALEO_PRIVATE_KEY, TX_CONFIG } from '../../src/lib/aleo/constants.js';

describe('ProofProgress', () => {
  let proofProgress;

  beforeEach(() => {
    proofProgress = new ProofProgress();
  });

  it('should initialize with default values', () => {
    expect(proofProgress.currentStep).toBe('');
    expect(proofProgress.progress).toBe(0);
    expect(proofProgress.totalSteps).toBe(0);
  });

  it('should add and remove listeners', () => {
    const callback = vi.fn();
    const unsubscribe = proofProgress.addListener(callback);
    
    expect(proofProgress.listeners.size).toBe(1);
    
    unsubscribe();
    expect(proofProgress.listeners.size).toBe(0);
  });

  it('should notify listeners on progress update', () => {
    const callback = vi.fn();
    proofProgress.addListener(callback);
    
    proofProgress.updateProgress('Test step', 2, 5);
    
    expect(callback).toHaveBeenCalledWith({
      step: 'Test step',
      progress: 2,
      totalSteps: 5,
      percentage: 40
    });
  });

  it('should reset progress', () => {
    proofProgress.updateProgress('Test', 3, 5);
    proofProgress.reset();
    
    expect(proofProgress.currentStep).toBe('');
    expect(proofProgress.progress).toBe(0);
    expect(proofProgress.totalSteps).toBe(0);
  });
});

describe('RecordManager', () => {
  let recordManager;

  beforeEach(() => {
    recordManager = new RecordManager();
  });

  it('should store and retrieve records', () => {
    const record = { type: 'Order', data: { amount: 1000 } };
    recordManager.storeRecord('test-id', record);
    
    const retrieved = recordManager.getRecord('test-id');
    expect(retrieved).toEqual(record);
  });

  it('should store encrypted records separately', () => {
    const record = { type: 'Order', data: { amount: 1000 } };
    recordManager.storeRecord('encrypted-id', record, true);
    
    expect(recordManager.records.size).toBe(0);
    expect(recordManager.encryptedRecords.size).toBe(1);
  });

  it('should get records by type', () => {
    const order1 = { type: 'Order', data: { amount: 1000 } };
    const order2 = { type: 'Order', data: { amount: 2000 } };
    const position = { type: 'Position', data: { shares: 100 } };
    
    recordManager.storeRecord('order1', order1);
    recordManager.storeRecord('order2', order2);
    recordManager.storeRecord('position1', position);
    
    const orders = recordManager.getRecordsByType('Order');
    expect(orders).toHaveLength(2);
    expect(orders.every(r => r.type === 'Order')).toBe(true);
  });

  it('should delete records', () => {
    const record = { type: 'Order', data: { amount: 1000 } };
    recordManager.storeRecord('test-id', record);
    
    expect(recordManager.getRecord('test-id')).toEqual(record);
    
    recordManager.deleteRecord('test-id');
    expect(recordManager.getRecord('test-id')).toBeNull();
  });

  it('should clear all records', () => {
    recordManager.storeRecord('id1', { type: 'Order' });
    recordManager.storeRecord('id2', { type: 'Position' }, true);
    
    expect(recordManager.getRecordCount()).toBe(2);
    
    recordManager.clearRecords();
    expect(recordManager.getRecordCount()).toBe(0);
  });
});

describe('ViewKeyManager', () => {
  let viewKeyManager;

  beforeEach(() => {
    viewKeyManager = new ViewKeyManager();
  });

  it('should generate view keys', () => {
    const recordId = 'test-record';
    const privateKey = 'test-private-key';
    
    const viewKey = viewKeyManager.generateViewKey(recordId, privateKey);
    
    expect(viewKey).toMatch(/^vk_test-record_\d+_[a-z0-9]+$/);
    expect(viewKeyManager.getViewKey(recordId)).toBe(viewKey);
  });

  it('should authorize and check parties', () => {
    const recordId = 'test-record';
    const partyAddress = 'aleo1test...';
    
    viewKeyManager.generateViewKey(recordId, 'private-key');
    viewKeyManager.authorizeParty(recordId, partyAddress, ['view', 'audit']);
    
    expect(viewKeyManager.isAuthorized(recordId, partyAddress)).toBe(true);
    expect(viewKeyManager.isAuthorized(recordId, 'aleo1other...')).toBe(false);
  });

  it('should revoke access', () => {
    const recordId = 'test-record';
    const partyAddress = 'aleo1test...';
    
    viewKeyManager.generateViewKey(recordId, 'private-key');
    viewKeyManager.authorizeParty(recordId, partyAddress);
    
    expect(viewKeyManager.isAuthorized(recordId, partyAddress)).toBe(true);
    
    viewKeyManager.revokeAccess(recordId, partyAddress);
    expect(viewKeyManager.isAuthorized(recordId, partyAddress)).toBe(false);
  });

  it('should throw error for non-existent view key', () => {
    expect(() => {
      viewKeyManager.authorizeParty('non-existent', 'aleo1test...');
    }).toThrow('View key not found for record');
  });
});

describe('AleoSDK', () => {
  let sdk;

  beforeEach(() => {
    sdk = new AleoSDK();
  });

  afterEach(async () => {
    if (sdk.isConnected) {
      await sdk.disconnect();
    }
  });

  it('should initialize with default values', () => {
    expect(sdk.isConnected).toBe(false);
    expect(sdk.account).toBeNull();
    expect(sdk.programManager).toBeNull();
  });

  it('should connect to network', async () => {
    const result = await sdk.connect();
    
    expect(result.success).toBe(true);
    expect(result.address).toMatch(/^aleo1[a-z0-9]{59}$/);
    expect(result.balance).toBeGreaterThan(0);
    expect(sdk.isConnected).toBe(true);
  });

  it('should disconnect from network', async () => {
    await sdk.connect();
    expect(sdk.isConnected).toBe(true);
    
    await sdk.disconnect();
    expect(sdk.isConnected).toBe(false);
    expect(sdk.account).toBeNull();
    expect(sdk.programManager).toBeNull();
  });

  it('should notify connection listeners', async () => {
    const callback = vi.fn();
    sdk.onConnectionChange(callback);
    
    await sdk.connect();
    expect(callback).toHaveBeenCalledWith(true);
    
    await sdk.disconnect();
    expect(callback).toHaveBeenCalledWith(false);
  });

  it('should execute programs', async () => {
    await sdk.connect();
    
    const result = await sdk.executeProgram(
      'dark_pool.aleo',
      'place_order',
      ['credits.aleo', 'usdc.aleo', '1000000u64', '950000u64', '1000u32']
    );
    
    expect(result.success).toBe(true);
    expect(result.transactionId).toMatch(/^tx_\d+_[a-z0-9]+$/);
    expect(result.outputs).toBeDefined();
    expect(result.confirmation).toBeDefined();
  });

  it('should validate inputs', async () => {
    await sdk.connect();
    
    await expect(
      sdk.executeProgram('test.aleo', 'test_function', null)
    ).rejects.toThrow('Inputs must be an array');
    
    await expect(
      sdk.executeProgram('test.aleo', 'test_function', [null])
    ).rejects.toThrow('Input at index 0 is null or undefined');
  });

  it('should throw error when not connected', async () => {
    await expect(
      sdk.executeProgram('test.aleo', 'test_function', [])
    ).rejects.toThrow('Wallet not connected');
    
    await expect(
      sdk.getAccountInfo()
    ).rejects.toThrow('Wallet not connected');
  });

  it('should get account information', async () => {
    await sdk.connect();
    
    const accountInfo = await sdk.getAccountInfo();
    
    expect(accountInfo.address).toMatch(/^aleo1[a-z0-9]{59}$/);
    expect(accountInfo.balance).toBeGreaterThan(0);
    expect(accountInfo.recordCount).toBe(0);
  });

  it('should create view keys', async () => {
    await sdk.connect();
    
    const viewKey = sdk.createViewKey('test-record');
    
    expect(viewKey).toMatch(/^vk_test-record_\d+_[a-z0-9]+$/);
  });

  it('should authorize parties', async () => {
    await sdk.connect();
    
    const recordId = 'test-record';
    const partyAddress = 'aleo1test...';
    
    sdk.createViewKey(recordId);
    sdk.authorizeParty(recordId, partyAddress, ['view']);
    
    expect(sdk.viewKeyManager.isAuthorized(recordId, partyAddress)).toBe(true);
  });

  it('should get records by type', async () => {
    await sdk.connect();
    
    // Execute a program to create records
    await sdk.executeProgram(
      'dark_pool.aleo',
      'place_order',
      ['credits.aleo', 'usdc.aleo', '1000000u64', '950000u64', '1000u32']
    );
    
    const records = sdk.getRecordsByType('Order');
    expect(records).toHaveLength(1);
  });

  it('should get execution history', async () => {
    await sdk.connect();
    
    await sdk.executeProgram('test.aleo', 'test_function', []);
    
    const history = await sdk.getExecutionHistory();
    expect(history).toHaveLength(1);
    expect(history[0].program).toBe('test.aleo');
    expect(history[0].function).toBe('test_function');
  });

  it('should track proof progress', async () => {
    await sdk.connect();
    
    const progressCallback = vi.fn();
    sdk.proofProgress.addListener(progressCallback);
    
    await sdk.executeProgram('test.aleo', 'test_function', []);
    
    expect(progressCallback).toHaveBeenCalled();
    expect(progressCallback).toHaveBeenCalledWith(
      expect.objectContaining({
        step: expect.any(String),
        progress: expect.any(Number),
        totalSteps: expect.any(Number),
        percentage: expect.any(Number)
      })
    );
  });
});

describe('Default SDK Instance', () => {
  afterEach(async () => {
    if (aleoSDK.isConnected) {
      await aleoSDK.disconnect();
    }
  });

  it('should provide a default SDK instance', () => {
    expect(aleoSDK).toBeInstanceOf(AleoSDK);
    expect(aleoSDK.isConnected).toBe(false);
  });

  it('should work with default instance', async () => {
    const result = await aleoSDK.connect();
    
    expect(result.success).toBe(true);
    expect(aleoSDK.isConnected).toBe(true);
  });
});