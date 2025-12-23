// Initialize the Zcash Bridge on Solana Devnet
// Run with: node solana/init_bridge.cjs

const { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, SystemProgram, SYSVAR_RENT_PUBKEY } = require('@solana/web3.js');
const anchor = require('@coral-xyz/anchor');
const { TOKEN_PROGRAM_ID, createMint } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

const { Program, AnchorProvider } = anchor;
const BN = anchor.BN;

// Configuration
const RPC_URL = 'https://api.devnet.solana.com';
const PROGRAM_ID = 'HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5';

// Minimal IDL for initialization
const IDL = {
    version: "0.1.0",
    name: "zcash_bridge",
    address: PROGRAM_ID,
    instructions: [
        {
            name: "initialize",
            accounts: [
                { name: "bridgeState", isMut: true, isSigner: false },
                { name: "authority", isMut: true, isSigner: true },
                { name: "wrappedZecMint", isMut: false, isSigner: false },
                { name: "vault", isMut: true, isSigner: false },
                { name: "systemProgram", isMut: false, isSigner: false },
                { name: "tokenProgram", isMut: false, isSigner: false },
                { name: "rent", isMut: false, isSigner: false }
            ],
            args: [
                {
                    name: "config",
                    type: {
                        defined: "BridgeConfig"
                    }
                }
            ]
        }
    ],
    accounts: [
        {
            name: "BridgeState",
            type: {
                kind: "struct",
                fields: [
                    { name: "authority", type: "publicKey" },
                    { name: "operator", type: "publicKey" },
                    { name: "wrappedZecMint", type: "publicKey" },
                    { name: "vault", type: "publicKey" },
                    { name: "depositNonce", type: "u64" },
                    { name: "withdrawalNonce", type: "u64" },
                    { name: "totalDeposited", type: "u64" },
                    { name: "totalWithdrawn", type: "u64" },
                    { name: "isPaused", type: "bool" },
                    { name: "minDeposit", type: "u64" },
                    { name: "maxDeposit", type: "u64" },
                    { name: "protocolFeeBps", type: "u16" },
                    { name: "bump", type: "u8" }
                ]
            }
        }
    ],
    types: [
        {
            name: "BridgeConfig",
            type: {
                kind: "struct",
                fields: [
                    { name: "operator", type: "publicKey" },
                    { name: "minDeposit", type: "u64" },
                    { name: "maxDeposit", type: "u64" },
                    { name: "protocolFeeBps", type: "u16" }
                ]
            }
        }
    ]
};

async function main() {
    console.log('================================================');
    console.log('  Initializing Zcash Bridge on Solana Devnet');
    console.log('================================================\n');

    // Load wallet keypair
    const keypairPath = path.join(__dirname, 'keypair.json');

    if (!fs.existsSync(keypairPath)) {
        console.error('❌ Keypair not found at:', keypairPath);
        console.log('Run: wsl cat /home/enliven/.config/solana/id.json > solana/keypair.json');
        process.exit(1);
    }

    const walletData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const walletKeypair = Keypair.fromSecretKey(Uint8Array.from(walletData));
    console.log('Wallet address:', walletKeypair.publicKey.toBase58());

    // Connect to Solana
    const connection = new Connection(RPC_URL, 'confirmed');

    // Check balance
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL\n');

    if (balance < 0.1 * LAMPORTS_PER_SOL) {
        console.log('⚠️  Low balance, requesting airdrop...');
        try {
            const sig = await connection.requestAirdrop(walletKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig);
            console.log('✅ Airdrop successful\n');
        } catch (e) {
            console.warn('Airdrop failed:', e.message);
        }
    }

    // Create provider
    const wallet = {
        publicKey: walletKeypair.publicKey,
        signTransaction: async (tx) => {
            tx.partialSign(walletKeypair);
            return tx;
        },
        signAllTransactions: async (txs) => {
            txs.forEach(tx => tx.partialSign(walletKeypair));
            return txs;
        },
    };

    const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
    });

    const programId = new PublicKey(PROGRAM_ID);
    console.log('Program ID:', programId.toBase58());

    // Check if program exists
    const programAccount = await connection.getAccountInfo(programId);
    if (!programAccount) {
        console.error('❌ Program not deployed at:', programId.toBase58());
        process.exit(1);
    }
    console.log('✅ Program found on-chain\n');

    // Create the program instance
    const program = new Program(IDL, programId, provider);

    // Derive PDAs
    const [bridgeStatePda, bridgeBump] = PublicKey.findProgramAddressSync(
        [Buffer.from('bridge')],
        programId
    );
    console.log('Bridge State PDA:', bridgeStatePda.toBase58());

    const [vaultPda, vaultBump] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault')],
        programId
    );
    console.log('Vault PDA:', vaultPda.toBase58());

    // Check if bridge is already initialized
    try {
        const existingState = await program.account.bridgeState.fetch(bridgeStatePda);
        console.log('\n✅ Bridge already initialized!');
        console.log('  Authority:', existingState.authority.toBase58());
        console.log('  Operator:', existingState.operator.toBase58());
        console.log('  Wrapped ZEC Mint:', existingState.wrappedZecMint.toBase58());
        console.log('  Is Paused:', existingState.isPaused);
        return;
    } catch (e) {
        console.log('\nBridge not initialized yet, proceeding...\n');
    }

    // Create wrapped ZEC mint
    console.log('Creating wrapped ZEC mint...');
    const wrappedZecMint = await createMint(
        connection,
        walletKeypair,
        walletKeypair.publicKey, // mint authority
        walletKeypair.publicKey, // freeze authority
        8 // decimals (same as ZEC)
    );
    console.log('Wrapped ZEC Mint:', wrappedZecMint.toBase58());

    // Initialize bridge
    console.log('\nInitializing bridge...');

    const config = {
        operator: walletKeypair.publicKey,
        minDeposit: new BN(10000), // 0.00001 SOL minimum
        maxDeposit: new BN(1000 * LAMPORTS_PER_SOL), // 1000 SOL maximum
        protocolFeeBps: 30, // 0.3% fee
    };

    try {
        const tx = await program.methods
            .initialize(config)
            .accounts({
                bridgeState: bridgeStatePda,
                authority: walletKeypair.publicKey,
                wrappedZecMint: wrappedZecMint,
                vault: vaultPda,
                systemProgram: SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: SYSVAR_RENT_PUBKEY,
            })
            .signers([walletKeypair])
            .rpc();

        console.log('✅ Bridge initialized!');
        console.log('Transaction:', tx);

        // Verify initialization
        const state = await program.account.bridgeState.fetch(bridgeStatePda);
        console.log('\nBridge State:');
        console.log('  Authority:', state.authority.toBase58());
        console.log('  Operator:', state.operator.toBase58());
        console.log('  Wrapped ZEC Mint:', state.wrappedZecMint.toBase58());
        console.log('  Vault:', state.vault.toBase58());

    } catch (error) {
        console.error('❌ Failed to initialize bridge:', error);
        process.exit(1);
    }

    console.log('\n================================================');
    console.log('  🎉 Bridge Successfully Initialized!');
    console.log('================================================');
    console.log('\nAdd to your .env file:');
    console.log(`VITE_WRAPPED_ZEC_MINT=${wrappedZecMint.toBase58()}`);
}

main().catch(console.error);
