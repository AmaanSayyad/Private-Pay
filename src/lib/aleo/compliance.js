/**
 * Compliance Module Library
 * Provides JavaScript interface for compliance_module.aleo program
 * Updated to use Transaction Wrapper for real blockchain transactions
 */

import { ALEO_PROGRAMS } from './constants.js';
import { TransactionWrapper } from './transactionWrapper.js';

export class ComplianceManager {
  constructor(walletAdapter = null) {
    this.wallet = walletAdapter;
    this.programName = ALEO_PROGRAMS.COMPLIANCE_MODULE;
    this.txWrapper = new TransactionWrapper(walletAdapter);
  }

  /**
   * Set wallet adapter
   */
  setWallet(walletAdapter) {
    this.wallet = walletAdapter;
    this.txWrapper.setWallet(walletAdapter);
  }

  /**
   * Create KYC verification with ZK proofs
   * Creates a real transaction on Aleo network
   */
  async createKYCVerification({
    verificationId,
    identityHash,
    verificationLevel,
    expiryTimestamp,
    issuerSignature
  }) {
    if (verificationLevel < 1 || verificationLevel > 3) {
      throw new Error('Invalid verification level: must be 1-3');
    }

    const result = await this.txWrapper.executeOperation('compliance_create_kyc', {
      verificationId,
      identityHash,
      verificationLevel,
      expiryTimestamp,
      issuerSignature
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      kycVerification: {
        verificationId: result.txHash,
        owner: this.wallet?.address || 'aleo1user',
        identityHash,
        verificationLevel,
        expiryTimestamp,
        issuerSignature,
        isValid: true,
        createdAt: result.timestamp
      }
    };
  }

  /**
   * Verify KYC status without revealing identity
   * Creates a real transaction on Aleo network
   */
  async verifyKYCStatus({ kycRecord, requiredLevel }) {
    if (requiredLevel < 1 || requiredLevel > 3) {
      throw new Error('Invalid required level: must be 1-3');
    }

    const result = await this.txWrapper.executeOperation('compliance_verify_kyc', {
      verificationId: kycRecord.verificationId,
      requiredLevel
    });

    const isValid = kycRecord.verificationLevel >= requiredLevel && kycRecord.isValid;

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      isValid,
      verifiedAt: result.timestamp
    };
  }

  /**
   * Create jurisdiction check with privacy-preserving location verification
   * Creates a real transaction on Aleo network
   */
  async createJurisdictionCheck({
    checkId,
    jurisdictionHash,
    complianceLevel,
    verificationProof
  }) {
    if (complianceLevel < 1 || complianceLevel > 3) {
      throw new Error('Invalid compliance level: must be 1-3');
    }

    const result = await this.txWrapper.executeOperation('compliance_create_jurisdiction', {
      checkId,
      jurisdictionHash,
      complianceLevel,
      verificationProof
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      jurisdictionCheck: {
        checkId: result.txHash,
        owner: this.wallet?.address || 'aleo1user',
        jurisdictionHash,
        complianceLevel,
        verificationProof,
        isValid: true,
        createdAt: result.timestamp
      }
    };
  }

  /**
   * Verify jurisdiction compliance without revealing location
   * Creates a real transaction on Aleo network
   */
  async verifyJurisdictionCompliance({ jurisdictionCheck, requiredComplianceLevel }) {
    if (requiredComplianceLevel < 1 || requiredComplianceLevel > 3) {
      throw new Error('Invalid required compliance level: must be 1-3');
    }

    const result = await this.txWrapper.executeOperation('compliance_verify_jurisdiction', {
      checkId: jurisdictionCheck.checkId,
      requiredComplianceLevel
    });

    const isCompliant = jurisdictionCheck.complianceLevel >= requiredComplianceLevel && jurisdictionCheck.isValid;

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      isCompliant,
      verifiedAt: result.timestamp
    };
  }

