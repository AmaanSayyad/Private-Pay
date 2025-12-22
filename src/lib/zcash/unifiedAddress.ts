/**
 * Unified Address Utilities
 * 
 * Zcash Unified Addresses (UAs) combine multiple receiver types into a single address.
 * This allows senders to choose which pool to use while the recipient provides one address.
 * 
 * UA Structure:
 * - Can contain transparent (t-addr), Sapling (zs), and Orchard (zo) receivers
 * - Starts with 'u1' (mainnet) or 'u3' (testnet)
 * - Encoded using Bech32m
 * 
 * Benefits:
 * - Simplifies receiving: one address for all pool types
 * - Sender privacy: choose shielded pool if supported
 * - Backward compatibility: transparent receiver for older wallets
 * - Future-proof: can add new receiver types
 */

import type { UnifiedAddress } from './shieldedWallet';

/**
 * Parse a unified address to extract receiver components
 * 
 * @param ua - Unified address string
 * @returns Parsed address information
 */
export function parseUnifiedAddress(ua: string): {
  isValid: boolean;
  network: 'mainnet' | 'testnet' | 'unknown';
  transparentReceiver?: string;
  saplingReceiver?: string;
  orchardReceiver?: string;
  error?: string;
} {
  try {
    // Validate UA format
    if (!ua || typeof ua !== 'string') {
      return { isValid: false, network: 'unknown', error: 'Invalid address format' };
    }

    // Check network prefix
    const isMainnet = ua.startsWith('u1');
    const isTestnet = ua.startsWith('u3');

    if (!isMainnet && !isTestnet) {
      return { 
        isValid: false, 
        network: 'unknown', 
        error: 'Not a unified address (must start with u1 or u3)' 
      };
    }

    // Basic length validation (UAs are typically 140+ characters)
    if (ua.length < 100) {
      return { 
        isValid: false, 
        network: isMainnet ? 'mainnet' : 'testnet',
        error: 'Address too short' 
      };
    }

    // TODO: Implement full Bech32m decoding to extract individual receivers
    // This would require the Zcash address parsing library
    // For now, return basic validation
    return {
      isValid: true,
      network: isMainnet ? 'mainnet' : 'testnet',
      // These would be extracted from the actual UA decoding:
      transparentReceiver: undefined,
      saplingReceiver: undefined,
      orchardReceiver: undefined,
    };
  } catch (error) {
    return {
      isValid: false,
      network: 'unknown',
      error: `Parse error: ${error}`,
    };
  }
}

/**
 * Generate a unified address that includes both shielded and transparent receivers
 * This allows the existing bitcore logic to send to the transparent component if needed
 * 
 * @param shieldedWallet - ShieldedWallet instance
 * @param includeTransparent - Whether to include transparent receiver (default: true)
 * @returns Unified address with metadata
 */
export async function generateUnifiedAddress(
  shieldedWallet: any, // Type: ShieldedWallet
  includeTransparent: boolean = true
): Promise<UnifiedAddress> {
  try {
    // Get UA from the shielded wallet
    const ua = await shieldedWallet.getUnifiedAddress();
    
    return ua;
  } catch (error) {
    console.error('[UA] Failed to generate unified address:', error);
    throw new Error(`Failed to generate unified address: ${error}`);
  }
}

/**
 * Extract the transparent receiver from a unified address
 * This is useful for the existing bitcore implementation
 * 
 * @param ua - Unified address
 * @returns Transparent address (t-addr) or null if not present
 */
export function extractTransparentReceiver(ua: string): string | null {
  const parsed = parseUnifiedAddress(ua);
  
  if (!parsed.isValid) {
    console.warn('[UA] Invalid unified address:', parsed.error);
    return null;
  }

  return parsed.transparentReceiver || null;
}

/**
 * Extract the Sapling receiver from a unified address
 * 
 * @param ua - Unified address
 * @returns Sapling address (zs-addr) or null if not present
 */
export function extractSaplingReceiver(ua: string): string | null {
  const parsed = parseUnifiedAddress(ua);
  
  if (!parsed.isValid) {
    return null;
  }

  return parsed.saplingReceiver || null;
}

/**
 * Extract the Orchard receiver from a unified address
 * 
 * @param ua - Unified address
 * @returns Orchard address (zo-addr) or null if not present
 */
export function extractOrchardReceiver(ua: string): string | null {
  const parsed = parseUnifiedAddress(ua);
  
  if (!parsed.isValid) {
    return null;
  }

  return parsed.orchardReceiver || null;
}

/**
 * Check if an address is a unified address
 * 
 * @param address - Address to check
 * @returns True if address is a UA
 */
export function isUnifiedAddress(address: string): boolean {
  if (!address || typeof address !== 'string') {
    return false;
  }

  return address.startsWith('u1') || address.startsWith('u3');
}

/**
 * Get the best receiver from a unified address for a given preference
 * Priority: Orchard > Sapling > Transparent (for maximum privacy)
 * 
 * @param ua - Unified address
 * @param preferTransparent - Prefer transparent over shielded (default: false)
 * @returns Best receiver address
 */
export function getBestReceiver(
  ua: string,
  preferTransparent: boolean = false
): string | null {
  const parsed = parseUnifiedAddress(ua);
  
  if (!parsed.isValid) {
    return null;
  }

  // If transparent is preferred (e.g., for bitcore compatibility)
  if (preferTransparent && parsed.transparentReceiver) {
    return parsed.transparentReceiver;
  }

  // Otherwise, prefer shielded pools (best privacy)
  return (
    parsed.orchardReceiver ||
    parsed.saplingReceiver ||
    parsed.transparentReceiver ||
    null
  );
}

/**
 * Validate that a unified address has the required receivers
 * 
 * @param ua - Unified address
 * @param requireTransparent - Require transparent receiver
 * @param requireShielded - Require at least one shielded receiver
 * @returns Validation result
 */
export function validateUnifiedAddress(
  ua: string,
  requireTransparent: boolean = false,
  requireShielded: boolean = false
): { isValid: boolean; error?: string } {
  const parsed = parseUnifiedAddress(ua);
  
  if (!parsed.isValid) {
    return { isValid: false, error: parsed.error };
  }

  if (requireTransparent && !parsed.transparentReceiver) {
    return { 
      isValid: false, 
      error: 'Unified address missing required transparent receiver' 
    };
  }

  if (requireShielded && !parsed.saplingReceiver && !parsed.orchardReceiver) {
    return { 
      isValid: false, 
      error: 'Unified address missing required shielded receiver' 
    };
  }

  return { isValid: true };
}

/**
 * Format unified address for display (show abbreviated version)
 * 
 * @param ua - Unified address
 * @param prefixLength - Number of characters to show at start (default: 8)
 * @param suffixLength - Number of characters to show at end (default: 8)
 * @returns Abbreviated address
 */
export function formatUnifiedAddress(
  ua: string,
  prefixLength: number = 8,
  suffixLength: number = 8
): string {
  if (!ua || ua.length <= prefixLength + suffixLength) {
    return ua;
  }

  return `${ua.slice(0, prefixLength)}...${ua.slice(-suffixLength)}`;
}

