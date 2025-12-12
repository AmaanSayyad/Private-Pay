import { PublicKey } from "@solana/web3.js";
import { ARCIUM_CLUSTER_OFFSET } from "./constants.js";

// STUB IMPLEMENTATIONS to fix build errors.
// TODO: Replace with actual Arcium SDK logic / implementation.

export const getArciumEnvSafe = async () => {
  return { arciumClusterOffset: ARCIUM_CLUSTER_OFFSET };
};

const DUMMY_KEY = new PublicKey("11111111111111111111111111111111");

export const getClockAccAddressSafe = async (clusterOffset) => {
    return DUMMY_KEY;
};

export const getCompDefAccOffsetSafe = (ixName) => {
    return new Uint8Array(8); // Mocking 8 byte offset
};

export const getCompDefAccAddressSafe = async (programId, offset) => {
    return DUMMY_KEY;
};

export const getComputationAccAddressSafe = async (clusterOffset, compOffset) => {
    return DUMMY_KEY;
};

export const getExecutingPoolAccAddressSafe = async (clusterOffset) => {
   return DUMMY_KEY;
};

export const getFeePoolAccAddressSafe = async (clusterOffset) => {
   return DUMMY_KEY;
};

export const getMempoolAccAddressSafe = async (clusterOffset) => {
   return DUMMY_KEY;
};

export const awaitComputationFinalizationSafe = async (connection, compOffset, programId, commitment) => {
    console.warn("awaitComputationFinalizationSafe is a stub!");
    return true;
}
