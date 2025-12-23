import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from '@solana/web3.js';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from '@solana/spl-token';
import {
  deriveBridgeStatePDA,
  deriveVaultPDA,
  deriveDepositTicketPDA,
  deriveWithdrawalTicketPDA,
  deriveStealthMetaAddressPDA,
  deriveStealthPaymentPDA,
  generateStealthMetaAddress,
  generateStealthAddress,
  isValidZcashAddress,
  BRIDGE_CONSTANTS,
} from './index.js';
import { HeliusClient } from '../helius/index.js';
import ZCASH_BRIDGE_IDL from './idl/zcash_bridge.json';

function getBridgeProgramPubkey() {
  return new PublicKey(BRIDGE_CONSTANTS.PROGRAM_ID);
}

function getUsdcMint() {
  const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
  const customMint = import.meta.env.VITE_USDC_MINT;

  if (customMint) {
    return new PublicKey(customMint);
  }

  if (network === 'mainnet-beta' || network === 'mainnet') {
    return new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v');
  }

  throw new Error('VITE_USDC_MINT required for devnet/testnet');
}

export class SolanaZcashBridgeClient {
  constructor(connection, wallet, heliusClient = null) {
    this.connection = connection;
    this.wallet = wallet;
    this.heliusClient = heliusClient;
    this.program = null;
    this.bridgeState = null;
    this.isInitialized = false;
  }

  async initialize() {
    if (!this.wallet) {
      throw new Error('Wallet not connected');
    }

    const provider = new AnchorProvider(this.connection, this.wallet, {
      commitment: 'confirmed',
    });

    try {
      const programId = getBridgeProgramPubkey();

      // First try to fetch IDL from on-chain
      let idl = null;
      try {
        idl = await Program.fetchIdl(programId, provider);
      } catch (fetchError) {
        console.warn('Could not fetch IDL from on-chain, using local IDL:', fetchError.message);
      }

      // Fall back to local IDL if on-chain fetch fails
      if (!idl) {
        console.log('Using local IDL for zcash_bridge program');
        idl = ZCASH_BRIDGE_IDL;
      }

      if (idl) {
        this.program = new Program(idl, programId, provider);
        this.isInitialized = true;
        console.log('Bridge client initialized with program ID:', programId.toBase58());

        // Try to load bridge state, but don't fail if it doesn't exist yet
        try {
          await this.loadBridgeState();
        } catch (stateError) {
          console.warn('Bridge state not found (may need initialization):', stateError.message);
        }
      }
    } catch (error) {
      console.error('Failed to initialize bridge client:', error);
      // Still mark as initialized so we can show proper error messages
      this.isInitialized = true;
    }
  }

  async loadBridgeState() {
    if (!this.program) return null;

    try {
      const { pda: bridgeStatePda } = deriveBridgeStatePDA();
      this.bridgeState = await this.program.account.bridgeState.fetch(bridgeStatePda);
      return this.bridgeState;
    } catch (error) {
      console.error('Failed to load bridge state:', error);
      return null;
    }
  }

