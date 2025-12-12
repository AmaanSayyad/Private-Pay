import { PublicKey } from "@solana/web3.js";
import { PRIVATE_PAY_PROGRAM_ID } from "./constants.js";

// Cache for Arcium client library
let arciumLibCache = null;

/**
 * Safely get Arcium client library
 */
async function getArciumLib() {
  if (arciumLibCache) return arciumLibCache;
  
  try {
    arciumLibCache = await import("@arcium-hq/client");
    return arciumLibCache;
  } catch (error) {
    console.warn("@arcium-hq/client not available:", error);
    return null;
  }
}

/**
 * Safe wrapper for getArciumEnv
 */
export async function getArciumEnvSafe() {
  const lib = await getArciumLib();
  if (!lib || !lib.getArciumEnv) {
    // Return default devnet environment
    return {
      arciumClusterOffset: new Uint8Array([0, 0, 0, 0]), // Default cluster offset
    };
  }
  
  try {
    return lib.getArciumEnv();
  } catch (error) {
    console.warn("Failed to get Arcium env, using defaults:", error);
    return {
      arciumClusterOffset: new Uint8Array([0, 0, 0, 0]),
    };
  }
}

/**
 * Safe wrapper for getCompDefAccOffset
 */
export function getCompDefAccOffsetSafe(ixName) {
  // Map instruction names to offsets
  // These should match the offsets used in the Solana program
  const offsetMap = {
    "init_balance": Buffer.from("init_balance"),
    "deposit": Buffer.from("deposit"),
    "send_payment": Buffer.from("send_payment"),
    "init_pool": Buffer.from("init_pool"),
    "execute_swap": Buffer.from("execute_swap"),
    "init_order_book": Buffer.from("init_order_book"),
    "place_order": Buffer.from("place_order"),
    "match_orders": Buffer.from("match_orders"),
  };

  const offset = offsetMap[ixName];
  if (!offset) {
    console.warn(`Unknown instruction name: ${ixName}, using default offset`);
    return Buffer.from(ixName);
  }

  return offset;
}

/**
 * Safe wrapper for getCompDefAccAddress
 * Returns a Promise that resolves to the PublicKey
 */
export async function getCompDefAccAddressSafe(programId, offset) {
  if (!programId) {
    throw new Error("Program ID is required");
  }

  const lib = await getArciumLib();
  if (!lib || !lib.getCompDefAccAddress) {
    // Fallback: derive PDA manually
    const baseSeed = Buffer.from("ComputationDefinitionAccount");
    const offsetBuffer = Buffer.isBuffer(offset) ? offset : Buffer.from(offset);
    
    // Get Arcium program ID
    const arciumProgramId = lib?.getArciumProgramId?.() || new PublicKey("Arcium1111111111111111111111111111111111111");
    
    const [pda] = PublicKey.findProgramAddressSync(
      [baseSeed, programId.toBuffer(), offsetBuffer],
      arciumProgramId
    );
    return pda;
  }

  try {
    const offsetU32 = Buffer.isBuffer(offset) 
      ? offset.readUInt32LE(0) 
      : Buffer.from(offset).readUInt32LE(0);
    return lib.getCompDefAccAddress(programId, offsetU32);
  } catch (error) {
    console.warn("Failed to get comp def address, using fallback:", error);
    const baseSeed = Buffer.from("ComputationDefinitionAccount");
    const offsetBuffer = Buffer.isBuffer(offset) ? offset : Buffer.from(offset);
    const arciumProgramId = lib.getArciumProgramId?.() || new PublicKey("Arcium1111111111111111111111111111111111111");
    const [pda] = PublicKey.findProgramAddressSync(
      [baseSeed, programId.toBuffer(), offsetBuffer],
      arciumProgramId
    );
    return pda;
  }
}

/**
 * Safe wrapper for getMempoolAccAddress
 */
export function getMempoolAccAddressSafe(clusterOffset) {
  return getArciumLib().then((lib) => {
    if (!lib || !lib.getMempoolAccAddress) {
      throw new Error("Arcium client not available");
    }
    return lib.getMempoolAccAddress(clusterOffset);
  });
}

/**
 * Safe wrapper for getExecutingPoolAccAddress
 */
export function getExecutingPoolAccAddressSafe(clusterOffset) {
  return getArciumLib().then((lib) => {
    if (!lib || !lib.getExecutingPoolAccAddress) {
      throw new Error("Arcium client not available");
    }
    return lib.getExecutingPoolAccAddress(clusterOffset);
  });
}

/**
 * Safe wrapper for getFeePoolAccAddress
 */
export function getFeePoolAccAddressSafe(clusterOffset) {
  return getArciumLib().then((lib) => {
    if (!lib || !lib.getFeePoolAccAddress) {
      throw new Error("Arcium client not available");
    }
    return lib.getFeePoolAccAddress(clusterOffset);
  });
}

/**
 * Safe wrapper for getClockAccAddress
 */
export function getClockAccAddressSafe(clusterOffset) {
  return getArciumLib().then((lib) => {
    if (!lib || !lib.getClockAccAddress) {
      throw new Error("Arcium client not available");
    }
    return lib.getClockAccAddress(clusterOffset);
  });
}

/**
 * Safe wrapper for getComputationAccAddress
 */
export function getComputationAccAddressSafe(clusterOffset, computationOffset) {
  return getArciumLib().then((lib) => {
    if (!lib || !lib.getComputationAccAddress) {
      throw new Error("Arcium client not available");
    }
    
    // Convert computationOffset to BN if needed
    const offset = computationOffset instanceof Uint8Array 
      ? computationOffset 
      : Buffer.from(computationOffset.toString(16).padStart(16, "0"), "hex");
    
    return lib.getComputationAccAddress(clusterOffset, offset);
  });
}

/**
 * Safe wrapper for awaitComputationFinalization
 */
export async function awaitComputationFinalizationSafe(
  connection,
  computationOffset,
  programId,
  commitment = "confirmed"
) {
  const lib = await getArciumLib();
  if (!lib || !lib.awaitComputationFinalization) {
    console.warn("Arcium client not available, skipping computation finalization wait");
    return null;
  }

  try {
    // Convert computationOffset to proper format
    const offset = computationOffset instanceof Uint8Array 
      ? computationOffset 
      : Buffer.from(computationOffset.toString(16).padStart(16, "0"), "hex");

    const provider = {
      connection,
    };

    return await lib.awaitComputationFinalization(
      provider,
      offset,
      programId,
      commitment
    );
  } catch (error) {
    console.error("Failed to await computation finalization:", error);
    throw error;
  }
}

