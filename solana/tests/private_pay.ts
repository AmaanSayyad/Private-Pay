import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";
import { randomBytes } from "crypto";
import {
  awaitComputationFinalization,
  getArciumEnv,
  getCompDefAccOffset,
  getArciumAccountBaseSeed,
  getArciumProgramId,
  buildFinalizeCompDefTx,
  RescueCipher,
  deserializeLE,
  getMXEAccAddress,
  getMempoolAccAddress,
  getCompDefAccAddress,
  getExecutingPoolAccAddress,
  x25519,
  getComputationAccAddress,
  getMXEPublicKey,
  getClusterAccAddress,
} from "@arcium-hq/client";
import * as fs from "fs";
import * as os from "os";
import { expect } from "chai";

// Type will be generated after arcium build
// import { PrivatePay } from "../target/types/private_pay";

/**
 * Gets the cluster account address using the cluster offset from environment.
 */
function getClusterAccount(): PublicKey {
  const arciumEnv = getArciumEnv();
  return getClusterAccAddress(arciumEnv.arciumClusterOffset);
}

/**
 * Helper function to get MXE public key with retry logic
 */
async function getMXEPublicKeyWithRetry(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  maxRetries: number = 20,
  retryDelayMs: number = 500
): Promise<Uint8Array> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const mxePublicKey = await getMXEPublicKey(provider, programId);
      if (mxePublicKey) {
        return mxePublicKey;
      }
    } catch (error) {
      console.log(`Attempt ${attempt} failed to fetch MXE public key:`, error);
    }

    if (attempt < maxRetries) {
      console.log(
        `Retrying in ${retryDelayMs}ms... (attempt ${attempt}/${maxRetries})`
      );
      await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
    }
  }

  throw new Error(
    `Failed to fetch MXE public key after ${maxRetries} attempts`
  );
}

/**
 * Helper to read keypair from JSON file
 */
function readKpJson(path: string): anchor.web3.Keypair {
  const file = fs.readFileSync(path);
  return anchor.web3.Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(file.toString()))
  );
}

