/**
 * Lightweight shim for @aptos-labs/ts-sdk used by
 * @identity-connect/wallet-api and @aptos-connect/web-transport.
 *
 * It intentionally does NOT pull in the real ts-sdk (and its heavy
 * poseidon-lite dependency), avoiding bundle/runtime issues.
 *
 * Only the minimal surface used by those packages is implemented.
 */

export class Serializer {
  constructor() {
    this.bytes = [];
  }
  serializeStr(value) {
    this.bytes.push(...new TextEncoder().encode(String(value)));
  }
  toUint8Array() {
    return new Uint8Array(this.bytes);
  }
}

export class Deserializer {
  constructor(bytes) {
    this.bytes = bytes ?? new Uint8Array();
    this.offset = 0;
  }
  deserializeStr() {
    // Very naive implementation: treat the whole buffer as a UTF‑8 string
    const view = this.bytes.subarray(this.offset);
    this.offset = this.bytes.length;
    return new TextDecoder().decode(view);
  }
}

export class Hex {
  static fromHexString(hex) {
    const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
    return {
      toString() {
        return `0x${clean}`;
      },
    };
  }
}

export default {
  Serializer,
  Deserializer,
  Hex,
};