  async initiateDeposit(amount, zcashAddress, tokenMint = null) {
    if (!this.program) {
      throw new Error('Bridge program not initialized. The Solana program may not be deployed yet.');
    }

    if (!isValidZcashAddress(zcashAddress)) {
      throw new Error('Invalid Zcash address');
    }

    const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
    if (amountLamports < BRIDGE_CONSTANTS.MIN_DEPOSIT_SOL * LAMPORTS_PER_SOL) {
      throw new Error(`Minimum deposit is ${BRIDGE_CONSTANTS.MIN_DEPOSIT_SOL} SOL`);
    }
    if (amountLamports > BRIDGE_CONSTANTS.MAX_DEPOSIT_SOL * LAMPORTS_PER_SOL) {
      throw new Error(`Maximum deposit is ${BRIDGE_CONSTANTS.MAX_DEPOSIT_SOL} SOL`);
    }

    const { pda: bridgeStatePda } = deriveBridgeStatePDA();

    // Check if bridge state exists
    let bridgeState;
    try {
      bridgeState = await this.program.account.bridgeState.fetch(bridgeStatePda);
    } catch (error) {
      throw new Error('Bridge not initialized on-chain. Please contact the administrator to initialize the bridge.');
    }

    const ticketId = bridgeState.depositNonce ? bridgeState.depositNonce.toNumber() : 0;

    const { pda: depositTicketPda } = deriveDepositTicketPDA(ticketId);
    const { pda: vaultPda } = deriveVaultPDA();

    // Zcash shielded address is 78 bytes
    const zcashAddressBytes = Buffer.alloc(78);
    Buffer.from(zcashAddress).copy(zcashAddressBytes);

    // Memo is 64 bytes (empty for now)
    const memoBytes = Buffer.alloc(64);

    // Get the wrapped ZEC mint from env or use provided tokenMint
    const wrappedZecMintStr = import.meta.env.VITE_WRAPPED_ZEC_MINT || tokenMint;
    if (!wrappedZecMintStr) {
      throw new Error('VITE_WRAPPED_ZEC_MINT not configured. Please set it in your .env file.');
    }
    const mintPubkey = new PublicKey(wrappedZecMintStr);

    // Get user's token account for the wrapped ZEC
    const userTokenAcct = await getAssociatedTokenAddress(
      mintPubkey,
      this.wallet.publicKey
    );

    // Vault is a PDA TokenAccount created during bridge initialization
    // It uses seeds = [b"vault"] - NOT an ATA!
    // The vault PDA is already derived above as vaultPda

    const accounts = {
      bridgeState: bridgeStatePda,
      depositTicket: depositTicketPda,
      user: this.wallet.publicKey,
      userTokenAccount: userTokenAcct,
      vault: vaultPda, // Use the vault PDA directly, not ATA
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    };

    let tx = new Transaction();

    // Build the deposit instruction
    const depositIx = await this.program.methods
      .initiateDeposit(new BN(amountLamports), Array.from(zcashAddressBytes), Array.from(memoBytes))
      .accounts(accounts)
      .instruction();

    tx.add(depositIx);

    if (this.heliusClient) {
      try {
        const result = await this.heliusClient.addPriorityFee(tx, { accountKeys: [this.wallet.publicKey.toBase58()] });
        tx = result.transaction;
      } catch (e) {
        console.warn('Failed to estimate priority fee, using default:', e.message);
      }
    }

    // Set blockhash and feePayer
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = this.wallet.publicKey;

    // Simulate first to get detailed error
    try {
      const simulation = await this.connection.simulateTransaction(tx);
      if (simulation.value.err) {
        console.error('Transaction simulation failed:', simulation.value.err);
        console.error('Logs:', simulation.value.logs);
        throw new Error(`Simulation failed: ${JSON.stringify(simulation.value.err)}\nLogs: ${simulation.value.logs?.join('\n')}`);
      }
    } catch (simError) {
      console.error('Simulation error:', simError);
      // Continue anyway to see wallet error
    }

    const signature = await this.wallet.sendTransaction(tx, this.connection, {
      skipPreflight: true, // We already simulated
    });
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    return {
      ticketId,
      signature,
      amount: amountLamports,
      zcashAddress,
      status: 'initiated',
    };
  }

