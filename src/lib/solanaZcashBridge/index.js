import { sha256 } from '@noble/hashes/sha2.js';
import * as secp256k1 from '@noble/secp256k1';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils.js';
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';

export function getBridgeProgramId() {
  const programId = import.meta.env.VITE_ZCASH_BRIDGE_PROGRAM_ID;
  if (!programId) {
    throw new Error('VITE_ZCASH_BRIDGE_PROGRAM_ID required');
  }
  try {
    new PublicKey(programId);
  } catch {
    throw new Error(`Invalid VITE_ZCASH_BRIDGE_PROGRAM_ID: ${programId}`);
  }
  return programId;
}

export function generateStealthMetaAddress() {
  const spendingKeyPair = secp256k1.utils.randomPrivateKey();
  const viewingKeyPair = secp256k1.utils.randomPrivateKey();

  const spendingPubKey = secp256k1.getPublicKey(spendingKeyPair, true);
  const viewingPubKey = secp256k1.getPublicKey(viewingKeyPair, true);

  const metaAddress = Buffer.concat([
    Buffer.from([0x01]),
    Buffer.from(spendingPubKey),
    Buffer.from(viewingPubKey),
  ]);

  return {
    metaAddress: bs58.encode(metaAddress),
    spendingPrivateKey: bytesToHex(spendingKeyPair),
    viewingPrivateKey: bytesToHex(viewingKeyPair),
    spendingPublicKey: bytesToHex(spendingPubKey),
    viewingPublicKey: bytesToHex(viewingPubKey),
  };
}

export function parseStealthMetaAddress(metaAddress) {
  const decoded = bs58.decode(metaAddress);

  if (decoded[0] !== 0x01) {
    throw new Error('Invalid stealth meta-address version');
  }

  if (decoded.length !== 67) {
    throw new Error('Invalid stealth meta-address length');
  }

  const spendingPubKey = decoded.slice(1, 34);
  const viewingPubKey = decoded.slice(34, 67);

  return {
    spendingPublicKey: bytesToHex(spendingPubKey),
    viewingPublicKey: bytesToHex(viewingPubKey),
  };
}

export function generateStealthAddress(metaAddress) {
  const { spendingPublicKey, viewingPublicKey } = parseStealthMetaAddress(metaAddress);

  const ephemeralPrivateKey = secp256k1.utils.randomPrivateKey();
  const ephemeralPublicKey = secp256k1.getPublicKey(ephemeralPrivateKey, true);

  const viewingPubKeyPoint = secp256k1.ProjectivePoint.fromHex(viewingPublicKey);
  const sharedSecretPoint = viewingPubKeyPoint.multiply(
    BigInt('0x' + bytesToHex(ephemeralPrivateKey))
  );

  const sharedSecret = sha256(sharedSecretPoint.toRawBytes(true));

  const spendingPubKeyPoint = secp256k1.ProjectivePoint.fromHex(spendingPublicKey);
  const sharedSecretScalar = BigInt('0x' + bytesToHex(sharedSecret)) % secp256k1.CURVE.n;
  const sharedSecretPoint2 = secp256k1.ProjectivePoint.BASE.multiply(sharedSecretScalar);
  const stealthPubKeyPoint = spendingPubKeyPoint.add(sharedSecretPoint2);

  const stealthPubKey = stealthPubKeyPoint.toRawBytes(true);

  const stealthAddressHash = sha256(stealthPubKey);
  const solanaAddress = bs58.encode(stealthAddressHash);

  return {
    stealthAddress: solanaAddress,
    ephemeralPublicKey: bytesToHex(ephemeralPublicKey),
    viewTag: bytesToHex(sharedSecret.slice(0, 1)),
  };
}