describe("Private Pay - Arcium Integration Tests", () => {
  // Configure the client to use the devnet cluster
  anchor.setProvider(anchor.AnchorProvider.env());
  
  // Note: Program type will be available after running `arcium build`
  const program = anchor.workspace.PrivatePay;
  const provider = anchor.getProvider();
  const arciumEnv = getArciumEnv();

  // Event listener helper
  type Event = anchor.IdlEvents<typeof program["idl"]>;
  const awaitEvent = async <E extends keyof Event>(
    eventName: E
  ): Promise<Event[E]> => {
    let listenerId: number;
    const event = await new Promise<Event[E]>((res) => {
      listenerId = program.addEventListener(eventName, (event: any) => {
        res(event);
      });
    });
    await program.removeEventListener(listenerId);
    return event;
  };

  const clusterAccount = getClusterAccount();

  describe("Private Payments", () => {
    it("should initialize balance computation definition", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

      const baseSeedCompDefAcc = getArciumAccountBaseSeed(
        "ComputationDefinitionAccount"
      );
      const offset = getCompDefAccOffset("init_balance");

      const compDefPDA = PublicKey.findProgramAddressSync(
        [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
        getArciumProgramId()
      )[0];

      console.log("Init balance computation definition PDA:", compDefPDA.toBase58());

      const sig = await program.methods
        .initBalanceCompDef()
        .accounts({
          compDefAccount: compDefPDA,
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
        })
        .signers([owner])
        .rpc();

      console.log("Init balance comp def signature:", sig);

      // Finalize the computation definition
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
      console.log("Balance comp def finalized");
    });

    it("should create a private balance account", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
      
      const mxePublicKey = await getMXEPublicKeyWithRetry(
        provider as anchor.AnchorProvider,
        program.programId
      );
      console.log("MXE x25519 pubkey:", mxePublicKey);

      const nonce = randomBytes(16);
      const computationOffset = new anchor.BN(randomBytes(8), "hex");

      const [balanceAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance"), owner.publicKey.toBuffer()],
        program.programId
      );

      console.log("Creating balance account:", balanceAccount.toBase58());

      const sig = await program.methods
        .createBalanceAccount(
          computationOffset,
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("init_balance")).readUInt32LE()
          ),
          balanceAccount: balanceAccount,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Create balance account signature:", sig);

      // Wait for computation finalization
      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Balance account finalized:", finalizeSig);
    });

    it("should deposit funds to private balance", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
      const depositAmount = 1000000; // 1 token (6 decimals)

      const [balanceAccount] = PublicKey.findProgramAddressSync(
        [Buffer.from("balance"), owner.publicKey.toBuffer()],
        program.programId
      );

      const computationOffset = new anchor.BN(randomBytes(8), "hex");

      console.log("Depositing", depositAmount, "to balance account");

      const sig = await program.methods
        .depositFunds(computationOffset, new anchor.BN(depositAmount))
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("deposit")).readUInt32LE()
          ),
          balanceAccount: balanceAccount,
          owner: owner.publicKey,
        })
        .signers([owner])
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Deposit signature:", sig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Deposit finalized:", finalizeSig);
    });
  });

  describe("Private Swap", () => {
    it("should initialize swap computation definition", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

      const baseSeedCompDefAcc = getArciumAccountBaseSeed(
        "ComputationDefinitionAccount"
      );
      const offset = getCompDefAccOffset("execute_swap");

      const compDefPDA = PublicKey.findProgramAddressSync(
        [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
        getArciumProgramId()
      )[0];

      console.log("Swap computation definition PDA:", compDefPDA.toBase58());

      const sig = await program.methods
        .initSwapCompDef()
        .accounts({
          compDefAccount: compDefPDA,
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
        })
        .signers([owner])
        .rpc();

      console.log("Init swap comp def signature:", sig);

      // Finalize
      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
      console.log("Swap comp def finalized");
    });

    it("should create a liquidity pool", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
      
      const tokenA = 1; // SOL identifier
      const tokenB = 2; // USDC identifier
      const nonce = randomBytes(16);
      const computationOffset = new anchor.BN(randomBytes(8), "hex");

      const [poolAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pool"),
          new anchor.BN(tokenA).toArrayLike(Buffer, "le", 8),
          new anchor.BN(tokenB).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      console.log("Creating pool account:", poolAccount.toBase58());

      const sig = await program.methods
        .createPool(
          computationOffset,
          new anchor.BN(tokenA),
          new anchor.BN(tokenB),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("init_pool")).readUInt32LE()
          ),
          poolAccountData: poolAccount,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Create pool signature:", sig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Pool creation finalized:", finalizeSig);
    });

    it("should execute a private swap", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
      
      const mxePublicKey = await getMXEPublicKeyWithRetry(
        provider as anchor.AnchorProvider,
        program.programId
      );

      const privateKey = x25519.utils.randomSecretKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);

      // Encrypt swap amounts
      const inputAmount = BigInt(1000000); // 1 token
      const minOutput = BigInt(900000); // 0.9 token (10% slippage)
      const plaintext = [inputAmount, minOutput];
      const nonce = randomBytes(16);
      const ciphertexts = cipher.encrypt(plaintext, nonce);

      const tokenIn = 1; // SOL
      const tokenOut = 2; // USDC
      const computationOffset = new anchor.BN(randomBytes(8), "hex");

      const [poolAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("pool"),
          new anchor.BN(tokenIn).toArrayLike(Buffer, "le", 8),
          new anchor.BN(tokenOut).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      console.log("Executing private swap on pool:", poolAccount.toBase58());

      const sig = await program.methods
        .executeSwap(
          computationOffset,
          Array.from(ciphertexts[0]),
          Array.from(ciphertexts[1]),
          new anchor.BN(tokenIn),
          new anchor.BN(tokenOut),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("execute_swap")).readUInt32LE()
          ),
          poolAccount: poolAccount,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Swap signature:", sig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Swap finalized:", finalizeSig);
    });
  });

  describe("Dark Pool", () => {
    it("should initialize order book computation definition", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);

      const baseSeedCompDefAcc = getArciumAccountBaseSeed(
        "ComputationDefinitionAccount"
      );
      const offset = getCompDefAccOffset("init_order_book");

      const compDefPDA = PublicKey.findProgramAddressSync(
        [baseSeedCompDefAcc, program.programId.toBuffer(), offset],
        getArciumProgramId()
      )[0];

      console.log("Order book comp def PDA:", compDefPDA.toBase58());

      const sig = await program.methods
        .initOrderBookCompDef()
        .accounts({
          compDefAccount: compDefPDA,
          payer: owner.publicKey,
          mxeAccount: getMXEAccAddress(program.programId),
        })
        .signers([owner])
        .rpc();

      console.log("Init order book comp def signature:", sig);

      const finalizeTx = await buildFinalizeCompDefTx(
        provider as anchor.AnchorProvider,
        Buffer.from(offset).readUInt32LE(),
        program.programId
      );

      const latestBlockhash = await provider.connection.getLatestBlockhash();
      finalizeTx.recentBlockhash = latestBlockhash.blockhash;
      finalizeTx.lastValidBlockHeight = latestBlockhash.lastValidBlockHeight;
      finalizeTx.sign(owner);

      await provider.sendAndConfirm(finalizeTx);
      console.log("Order book comp def finalized");
    });

    it("should create a dark pool order book", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
      
      const token = 1; // SOL
      const quoteToken = 2; // USDC
      const nonce = randomBytes(16);
      const computationOffset = new anchor.BN(randomBytes(8), "hex");

      const [orderBookAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("orderbook"),
          new anchor.BN(token).toArrayLike(Buffer, "le", 8),
          new anchor.BN(quoteToken).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      console.log("Creating order book:", orderBookAccount.toBase58());

      const sig = await program.methods
        .createOrderBook(
          computationOffset,
          new anchor.BN(token),
          new anchor.BN(quoteToken),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("init_order_book")).readUInt32LE()
          ),
          orderBookAccount: orderBookAccount,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Create order book signature:", sig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Order book creation finalized:", finalizeSig);
    });

    it("should place a hidden order", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
      
      const mxePublicKey = await getMXEPublicKeyWithRetry(
        provider as anchor.AnchorProvider,
        program.programId
      );

      const privateKey = x25519.utils.randomSecretKey();
      const publicKey = x25519.getPublicKey(privateKey);
      const sharedSecret = x25519.getSharedSecret(privateKey, mxePublicKey);
      const cipher = new RescueCipher(sharedSecret);

      // Encrypt order details
      const size = BigInt(10); // 10 tokens
      const price = BigInt(18000); // $180.00
      const isBid = BigInt(1); // Buy order
      const ownerId = BigInt("0x" + owner.publicKey.toBuffer().slice(0, 16).toString("hex"));

      const nonce = randomBytes(16);
      const sizeCiphertext = cipher.encrypt([size], nonce);
      const priceCiphertext = cipher.encrypt([price], randomBytes(16));
      const isBidCiphertext = cipher.encrypt([isBid], randomBytes(16));
      const ownerCiphertext = cipher.encrypt([ownerId], randomBytes(16));

      const token = 1; // SOL
      const quoteToken = 2; // USDC
      const computationOffset = new anchor.BN(randomBytes(8), "hex");

      const [orderBookAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("orderbook"),
          new anchor.BN(token).toArrayLike(Buffer, "le", 8),
          new anchor.BN(quoteToken).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      console.log("Placing hidden order in dark pool");

      const sig = await program.methods
        .placeOrder(
          computationOffset,
          Array.from(sizeCiphertext[0]),
          Array.from(priceCiphertext[0]),
          Array.from(isBidCiphertext[0]),
          Array.from(ownerCiphertext[0]),
          Array.from(publicKey),
          new anchor.BN(deserializeLE(nonce).toString())
        )
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("add_order")).readUInt32LE()
          ),
          orderBookAccount: orderBookAccount,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Place order signature:", sig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Order placement finalized:", finalizeSig);
    });

    it("should trigger order matching", async () => {
      const owner = readKpJson(`${os.homedir()}/.config/solana/id.json`);
      
      const token = 1;
      const quoteToken = 2;
      const computationOffset = new anchor.BN(randomBytes(8), "hex");

      const [orderBookAccount] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("orderbook"),
          new anchor.BN(token).toArrayLike(Buffer, "le", 8),
          new anchor.BN(quoteToken).toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      console.log("Triggering order matching");

      const sig = await program.methods
        .matchOrders(computationOffset)
        .accountsPartial({
          computationAccount: getComputationAccAddress(
            arciumEnv.arciumClusterOffset,
            computationOffset
          ),
          clusterAccount: clusterAccount,
          mxeAccount: getMXEAccAddress(program.programId),
          mempoolAccount: getMempoolAccAddress(arciumEnv.arciumClusterOffset),
          executingPool: getExecutingPoolAccAddress(arciumEnv.arciumClusterOffset),
          compDefAccount: getCompDefAccAddress(
            program.programId,
            Buffer.from(getCompDefAccOffset("match_orders")).readUInt32LE()
          ),
          orderBookAccount: orderBookAccount,
        })
        .rpc({ skipPreflight: true, commitment: "confirmed" });

      console.log("Match orders signature:", sig);

      const finalizeSig = await awaitComputationFinalization(
        provider as anchor.AnchorProvider,
        computationOffset,
        program.programId,
        "confirmed"
      );
      console.log("Order matching finalized:", finalizeSig);
    });
  });
});








