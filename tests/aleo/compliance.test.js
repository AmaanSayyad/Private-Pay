import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ComplianceManager, complianceUtils } from '../../src/lib/aleo/compliance.js';

// Mock the utils module
vi.mock('../../src/lib/aleo/utils.js', () => ({
  executeProgram: vi.fn(),
  validateInputs: vi.fn(),
  generateProof: vi.fn()
}));

describe('ComplianceManager', () => {
  let complianceManager;
  let mockAccount;

  beforeEach(() => {
    mockAccount = {
      address: 'aleo1test123',
      privateKey: 'APrivateKey1test123'
    };
    complianceManager = new ComplianceManager(mockAccount);
  });

  describe('createKYCVerification', () => {
    it('should create KYC verification with valid parameters', async () => {
      const { validateInputs, executeProgram } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });
      executeProgram.mockResolvedValue({
        outputs: [{ verification_id: '1field', is_valid: true }],
        transactionId: 'tx123'
      });

      const params = {
        verificationId: '1field',
        identityHash: '123456789field',
        verificationLevel: 2,
        expiryTimestamp: 2000,
        issuerSignature: '987654321field'
      };

      const result = await complianceManager.createKYCVerification(params);

      expect(result.success).toBe(true);
      expect(result.kycVerification).toBeDefined();
      expect(result.transactionId).toBe('tx123');
      expect(executeProgram).toHaveBeenCalledWith(
        mockAccount,
        'compliance_module.aleo',
        'create_kyc_verification',
        ['1fieldfield', '123456789fieldfield', '2u8', '2000u32', '987654321fieldfield']
      );
    });

    it('should reject invalid verification level', async () => {
      const { validateInputs } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ 
        valid: false, 
        errors: ['Verification level must be between 1 and 3'] 
      });

      const params = {
        verificationId: '1field',
        identityHash: '123456789field',
        verificationLevel: 5, // Invalid level
        expiryTimestamp: 2000,
        issuerSignature: '987654321field'
      };

      await expect(complianceManager.createKYCVerification(params))
        .rejects.toThrow('Invalid inputs: Verification level must be between 1 and 3');
    });
  });

  describe('createJurisdictionCheck', () => {
    it('should create jurisdiction check with valid parameters', async () => {
      const { validateInputs, executeProgram } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });
      executeProgram.mockResolvedValue({
        outputs: [{ check_id: '2field', is_compliant: true }],
        transactionId: 'tx456'
      });

      const params = {
        checkId: '2field',
        jurisdictionHash: '555666777field',
        complianceLevel: 3,
        verificationProof: '111222333field'
      };

      const result = await complianceManager.createJurisdictionCheck(params);

      expect(result.success).toBe(true);
      expect(result.jurisdictionCheck).toBeDefined();
      expect(result.transactionId).toBe('tx456');
    });
  });

  describe('flagSuspiciousActivity', () => {
    it('should flag suspicious activity with valid parameters', async () => {
      const { validateInputs, executeProgram } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });
      executeProgram.mockResolvedValue({
        outputs: [{ activity_id: '5field', privacy_preserved: true }],
        transactionId: 'tx789'
      });

      const params = {
        activityId: '5field',
        transactionHash: '147258369field',
        riskScore: 7,
        patternHash: '369258147field'
      };

      const result = await complianceManager.flagSuspiciousActivity(params);

      expect(result.success).toBe(true);
      expect(result.suspiciousActivity).toBeDefined();
      expect(result.transactionId).toBe('tx789');
    });

    it('should reject invalid risk score', async () => {
      const { validateInputs } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ 
        valid: false, 
        errors: ['Risk score must be between 1 and 10'] 
      });

      const params = {
        activityId: '5field',
        transactionHash: '147258369field',
        riskScore: 15, // Invalid risk score
        patternHash: '369258147field'
      };

      await expect(complianceManager.flagSuspiciousActivity(params))
        .rejects.toThrow('Invalid inputs: Risk score must be between 1 and 10');
    });
  });

  describe('generateComplianceReport', () => {
    it('should generate compliance report with valid parameters', async () => {
      const { validateInputs, executeProgram } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });
      executeProgram.mockResolvedValue({
        outputs: [{ report_id: '6field', compliance_score: 95 }],
        transactionId: 'tx101112'
      });

      const params = {
        reportId: '6field',
        reportingPeriod: 202412,
        totalTransactions: 10000n,
        flaggedTransactions: 25n,
        complianceScore: 95,
        reportHash: '753951864field',
        auditorAccessKey: '864159753field'
      };

      const result = await complianceManager.generateComplianceReport(params);

      expect(result.success).toBe(true);
      expect(result.complianceReport).toBeDefined();
      expect(result.transactionId).toBe('tx101112');
    });

    it('should reject flagged transactions exceeding total', async () => {
      const { validateInputs } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });

      const params = {
        reportId: '6field',
        reportingPeriod: 202412,
        totalTransactions: 100n,
        flaggedTransactions: 150n, // Exceeds total
        complianceScore: 95,
        reportHash: '753951864field',
        auditorAccessKey: '864159753field'
      };

      await expect(complianceManager.generateComplianceReport(params))
        .rejects.toThrow('Flagged transactions cannot exceed total transactions');
    });
  });

  describe('batchVerifyCompliance', () => {
    it('should batch verify compliance with valid parameters', async () => {
      const { validateInputs, executeProgram } = await import('../../src/lib/aleo/utils.js');
      
      validateInputs.mockReturnValue({ valid: true, errors: [] });
      executeProgram.mockResolvedValue({
        outputs: [true],
        transactionId: 'tx131415'
      });

      const mockKYCRecord = { verification_id: '1field', is_valid: true };
      const mockJurisdictionCheck = { check_id: '2field', is_compliant: true };
      
      const params = {
        kycRecord: mockKYCRecord,
        jurisdictionCheck: mockJurisdictionCheck,
        requiredKYCLevel: 2,
        requiredComplianceLevel: 2
      };

      const result = await complianceManager.batchVerifyCompliance(params);

      expect(result.success).toBe(true);
      expect(result.isCompliant).toBe(true);
      expect(result.transactionId).toBe('tx131415');
    });
  });
});