export function deriveStealthPrivateKey(
  spendingPrivateKey,
  viewingPrivateKey,
  ephemeralPublicKey
) {
  const spendingKey = hexToBytes(spendingPrivateKey);
  const viewingKey = hexToBytes(viewingPrivateKey);
  const ephemeralPubKey = hexToBytes(ephemeralPublicKey);

  const ephemeralPoint = secp256k1.ProjectivePoint.fromHex(ephemeralPubKey);
  const sharedSecretPoint = ephemeralPoint.multiply(
    BigInt('0x' + bytesToHex(viewingKey))
  );

  const sharedSecret = sha256(sharedSecretPoint.toRawBytes(true));

  const spendingKeyBigInt = BigInt('0x' + bytesToHex(spendingKey));
  const sharedSecretBigInt = BigInt('0x' + bytesToHex(sharedSecret));

  const stealthPrivateKeyBigInt = (spendingKeyBigInt + sharedSecretBigInt) % secp256k1.CURVE.n;

  const stealthPrivateKeyHex = stealthPrivateKeyBigInt.toString(16).padStart(64, '0');
  return stealthPrivateKeyHex;
}

export function checkViewTag(
  viewingPrivateKey,
  ephemeralPublicKey,
  viewTag
) {
  const viewingKey = hexToBytes(viewingPrivateKey);
  const ephemeralPubKey = hexToBytes(ephemeralPublicKey);

  const ephemeralPoint = secp256k1.ProjectivePoint.fromHex(ephemeralPubKey);
  const sharedSecretPoint = ephemeralPoint.multiply(
    BigInt('0x' + bytesToHex(viewingKey))
  );

  const sharedSecret = sha256(sharedSecretPoint.toRawBytes(true));
  const computedViewTag = bytesToHex(sharedSecret.slice(0, 1));

  return computedViewTag === viewTag;
}

export class DepositTicket {
  constructor({
    id,
    depositor,
    amount,
    zcashAddress,
    status = 'pending',
    solanaSignature = null,
    zcashTxId = null,
    createdAt = Date.now(),
    confirmedAt = null,
  }) {
    this.id = id;
    this.depositor = depositor;
    this.amount = amount;
    this.zcashAddress = zcashAddress;
    this.status = status;
    this.solanaSignature = solanaSignature;
    this.zcashTxId = zcashTxId;
    this.createdAt = createdAt;
    this.confirmedAt = confirmedAt;
  }

  toJSON() {
    return {
      id: this.id,
      depositor: this.depositor,
      amount: this.amount,
      zcashAddress: this.zcashAddress,
      status: this.status,
      solanaSignature: this.solanaSignature,
      zcashTxId: this.zcashTxId,
      createdAt: this.createdAt,
      confirmedAt: this.confirmedAt,
    };
  }

  static fromJSON(json) {
    return new DepositTicket(json);
  }
}

export class WithdrawalTicket {
  constructor({
    id,
    recipient,
    amount,
    nullifier,
    status = 'pending',
    zcashProof = null,
    solanaSignature = null,
    createdAt = Date.now(),
    processedAt = null,
  }) {
    this.id = id;
    this.recipient = recipient;
    this.amount = amount;
    this.nullifier = nullifier;
    this.status = status;
    this.zcashProof = zcashProof;
    this.solanaSignature = solanaSignature;
    this.createdAt = createdAt;
    this.processedAt = processedAt;
  }

  toJSON() {
    return {
      id: this.id,
      recipient: this.recipient,
      amount: this.amount,
      nullifier: this.nullifier,
      status: this.status,
      zcashProof: this.zcashProof,
      solanaSignature: this.solanaSignature,
      createdAt: this.createdAt,
      processedAt: this.processedAt,
    };
  }

  static fromJSON(json) {
    return new WithdrawalTicket(json);
  }
}

export function generateDepositCommitment(
  depositor,
  amount,
  zcashAddress,
  nonce
) {
  const data = Buffer.concat([
    Buffer.from(depositor),
    Buffer.from(amount.toString()),
    Buffer.from(zcashAddress),
    Buffer.from(nonce.toString()),
  ]);

  return bytesToHex(sha256(data));
}

export function generateWithdrawalNullifier(
  commitment,
  privateKey
) {
  const data = Buffer.concat([
    Buffer.from(commitment),
    Buffer.from(privateKey),
  ]);

  return bytesToHex(sha256(data));
}

export function deriveBridgeStatePDA() {
  const programId = new PublicKey(getBridgeProgramId());
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('bridge')],
    programId
  );
  return { pda, bump };
}