  /**
   * Authorize auditor for selective disclosure
   * Creates a real transaction on Aleo network
   */
  async authorizeAuditor({
    auditorId,
    authorizationLevel,
    scopeHash,
    expiryTimestamp,
    publicKey
  }) {
    if (authorizationLevel < 1 || authorizationLevel > 3) {
      throw new Error('Invalid authorization level: must be 1-3');
    }

    const result = await this.txWrapper.executeOperation('compliance_authorize_auditor', {
      auditorId,
      authorizationLevel,
      scopeHash,
      expiryTimestamp,
      publicKey
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      auditorAuthorization: {
        auditorId: result.txHash,
        owner: this.wallet?.address || 'aleo1user',
        authorizationLevel,
        scopeHash,
        expiryTimestamp,
        publicKey,
        isActive: true,
        authorizedAt: result.timestamp
      }
    };
  }

  /**
   * Create selective disclosure for authorized auditor
   * Creates a real transaction on Aleo network
   */
  async createSelectiveDisclosure({
    auditorAuth,
    disclosureId,
    dataHash,
    disclosureScope,
    encryptionKey
  }) {
    const result = await this.txWrapper.executeOperation('compliance_create_disclosure', {
      auditorId: auditorAuth.auditorId,
      disclosureId,
      dataHash,
      disclosureScope,
      encryptionKey
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      disclosure: {
        disclosureId: result.txHash,
        auditorId: auditorAuth.auditorId,
        dataHash,
        disclosureScope,
        encryptionKey,
        createdAt: result.timestamp
      }
    };
  }

  /**
   * Flag suspicious activity with privacy protection
   * Creates a real transaction on Aleo network
   */
  async flagSuspiciousActivity({
    activityId,
    transactionHash,
    riskScore,
    patternHash
  }) {
    if (riskScore < 1 || riskScore > 10) {
      throw new Error('Invalid risk score: must be 1-10');
    }

    const result = await this.txWrapper.executeOperation('compliance_flag_activity', {
      activityId,
      transactionHash,
      riskScore,
      patternHash
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      suspiciousActivity: {
        activityId: result.txHash,
        transactionHash,
        riskScore,
        patternHash,
        flaggedAt: result.timestamp
      }
    };
  }

  /**
   * Generate compliance report
   * Creates a real transaction on Aleo network
   */
  async generateComplianceReport({
    reportId,
    reportingPeriod,
    totalTransactions,
    flaggedTransactions,
    complianceScore,
    reportHash,
    auditorAccessKey
  }) {
    if (flaggedTransactions > totalTransactions) {
      throw new Error('Flagged transactions cannot exceed total transactions');
    }
    if (complianceScore < 1 || complianceScore > 100) {
      throw new Error('Invalid compliance score: must be 1-100');
    }

    const result = await this.txWrapper.executeOperation('compliance_generate_report', {
      reportId,
      reportingPeriod,
      totalTransactions,
      flaggedTransactions,
      complianceScore,
      reportHash,
      auditorAccessKey
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      complianceReport: {
        reportId: result.txHash,
        owner: this.wallet?.address || 'aleo1user',
        reportingPeriod,
        totalTransactions,
        flaggedTransactions,
        complianceScore,
        reportHash,
        auditorAccessKey,
        generatedAt: result.timestamp
      }
    };
  }

  /**
   * Batch verify compliance (KYC + Jurisdiction)
   * Creates a real transaction on Aleo network
   */
  async batchVerifyCompliance({
    kycRecord,
    jurisdictionCheck,
    requiredKYCLevel,
    requiredComplianceLevel
  }) {
    const result = await this.txWrapper.executeOperation('compliance_batch_verify', {
      kycId: kycRecord.verificationId,
      jurisdictionId: jurisdictionCheck.checkId,
      requiredKYCLevel,
      requiredComplianceLevel
    });

    const kycValid = kycRecord.verificationLevel >= requiredKYCLevel && kycRecord.isValid;
    const jurisdictionValid = jurisdictionCheck.complianceLevel >= requiredComplianceLevel && jurisdictionCheck.isValid;
    const isCompliant = kycValid && jurisdictionValid;

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      isCompliant,
      kycValid,
      jurisdictionValid,
      verifiedAt: result.timestamp
    };
  }

  /**
   * Revoke auditor authorization
   * Creates a real transaction on Aleo network
   */
  async revokeAuditorAuthorization({ auditorAuth }) {
    const result = await this.txWrapper.executeOperation('compliance_revoke_auditor', {
      auditorId: auditorAuth.auditorId
    });

    return {
      success: true,
      txHash: result.txHash,
      explorerLink: result.explorerLink,
      blockHeight: result.blockHeight,
      revokedAuth: {
        ...auditorAuth,
        isActive: false,
        revokedAt: result.timestamp
      }
    };
  }

  /**
   * Get KYC verifications from transaction history
   */
  async getKYCVerifications() {
    return this.txWrapper.getHistory({ operationType: 'compliance_create_kyc' })
      .map(tx => ({
        verificationId: tx.txHash,
        txHash: tx.txHash,
        explorerLink: tx.explorerLink,
        ...tx.params,
        isValid: true,
        createdAt: tx.timestamp
      }));
  }

  /**
   * Get compliance reports from transaction history
   */
  async getComplianceReports() {
    return this.txWrapper.getHistory({ operationType: 'compliance_generate_report' })
      .map(tx => ({
        reportId: tx.txHash,
        txHash: tx.txHash,
        explorerLink: tx.explorerLink,
        ...tx.params,
        generatedAt: tx.timestamp
      }));
  }

  /**
   * Get transaction history for compliance operations
   */
  getTransactionHistory(limit = 50) {
    return this.txWrapper.getHistory({ limit })
      .filter(tx => tx.operationType?.startsWith('compliance_'));
  }
}

// Export utility functions for compliance management
export const complianceUtils = {
  /**
   * Get compliance level description
   */
  getComplianceLevelDescription(level) {
    const descriptions = {
      1: 'Restricted Access',
      2: 'Limited Access',
      3: 'Full Access'
    };
    return descriptions[level] || 'Unknown Level';
  },

  /**
   * Get KYC level description
   */
  getKYCLevelDescription(level) {
    const descriptions = {
      1: 'Basic Verification',
      2: 'Enhanced Verification',
      3: 'Institutional Verification'
    };
    return descriptions[level] || 'Unknown Level';
  },

  /**
   * Calculate compliance score based on flagged transactions
   */
  calculateComplianceScore(totalTransactions, flaggedTransactions) {
    if (totalTransactions === 0n || totalTransactions === 0) return 100;
    const flaggedRatio = Number(BigInt(flaggedTransactions) * 10000n / BigInt(totalTransactions)) / 100;
    return Math.max(1, Math.min(100, Math.round(100 - flaggedRatio * 10)));
  },

  /**
   * Check if KYC is expired
   */
  isKYCExpired(kycRecord, currentTimestamp) {
    return kycRecord.expiryTimestamp <= currentTimestamp;
  },

  /**
   * Get risk level description
   */
  getRiskLevelDescription(riskScore) {
    if (riskScore <= 3) return 'Low Risk';
    if (riskScore <= 6) return 'Medium Risk';
    if (riskScore <= 8) return 'High Risk';
    return 'Critical Risk';
  },

  /**
   * Format reporting period for display
   */
  formatReportingPeriod(period) {
    const year = Math.floor(period / 100);
    const month = period % 100;
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return `${monthNames[month - 1]} ${year}`;
  }
};

export default ComplianceManager;