  async initiateWithdrawal(amount, zcashTxId, proof) {
    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    const { pda: bridgeStatePda } = deriveBridgeStatePDA();
    const bridgeState = await this.program.account.bridgeState.fetch(bridgeStatePda);
    const ticketId = bridgeState.withdrawalCounter.toNumber();

    const { pda: withdrawalTicketPda } = deriveWithdrawalTicketPDA(ticketId);

    const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

    if (!zcashTxId || zcashTxId.length !== 64) {
      throw new Error('Valid Zcash transaction ID (64 hex characters) is required');
    }

    if (!proof || !proof.proofData || !proof.commitment || !proof.nullifier) {
      throw new Error('Valid ZK proof with proofData, commitment, and nullifier is required');
    }

    const zcashTxIdBytes = Buffer.from(zcashTxId, 'hex');
    if (zcashTxIdBytes.length !== 32) {
      throw new Error('Zcash transaction ID must decode to 32 bytes');
    }

    const accounts = {
      bridgeState: bridgeStatePda,
      withdrawalTicket: withdrawalTicketPda,
      user: this.wallet.publicKey,
      systemProgram: SystemProgram.programId,
    };

    let tx = await this.program.methods
      .initiateWithdrawal(
        new BN(amountLamports),
        Array.from(zcashTxIdBytes),
        proof
      )
      .accounts(accounts)
      .transaction();

    if (this.heliusClient) {
      const result = await this.heliusClient.addPriorityFee(tx, { accountKeys: [this.wallet.publicKey.toBase58()] });
      tx = result.transaction;
    }

    const signature = await this.wallet.sendTransaction(tx, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    return {
      ticketId,
      signature,
      amount: amountLamports,
      status: 'initiated',
    };
  }

  async registerStealthMetaAddress(spendingPubKey, viewingPubKey) {
    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    let spending = spendingPubKey;
    let viewing = viewingPubKey;

    if (!spending || !viewing) {
      const metaAddress = generateStealthMetaAddress();
      spending = Buffer.from(metaAddress.spendingPublicKey, 'hex');
      viewing = Buffer.from(metaAddress.viewingPublicKey, 'hex');

      return {
        ...await this._registerMetaAddress(spending, viewing),
        metaAddress,
      };
    }

    return this._registerMetaAddress(spending, viewing);
  }

  async _registerMetaAddress(spendingPubKey, viewingPubKey) {
    const { pda: metaAddressPda } = deriveStealthMetaAddressPDA(this.wallet.publicKey.toBase58());

    const spendingBytes = Buffer.alloc(33);
    const viewingBytes = Buffer.alloc(33);

    if (Buffer.isBuffer(spendingPubKey)) {
      spendingPubKey.copy(spendingBytes);
    } else {
      Buffer.from(spendingPubKey, 'hex').copy(spendingBytes);
    }

    if (Buffer.isBuffer(viewingPubKey)) {
      viewingPubKey.copy(viewingBytes);
    } else {
      Buffer.from(viewingPubKey, 'hex').copy(viewingBytes);
    }

    let tx = await this.program.methods
      .registerStealthMetaAddress(
        Array.from(spendingBytes),
        Array.from(viewingBytes)
      )
      .accounts({
        metaAddress: metaAddressPda,
        user: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    if (this.heliusClient) {
      const result = await this.heliusClient.addPriorityFee(tx, { accountKeys: [this.wallet.publicKey.toBase58()] });
      tx = result.transaction;
    }

    const signature = await this.wallet.sendTransaction(tx, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    return {
      signature,
      metaAddressPda: metaAddressPda.toBase58(),
    };
  }

  async sendStealthPayment(recipientMetaAddress, amount, tokenMint = null) {
    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    const { stealthAddress, ephemeralPublicKey, viewTag } = generateStealthAddress(recipientMetaAddress);

    const stealthPubkey = new PublicKey(stealthAddress);
    const { pda: stealthPaymentPda } = deriveStealthPaymentPDA(stealthAddress);

    const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

    const ephemeralBytes = Buffer.alloc(33);
    Buffer.from(ephemeralPublicKey, 'hex').copy(ephemeralBytes);

    const viewTagByte = parseInt(viewTag, 16);

    const accounts = {
      stealthPayment: stealthPaymentPda,
      sender: this.wallet.publicKey,
      stealthAddress: stealthPubkey,
      systemProgram: SystemProgram.programId,
    };

    if (tokenMint) {
      const mintPubkey = new PublicKey(tokenMint);
      const senderTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        this.wallet.publicKey
      );
      const stealthTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        stealthPubkey,
        true
      );

      accounts.senderTokenAccount = senderTokenAccount;
      accounts.stealthTokenAccount = stealthTokenAccount;
      accounts.tokenMint = mintPubkey;
      accounts.tokenProgram = TOKEN_PROGRAM_ID;
    }

    let tx = await this.program.methods
      .sendToStealth(
        new BN(amountLamports),
        Array.from(ephemeralBytes),
        viewTagByte
      )
      .accounts(accounts)
      .transaction();

    if (this.heliusClient) {
      const result = await this.heliusClient.addPriorityFee(tx, { accountKeys: [this.wallet.publicKey.toBase58()] });
      tx = result.transaction;
    }

    const signature = await this.wallet.sendTransaction(tx, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    return {
      signature,
      stealthAddress,
      ephemeralPublicKey,
      viewTag,
      amount: amountLamports,
    };
  }

  async claimStealthPayment(stealthAddress, stealthPrivateKey) {
    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    const stealthPubkey = new PublicKey(stealthAddress);
    const { pda: stealthPaymentPda } = deriveStealthPaymentPDA(stealthAddress);

    let tx = await this.program.methods
      .claimFromStealth()
      .accounts({
        stealthPayment: stealthPaymentPda,
        stealthAddress: stealthPubkey,
        recipient: this.wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .transaction();

    if (this.heliusClient) {
      tx = await this.heliusClient.addPriorityFee(tx, this.wallet.publicKey.toBase58());
    }

    const signature = await this.wallet.sendTransaction(tx, this.connection);
    await this.connection.confirmTransaction(signature, 'confirmed');

    return {
      signature,
      stealthAddress,
    };
  }

  async getDepositStatus(ticketId) {
    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    const { pda: depositTicketPda } = deriveDepositTicketPDA(ticketId);

    try {
      const ticket = await this.program.account.depositTicket.fetch(depositTicketPda);
      return {
        ticketId,
        depositor: ticket.depositor.toBase58(),
        amount: ticket.amount.toNumber(),
        zcashAddress: Buffer.from(ticket.zcashAddress).toString().replace(/\0/g, ''),
        status: Object.keys(ticket.status)[0],
        createdAt: ticket.createdAt.toNumber(),
        zcashTxId: ticket.zcashTxId ? Buffer.from(ticket.zcashTxId).toString('hex') : null,
      };
    } catch (error) {
      return null;
    }
  }

  async getWithdrawalStatus(ticketId) {
    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    const { pda: withdrawalTicketPda } = deriveWithdrawalTicketPDA(ticketId);

    try {
      const ticket = await this.program.account.withdrawalTicket.fetch(withdrawalTicketPda);
      return {
        ticketId,
        recipient: ticket.recipient.toBase58(),
        amount: ticket.amount.toNumber(),
        status: Object.keys(ticket.status)[0],
        createdAt: ticket.createdAt.toNumber(),
        nullifier: Buffer.from(ticket.nullifier).toString('hex'),
      };
    } catch (error) {
      return null;
    }
  }

  async getBridgeStats() {
    if (!this.bridgeState) {
      await this.loadBridgeState();
    }

    if (!this.bridgeState) {
      return null;
    }

    return {
      totalDeposits: this.bridgeState.totalDeposits.toNumber(),
      totalWithdrawals: this.bridgeState.totalWithdrawals.toNumber(),
      depositCounter: this.bridgeState.depositCounter.toNumber(),
      withdrawalCounter: this.bridgeState.withdrawalCounter.toNumber(),
      isPaused: this.bridgeState.isPaused,
      feeBps: this.bridgeState.feeBps,
    };
  }

  async getUserMetaAddress(userAddress = null) {
    if (!this.program) {
      throw new Error('Bridge program not initialized');
    }

    const owner = userAddress || this.wallet.publicKey.toBase58();
    const { pda: metaAddressPda } = deriveStealthMetaAddressPDA(owner);

    try {
      const metaAddress = await this.program.account.stealthMetaAddress.fetch(metaAddressPda);
      return {
        owner: metaAddress.owner.toBase58(),
        spendingPubKey: Buffer.from(metaAddress.spendingPubKey).toString('hex'),
        viewingPubKey: Buffer.from(metaAddress.viewingPubKey).toString('hex'),
        createdAt: metaAddress.createdAt.toNumber(),
      };
    } catch (error) {
      return null;
    }
  }

  async getTransactionHistory(limit = 20) {
    if (!this.heliusClient) {
      throw new Error('Helius client not configured');
    }

    const address = this.wallet.publicKey.toBase58();
    return this.heliusClient.getTransactionHistory(address, limit);
  }

  async estimatePriorityFee() {
    if (!this.heliusClient) {
      return { low: 1000, medium: 5000, high: 10000 };
    }

    const { pda: bridgeStatePda } = deriveBridgeStatePDA();
    return this.heliusClient.getPriorityFeeEstimate({
      accountKeys: [
        this.wallet.publicKey.toBase58(),
        bridgeStatePda.toBase58(),
      ],
    });
  }

  /**
   * Mint test wZEC tokens to the connected wallet (DEVNET ONLY)
   * This uses a hardcoded mint authority for testing purposes
   */
  async mintTestTokens(amount = 100) {
    const { Keypair } = await import('@solana/web3.js');
    const { mintTo, getAccount, createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, ASSOCIATED_TOKEN_PROGRAM_ID } = await import('@solana/spl-token');

    // Devnet mint authority keypair (ONLY FOR TESTING - DO NOT USE IN PRODUCTION)
    // This is the keypair that was used to create the wrapped ZEC mint
    const DEVNET_MINT_AUTHORITY = [47, 242, 250, 115, 160, 152, 84, 22, 48, 71, 197, 188, 150, 69, 150, 52, 57, 204, 208, 133, 228, 16, 138, 82, 60, 100, 244, 118, 47, 204, 79, 136, 160, 17, 176, 56, 34, 129, 206, 94, 30, 81, 112, 214, 195, 243, 111, 230, 68, 204, 251, 23, 86, 180, 41, 150, 243, 150, 248, 240, 254, 70, 41, 13];

    const wrappedZecMintStr = import.meta.env.VITE_WRAPPED_ZEC_MINT;
    if (!wrappedZecMintStr) {
      throw new Error('VITE_WRAPPED_ZEC_MINT not configured');
    }

    const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(DEVNET_MINT_AUTHORITY));
    const mintPubkey = new PublicKey(wrappedZecMintStr);
    const recipientPubkey = this.wallet.publicKey;

    // Get or create ATA for recipient
    const recipientATA = await getAssociatedTokenAddress(
      mintPubkey,
      recipientPubkey
    );

    // Check if ATA exists
    let needsATA = false;
    try {
      await getAccount(this.connection, recipientATA);
    } catch (e) {
      needsATA = true;
    }

    // Build transaction
    const tx = new Transaction();

    if (needsATA) {
      tx.add(
        createAssociatedTokenAccountInstruction(
          this.wallet.publicKey, // payer
          recipientATA,
          recipientPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        )
      );
    }

    // Add mint instruction
    const { createMintToInstruction } = await import('@solana/spl-token');
    const mintAmount = BigInt(amount) * BigInt(10 ** 8); // 8 decimals
    tx.add(
      createMintToInstruction(
        mintPubkey,
        recipientATA,
        mintAuthority.publicKey,
        mintAmount
      )
    );

    // Set blockhash and fee payer
    const { blockhash, lastValidBlockHeight } = await this.connection.getLatestBlockhash('confirmed');
    tx.recentBlockhash = blockhash;
    tx.feePayer = this.wallet.publicKey;

    // Partially sign with mint authority
    tx.partialSign(mintAuthority);

    // Send via wallet
    const signature = await this.wallet.sendTransaction(tx, this.connection);
    await this.connection.confirmTransaction({ signature, blockhash, lastValidBlockHeight }, 'confirmed');

    // Get new balance
    const balance = await this.connection.getTokenAccountBalance(recipientATA);

    return {
      signature,
      amount,
      balance: balance.value.uiAmount,
      tokenAccount: recipientATA.toBase58(),
    };
  }
}