export function deriveVaultPDA() {
  const programId = new PublicKey(getBridgeProgramId());
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault')],
    programId
  );
  return { pda, bump };
}

export function deriveDepositTicketPDA(ticketId) {
  const programId = new PublicKey(getBridgeProgramId());
  // Convert ticketId to u64 little-endian bytes (8 bytes) to match Rust: deposit_nonce.to_le_bytes()
  const ticketIdBuffer = Buffer.alloc(8);
  ticketIdBuffer.writeBigUInt64LE(BigInt(ticketId));
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('deposit'), ticketIdBuffer],
    programId
  );
  return { pda, bump };
}

export function deriveWithdrawalTicketPDA(ticketId) {
  const programId = new PublicKey(getBridgeProgramId());
  // Convert ticketId to u64 little-endian bytes (8 bytes) to match Rust
  const ticketIdBuffer = Buffer.alloc(8);
  ticketIdBuffer.writeBigUInt64LE(BigInt(ticketId));
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('withdrawal'), ticketIdBuffer],
    programId
  );
  return { pda, bump };
}

export function deriveStealthMetaAddressPDA(owner) {
  const programId = new PublicKey(getBridgeProgramId());
  const ownerPubkey = new PublicKey(owner);
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('stealth_meta'), ownerPubkey.toBuffer()],
    programId
  );
  return { pda, bump };
}

export function deriveStealthPaymentPDA(stealthAddress) {
  const programId = new PublicKey(getBridgeProgramId());
  const stealthPubkey = new PublicKey(stealthAddress);
  const [pda, bump] = PublicKey.findProgramAddressSync(
    [Buffer.from('stealth_payment'), stealthPubkey.toBuffer()],
    programId
  );
  return { pda, bump };
}

export function isValidZcashTransparentAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  if (address.startsWith('t1')) {
    return address.length === 35;
  }
  if (address.startsWith('t3')) {
    return address.length === 35;
  }

  return false;
}

export function isValidZcashSaplingAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  if (address.startsWith('zs1')) {
    return address.length === 78;
  }

  return false;
}

export function isValidZcashUnifiedAddress(address) {
  if (!address || typeof address !== 'string') {
    return false;
  }

  return address.startsWith('u1') && address.length >= 100;
}

export function isValidZcashAddress(address) {
  return (
    isValidZcashTransparentAddress(address) ||
    isValidZcashSaplingAddress(address) ||
    isValidZcashUnifiedAddress(address)
  );
}

export function convertSolToZec(solLamports, solPrice, zecPrice) {
  const solAmount = solLamports / 1e9;
  const usdValue = solAmount * solPrice;
  const zecAmount = usdValue / zecPrice;
  const zatoshi = Math.floor(zecAmount * 1e8);
  return zatoshi;
}

export function convertZecToSol(zatoshi, solPrice, zecPrice) {
  const zecAmount = zatoshi / 1e8;
  const usdValue = zecAmount * zecPrice;
  const solAmount = usdValue / solPrice;
  const lamports = Math.floor(solAmount * 1e9);
  return lamports;
}

export function formatSolAmount(lamports) {
  return (lamports / 1e9).toFixed(9);
}

export function formatZecAmount(zatoshi) {
  return (zatoshi / 1e8).toFixed(8);
}

export const BridgeStatus = {
  PENDING: 'pending',
  INITIATED: 'initiated',
  CONFIRMING: 'confirming',
  CONFIRMED: 'confirmed',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  EXPIRED: 'expired',
};

export const BridgeDirection = {
  SOL_TO_ZEC: 'sol_to_zec',
  ZEC_TO_SOL: 'zec_to_sol',
};

export const BRIDGE_CONSTANTS = {
  get PROGRAM_ID() {
    return getBridgeProgramId();
  },
  MIN_DEPOSIT_SOL: 0.01,
  MAX_DEPOSIT_SOL: 1000,
  MIN_WITHDRAWAL_ZEC: 0.0001,
  MAX_WITHDRAWAL_ZEC: 100,
  DEPOSIT_TIMEOUT_SLOTS: 100,
  WITHDRAWAL_TIMEOUT_SLOTS: 100,
  BRIDGE_FEE_BPS: 30,
};
