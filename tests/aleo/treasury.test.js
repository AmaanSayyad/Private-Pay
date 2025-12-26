import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TreasuryManager, treasuryUtils } from '../../src/lib/aleo/treasury.js';

// Mock the utils module
vi.mock('../../src/lib/aleo/utils.js', () => ({
  executeProgram: vi.fn(),
  validateInputs: vi.fn(),
  generateProof: vi.fn()
}));

describe('TreasuryManager', () => {
  let treasuryManager;
  let mockAccount;

  beforeEach(() => {
    mockAccount = {
      address: 'aleo1test123',
      privateKey: 'APrivateKey1test123'
    };
    treasuryManager = new TreasuryManager(mockAccount);
  });

  describe('createMultiSigWallet', () => {
    it('should create a multi-sig wallet with valid parameters', async () => {
      const { validateInputs, executeProgram } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });
      executeProgram.mockResolvedValue({
        outputs: [{ wallet_id: '1field', balance: '1000000u64' }],
        transactionId: 'tx123'
      });

      const params = {
        walletId: '1field',
        requiredSignatures: 2,
        totalSigners: 3,
        policyHash: '123456789field',
        initialBalance: 1000000n
      };

      const result = await treasuryManager.createMultiSigWallet(params);

      expect(result.success).toBe(true);
      expect(result.wallet).toBeDefined();
      expect(result.transactionId).toBe('tx123');
      expect(executeProgram).toHaveBeenCalledWith(
        mockAccount,
        'treasury_management.aleo',
        'create_multisig_wallet',
        ['1fieldfield', '2u8', '3u8', '123456789fieldfield', '1000000u64']
      );
    });

    it('should reject invalid parameters', async () => {
      const { validateInputs } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ 
        valid: false, 
        errors: ['Required signatures cannot exceed total signers'] 
      });

      const params = {
        walletId: '1field',
        requiredSignatures: 5, // More than total signers
        totalSigners: 3,
        policyHash: '123456789field',
        initialBalance: 1000000n
      };

      await expect(treasuryManager.createMultiSigWallet(params))
        .rejects.toThrow('Invalid inputs: Required signatures cannot exceed total signers');
    });
  });

  describe('allocateFunds', () => {
    it('should allocate funds with valid parameters', async () => {
      const { validateInputs, executeProgram } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });
      executeProgram.mockResolvedValue({
        outputs: [
          { wallet_id: '1field', balance: '900000u64' },
          { allocation_id: '2field', allocated_amount: '100000u64' }
        ],
        transactionId: 'tx456'
      });

      const mockWallet = { wallet_id: '1field', balance: '1000000u64' };
      const params = {
        wallet: mockWallet,
        allocationId: '2field',
        strategyHash: '555666777field',
        amount: 100000n,
        targetYield: 5000n,
        riskLevel: 3,
        viewKey: '111222333field'
      };

      const result = await treasuryManager.allocateFunds(params);

      expect(result.success).toBe(true);
      expect(result.wallet).toBeDefined();
      expect(result.allocation).toBeDefined();
      expect(result.transactionId).toBe('tx456');
    });

    it('should reject invalid risk level', async () => {
      const { validateInputs } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ 
        valid: false, 
        errors: ['Risk level must be between 1 and 5'] 
      });

      const mockWallet = { wallet_id: '1field', balance: '1000000u64' };
      const params = {
        wallet: mockWallet,
        allocationId: '2field',
        strategyHash: '555666777field',
        amount: 100000n,
        targetYield: 5000n,
        riskLevel: 10, // Invalid risk level
        viewKey: '111222333field'
      };

      await expect(treasuryManager.allocateFunds(params))
        .rejects.toThrow('Invalid inputs: Risk level must be between 1 and 5');
    });
  });

  describe('createDAOTreasury', () => {
    it('should create DAO treasury with valid parameters', async () => {
      const { validateInputs, executeProgram } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });
      executeProgram.mockResolvedValue({
        outputs: [{ dao_id: '4field', total_balance: '5000000u64' }],
        transactionId: 'tx789'
      });

      const params = {
        daoId: '4field',
        initialBalance: 5000000n,
        governanceTokenSupply: 1000000n,
        proposalThreshold: 100000n,
        viewKey: '777888999field'
      };

      const result = await treasuryManager.createDAOTreasury(params);

      expect(result.success).toBe(true);
      expect(result.treasury).toBeDefined();
      expect(result.transactionId).toBe('tx789');
    });

    it('should reject proposal threshold exceeding token supply', async () => {
      const { validateInputs } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });

      const params = {
        daoId: '4field',
        initialBalance: 5000000n,
        governanceTokenSupply: 1000000n,
        proposalThreshold: 2000000n, // Exceeds token supply
        viewKey: '777888999field'
      };

      await expect(treasuryManager.createDAOTreasury(params))
        .rejects.toThrow('Proposal threshold cannot exceed governance token supply');
    });
  });
});

describe('treasuryUtils', () => {
  describe('calculateVotingPower', () => {
    it('should calculate voting power correctly', () => {
      const tokenBalance = 50000n;
      const totalSupply = 1000000n;
      const votingPower = treasuryUtils.calculateVotingPower(tokenBalance, totalSupply);
      
      expect(votingPower).toBe(5.0); // 5%
    });

    it('should return 0 for zero total supply', () => {
      const tokenBalance = 50000n;
      const totalSupply = 0n;
      const votingPower = treasuryUtils.calculateVotingPower(tokenBalance, totalSupply);
      
      expect(votingPower).toBe(0);
    });
  });

  describe('canExecuteProposal', () => {
    it('should return true for executable proposal', () => {
      const proposal = {
        is_executed: false,
        votes_for: 150000n,
        votes_against: 50000n,
        execution_deadline: 2000
      };
      const threshold = 100000n;
      const currentBlock = 1500;

      const canExecute = treasuryUtils.canExecuteProposal(proposal, threshold, currentBlock);
      expect(canExecute).toBe(true);
    });

    it('should return false for already executed proposal', () => {
      const proposal = {
        is_executed: true,
        votes_for: 150000n,
        votes_against: 50000n,
        execution_deadline: 2000
      };
      const threshold = 100000n;
      const currentBlock = 1500;

      const canExecute = treasuryUtils.canExecuteProposal(proposal, threshold, currentBlock);
      expect(canExecute).toBe(false);
    });

    it('should return false for expired proposal', () => {
      const proposal = {
        is_executed: false,
        votes_for: 150000n,
        votes_against: 50000n,
        execution_deadline: 1000
      };
      const threshold = 100000n;
      const currentBlock = 1500; // Past deadline

      const canExecute = treasuryUtils.canExecuteProposal(proposal, threshold, currentBlock);
      expect(canExecute).toBe(false);
    });
  });

  describe('formatBalance', () => {
    it('should format balance correctly', () => {
      const balance = 1234567890n;
      const formatted = treasuryUtils.formatBalance(balance, 6);
      
      expect(formatted).toBe('1234.567890');
    });

    it('should handle zero balance', () => {
      const balance = 0n;
      const formatted = treasuryUtils.formatBalance(balance, 6);
      
      expect(formatted).toBe('0.000000');
    });
  });
});