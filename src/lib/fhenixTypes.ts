export type EncryptionState = "Extract" | "Pack" | "Prove" | "Verify" | "Replace" | "Done";

export interface FhenixEncryptionResult {
  encryptedBytes: number[];
  // For InEuint64 tuple, we will pass this as `{ data: 0x..., securityZone }`
  // when calling contracts.
  encryptedValue: unknown;
  encAmountHash: string;
}



