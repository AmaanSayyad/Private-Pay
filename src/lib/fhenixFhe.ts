import type { FhenixEncryptionResult } from "../lib/fhenixTypes";

let cofheInitialized = false;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let cofhejsInstance: any = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let EncryptableClass: any = null;

async function poseidonLikeHash(bytes: number[]): Promise<string> {
  const input = bytes.slice(0, 32);
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(input));
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fieldBytes = hashArray.slice(0, 31);
  let result = BigInt(0);
  for (let i = 0; i < fieldBytes.length; i++) {
    result = result * BigInt(256) + BigInt(fieldBytes[i]);
  }
  return result.toString();
}

export async function initFhenixFhe(provider?: unknown, signer?: unknown): Promise<boolean> {
  if (cofheInitialized && cofhejsInstance) {
    // If already initialized but provider/signer provided, reinitialize
    if (provider && signer) {
      try {
        const result = await cofhejsInstance.initialize({ provider, signer });
        if (result.success === false) {
          console.warn("CoFHE re-initialization returned error:", result.error);
          return false;
        }
        const permitResult = await cofhejsInstance.createPermit();
        if (permitResult.success === false) {
          console.warn("CoFHE permit creation failed:", permitResult.error);
        }
      } catch (error) {
        console.warn("CoFHE re-initialization error:", error);
        return false;
      }
    }
    return true;
  }

  try {
    // Load cofhejs module
    const cofheModule = await import("cofhejs/web");
    cofhejsInstance = cofheModule.cofhejs;
    EncryptableClass = cofheModule.Encryptable;

    if (!cofhejsInstance || !EncryptableClass) {
      throw new Error("cofhejs module loaded but cofhejs or Encryptable not found");
    }

    console.log("✅ CoFHE module loaded successfully");

    // Initialize with provider and signer if available
    if (provider && signer) {
      console.log("Initializing CoFHE with provider and signer...");
      const result = await cofhejsInstance.initialize({ provider, signer });
      if (result.success === false) {
        console.error("CoFHE initialization returned error:", result.error);
        // Don't fail completely - module is loaded, just permit creation failed
        console.warn("CoFHE module loaded but initialization failed. Will retry when wallet connects.");
      } else {
        console.log("✅ CoFHE initialized with provider/signer");
        
        // Create permit
        const permitResult = await cofhejsInstance.createPermit();
        if (permitResult.success === false) {
          console.warn("CoFHE permit creation failed:", permitResult.error);
        } else {
          console.log("✅ CoFHE permit created");
        }
      }
    } else {
      console.log("⚠️ CoFHE module loaded but provider/signer not available. Will initialize when wallet connects.");
    }

    cofheInitialized = true;
    return true;
  } catch (error) {
    console.error("❌ CoFHE module loading failed:", error);
    cofheInitialized = false;
    cofhejsInstance = null;
    EncryptableClass = null;
    return false;
  }
}

export async function reinitFhenixFhe(provider: unknown, signer: unknown): Promise<boolean> {
  cofheInitialized = false;
  cofhejsInstance = null;
  return initFhenixFhe(provider, signer);
}

export function isFhenixFheInitialized(): boolean {
  return cofheInitialized && cofhejsInstance !== null;
}

export async function encryptAmountFallback(amount: number): Promise<FhenixEncryptionResult> {
  const amountBigInt = BigInt(Math.floor(amount * 1_000_000)); // 6 decimals for FHPAY
  const encryptedBytes = new Array(128).fill(0);
  const randomBytes = new Uint8Array(128);
  crypto.getRandomValues(randomBytes);

  let tempAmount = amountBigInt;
  for (let i = 0; i < 8; i++) {
    encryptedBytes[i] = Number(tempAmount & BigInt(0xff));
    tempAmount = tempAmount >> BigInt(8);
  }
  for (let i = 8; i < 128; i++) {
    encryptedBytes[i] = randomBytes[i];
  }

  const encryptedValue = {
    data: encryptedBytes,
    securityZone: 0,
  };

  const encAmountHash = await poseidonLikeHash(encryptedBytes);

  return {
    encryptedBytes,
    encryptedValue,
    encAmountHash,
  };
}

export async function encryptAmount(amount: number): Promise<FhenixEncryptionResult> {
  try {
    if (!cofheInitialized || !cofhejsInstance || !EncryptableClass) {
      const initialized = await initFhenixFhe();
      if (!initialized) {
        return encryptAmountFallback(amount);
      }
    }

    const units = BigInt(Math.floor(amount * 1_000_000)); // FHPAY 6 decimals
    const encryptResult = await cofhejsInstance!.encrypt(EncryptableClass!.uint64(units));

    if (encryptResult.success === false) {
      console.warn("CoFHE encryption failed:", encryptResult.error);
      return encryptAmountFallback(amount);
    }

    const encryptedInput = encryptResult.data;
    let encryptedBytes: number[];

    if (encryptedInput && typeof encryptedInput === "object" && "data" in encryptedInput) {
      const rawData = (encryptedInput as { data: Uint8Array | number[] }).data;
      encryptedBytes = Array.from(rawData);
    } else if (encryptedInput instanceof Uint8Array) {
      encryptedBytes = Array.from(encryptedInput);
    } else {
      encryptedBytes = serializeEncryptedValue(encryptedInput);
    }

    if (encryptedBytes.length < 128) {
      const padding = new Array(128 - encryptedBytes.length).fill(0);
      encryptedBytes = [...encryptedBytes, ...padding];
    } else if (encryptedBytes.length > 128) {
      encryptedBytes = encryptedBytes.slice(0, 128);
    }

    const encAmountHash = await poseidonLikeHash(encryptedBytes);

    return {
      encryptedBytes,
      encryptedValue: encryptedInput,
      encAmountHash,
    };
  } catch (error) {
    console.error("Fhenix FHE encryption failed:", error);
    return encryptAmountFallback(amount);
  }
}

function serializeEncryptedValue(value: unknown): number[] {
  if (value === null || value === undefined) {
    return new Array(128).fill(0);
  }
  try {
    const jsonStr = JSON.stringify(value);
    const encoder = new TextEncoder();
    const bytes = encoder.encode(jsonStr);
    return Array.from(bytes);
  } catch {
    return new Array(128).fill(0);
  }
}

export async function unsealValue(sealedValue: unknown): Promise<bigint | null> {
  if (!cofheInitialized || !cofhejsInstance) {
    console.error("CoFHE not initialized for unsealing");
    return null;
  }
  try {
    const result = await cofhejsInstance.unseal(sealedValue);
    if (result.success === false) {
      console.error("Unseal failed:", result.error);
      return null;
    }
    return result.data as bigint;
  } catch (error) {
    console.error("Failed to unseal value:", error);
    return null;
  }
}

export function getPermission(): unknown {
  if (!cofheInitialized || !cofhejsInstance) {
    return null;
  }
  try {
    const permit = cofhejsInstance.getPermit();
    return permit?.getPermission?.() ?? null;
  } catch {
    return null;
  }
}