describe('complianceUtils', () => {
  describe('getComplianceLevelDescription', () => {
    it('should return correct descriptions for valid levels', () => {
      expect(complianceUtils.getComplianceLevelDescription(1)).toBe('Restricted Access');
      expect(complianceUtils.getComplianceLevelDescription(2)).toBe('Limited Access');
      expect(complianceUtils.getComplianceLevelDescription(3)).toBe('Full Access');
    });

    it('should return unknown for invalid levels', () => {
      expect(complianceUtils.getComplianceLevelDescription(5)).toBe('Unknown Level');
    });
  });

  describe('getKYCLevelDescription', () => {
    it('should return correct descriptions for valid levels', () => {
      expect(complianceUtils.getKYCLevelDescription(1)).toBe('Basic Verification');
      expect(complianceUtils.getKYCLevelDescription(2)).toBe('Enhanced Verification');
      expect(complianceUtils.getKYCLevelDescription(3)).toBe('Institutional Verification');
    });

    it('should return unknown for invalid levels', () => {
      expect(complianceUtils.getKYCLevelDescription(4)).toBe('Unknown Level');
    });
  });

  describe('calculateComplianceScore', () => {
    it('should calculate compliance score correctly', () => {
      const totalTransactions = 10000n;
      const flaggedTransactions = 25n;
      const score = complianceUtils.calculateComplianceScore(totalTransactions, flaggedTransactions);
      
      expect(score).toBe(98); // 100 - (0.25% * 10) = 97.5, rounded to 98
    });

    it('should return 100 for zero transactions', () => {
      const totalTransactions = 0n;
      const flaggedTransactions = 0n;
      const score = complianceUtils.calculateComplianceScore(totalTransactions, flaggedTransactions);
      
      expect(score).toBe(100);
    });

    it('should not go below 1', () => {
      const totalTransactions = 100n;
      const flaggedTransactions = 50n; // 50% flagged
      const score = complianceUtils.calculateComplianceScore(totalTransactions, flaggedTransactions);
      
      expect(score).toBeGreaterThanOrEqual(1);
    });
  });

  describe('getRiskLevelDescription', () => {
    it('should return correct risk level descriptions', () => {
      expect(complianceUtils.getRiskLevelDescription(2)).toBe('Low Risk');
      expect(complianceUtils.getRiskLevelDescription(5)).toBe('Medium Risk');
      expect(complianceUtils.getRiskLevelDescription(7)).toBe('High Risk');
      expect(complianceUtils.getRiskLevelDescription(10)).toBe('Critical Risk');
    });
  });

  describe('formatReportingPeriod', () => {
    it('should format reporting period correctly', () => {
      expect(complianceUtils.formatReportingPeriod(202412)).toBe('December 2024');
      expect(complianceUtils.formatReportingPeriod(202401)).toBe('January 2024');
      expect(complianceUtils.formatReportingPeriod(202506)).toBe('June 2025');
    });
  });

  describe('isKYCExpired', () => {
    it('should return true for expired KYC', () => {
      const kycRecord = { expiry_timestamp: 1000 };
      const currentTimestamp = 1500;
      
      expect(complianceUtils.isKYCExpired(kycRecord, currentTimestamp)).toBe(true);
    });

    it('should return false for valid KYC', () => {
      const kycRecord = { expiry_timestamp: 2000 };
      const currentTimestamp = 1500;
      
      expect(complianceUtils.isKYCExpired(kycRecord, currentTimestamp)).toBe(false);
    });
  });
});