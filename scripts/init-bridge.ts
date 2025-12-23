/**
 * Initialize the Zcash Bridge on Solana Devnet
 * 
 * This script initializes the bridge state account on-chain.
 * Run this after deploying the program.
 * 
 * Usage: npx ts-node scripts/init-bridge.ts
 */

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, BN, web3 } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, createMint, getOrCreateAssociatedTokenAccount } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Configuration
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = process.env.VITE_ZCASH_BRIDGE_PROGRAM_ID || 'HgwLh6yHgCNeYckHkspupFsxTu7jXzYv4nYPZAdAkQh5';

// Load IDL
const idlPath = path.join(__dirname, '../solana/target/idl/zcash_bridge.json');

async function main() {
    console.log('================================================');
    console.log('  Initializing Zcash Bridge on Solana Devnet');
    console.log('================================================\n');

    // Load wallet keypair
    const walletPath = process.env.WALLET_PATH || path.join(require('os').homedir(), '.config/solana/id.json');

    if (!fs.existsSync(walletPath)) {
        console.error('❌ Wallet not found at:', walletPath);
        console.log('Run: solana-keygen new');
        process.exit(1);
    }

    const walletKeypair = Keypair.fromSecretKey(
        Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf-8')))
    );

    console.log('Wallet:', walletKeypair.publicKey.toBase58());

    // Connect to Solana
    const connection = new Connection(RPC_URL, 'confirmed');

    // Check balance
    const balance = await connection.getBalance(walletKeypair.publicKey);
    console.log('Balance:', balance / LAMPORTS_PER_SOL, 'SOL');

    if (balance < 0.5 * LAMPORTS_PER_SOL) {
        console.log('⚠️  Low balance, requesting airdrop...');
        try {
            const sig = await connection.requestAirdrop(walletKeypair.publicKey, 2 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig);
            console.log('✅ Airdrop successful');
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

    const provider = new AnchorProvider(connection, wallet as any, {
        commitment: 'confirmed',
    });

    // Load program
    const programId = new PublicKey(PROGRAM_ID);
    console.log('Program ID:', programId.toBase58());

    // Check if program exists
    const programAccount = await connection.getAccountInfo(programId);
    if (!programAccount) {
        console.error('❌ Program not deployed at:', programId.toBase58());
        console.log('Deploy the program first using: wsl bash deploy_zcash_bridge.sh');
        process.exit(1);
    }
    console.log('✅ Program found on-chain');

    // Load IDL
    let idl;
    if (fs.existsSync(idlPath)) {
        idl = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
    } else {
        // Try to fetch from chain
        console.log('IDL not found locally, fetching from chain...');
        idl = await Program.fetchIdl(programId, provider);
        if (!idl) {
            console.error('❌ Could not find IDL');
            process.exit(1);
        }
    }

    const program = new Program(idl, programId, provider);

    // Derive PDAs
    const [bridgeStatePda] = PublicKey.findProgramAddressSync(
        [Buffer.from('bridge')],
        programId
    );
    console.log('Bridge State PDA:', bridgeStatePda.toBase58());

    // Check if bridge is already initialized
    try {
        const existingState = await program.account.bridgeState.fetch(bridgeStatePda);
        console.log('\n✅ Bridge already initialized!');
        console.log('  Authority:', existingState.authority.toBase58());
        console.log('  Operator:', existingState.operator.toBase58());
        console.log('  Total Deposited:', existingState.totalDeposited?.toString() || '0');
        console.log('  Is Paused:', existingState.isPaused);
        return;
    } catch (e) {
        console.log('Bridge not initialized yet, proceeding...');
    }

    // Create wrapped ZEC mint (for testing, we create a new SPL token)
    console.log('\nCreating wrapped ZEC mint...');
    const wrappedZecMint = await createMint(
        connection,
        walletKeypair,
        walletKeypair.publicKey, // mint authority
        walletKeypair.publicKey, // freeze authority
        8 // decimals (same as ZEC)
    );
    console.log('Wrapped ZEC Mint:', wrappedZecMint.toBase58());

    // Derive vault PDA
    const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('vault')],
        programId
    );
    console.log('Vault PDA:', vaultPda.toBase58());

    // Initialize bridge
    console.log('\nInitializing bridge...');

    const config = {
        operator: walletKeypair.publicKey, // Set operator to wallet for testing
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
                systemProgram: web3.SystemProgram.programId,
                tokenProgram: TOKEN_PROGRAM_ID,
                rent: web3.SYSVAR_RENT_PUBKEY,
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
        console.log('  Min Deposit:', state.minDeposit.toString());
        console.log('  Max Deposit:', state.maxDeposit.toString());
        console.log('  Fee BPS:', state.protocolFeeBps);

    } catch (error) {
        console.error('❌ Failed to initialize bridge:', error);
        process.exit(1);
    }

    console.log('\n================================================');
    console.log('  🎉 Bridge Successfully Initialized!');
    console.log('================================================');
    console.log('\nAdd these to your .env file:');
    console.log(`VITE_ZCASH_BRIDGE_PROGRAM_ID=${PROGRAM_ID}`);
    console.log(`VITE_WRAPPED_ZEC_MINT=${wrappedZecMint.toBase58()}`);
}

main().catch(console.error);
