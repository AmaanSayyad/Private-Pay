/**
 * Wrapper for poseidon-lite to ensure proper ESM exports
 * This fixes the CommonJS/ESM interop issue
 */

// Import all poseidon functions
import poseidonLite from 'poseidon-lite';

// Re-export with proper ESM syntax
export const poseidon1 = poseidonLite.poseidon1;
export const poseidon2 = poseidonLite.poseidon2;
export const poseidon3 = poseidonLite.poseidon3;
export const poseidon4 = poseidonLite.poseidon4;
export const poseidon5 = poseidonLite.poseidon5;
export const poseidon6 = poseidonLite.poseidon6;
export const poseidon7 = poseidonLite.poseidon7;
export const poseidon8 = poseidonLite.poseidon8;
export const poseidon9 = poseidonLite.poseidon9;
export const poseidon10 = poseidonLite.poseidon10;
export const poseidon11 = poseidonLite.poseidon11;
export const poseidon12 = poseidonLite.poseidon12;
export const poseidon13 = poseidonLite.poseidon13;
export const poseidon14 = poseidonLite.poseidon14;
export const poseidon15 = poseidonLite.poseidon15;
export const poseidon16 = poseidonLite.poseidon16;

export default poseidonLite;
