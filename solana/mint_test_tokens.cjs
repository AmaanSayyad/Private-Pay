// Mint wrapped ZEC to a user for testing
// Run with: node solana/mint_test_tokens.cjs <user_address>

const { Connection, Keypair, PublicKey } = require('@solana/web3.js');
const { createAssociatedTokenAccountInstruction, getAssociatedTokenAddress, mintTo, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } = require('@solana/spl-token');
const fs = require('fs');
const path = require('path');

const RPC_URL = 'https://api.devnet.solana.com';
const WRAPPED_ZEC_MINT = '69paVaw5QZ889ztoW5nkf54XcKdfDMDCdPMptjsFFY6d';

async function main() {
    const userAddress = process.argv[2];

    if (!userAddress) {
        console.log('Usage: node solana/mint_test_tokens.cjs <user_wallet_address>');
        console.log('Example: node solana/mint_test_tokens.cjs HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH');
        process.exit(1);
    }

    console.log('================================================');
    console.log('  Mint Test Wrapped ZEC Tokens');
    console.log('================================================\n');

    // Load wallet keypair (we are the mint authority)
    const keypairPath = path.join(__dirname, 'keypair.json');
    const walletData = JSON.parse(fs.readFileSync(keypairPath, 'utf-8'));
    const mintAuthority = Keypair.fromSecretKey(Uint8Array.from(walletData));

    console.log('Mint Authority:', mintAuthority.publicKey.toBase58());
    console.log('Wrapped ZEC Mint:', WRAPPED_ZEC_MINT);
    console.log('Recipient:', userAddress);

    const connection = new Connection(RPC_URL, 'confirmed');
    const mintPubkey = new PublicKey(WRAPPED_ZEC_MINT);
    const recipientPubkey = new PublicKey(userAddress);

    // Get or create associated token account for the recipient
    const recipientATA = await getAssociatedTokenAddress(
        mintPubkey,
        recipientPubkey
    );
    console.log('\nRecipient ATA:', recipientATA.toBase58());

    // Check if ATA exists
    const ataInfo = await connection.getAccountInfo(recipientATA);

    if (!ataInfo) {
        console.log('\nCreating Associated Token Account...');
        const { Transaction } = require('@solana/web3.js');
        const tx = new Transaction().add(
            createAssociatedTokenAccountInstruction(
                mintAuthority.publicKey,
                recipientATA,
                recipientPubkey,
                mintPubkey
            )
        );

        const { blockhash } = await connection.getLatestBlockhash();
        tx.recentBlockhash = blockhash;
        tx.feePayer = mintAuthority.publicKey;

        const sig = await connection.sendTransaction(tx, [mintAuthority]);
        await connection.confirmTransaction(sig);
        console.log('ATA created:', sig);
    } else {
        console.log('ATA already exists');
    }

    // Mint 1000 wrapped ZEC (8 decimals)
    const amount = 1000 * 10 ** 8; // 1000 wZEC

    console.log('\nMinting', amount / 10 ** 8, 'wZEC...');

    const sig = await mintTo(
        connection,
        mintAuthority,
        mintPubkey,
        recipientATA,
        mintAuthority, // mint authority
        amount
    );

    console.log('✅ Minted successfully!');
    console.log('Transaction:', sig);

    // Check balance
    const tokenBalance = await connection.getTokenAccountBalance(recipientATA);
    console.log('\nNew wZEC Balance:', tokenBalance.value.uiAmount, 'wZEC');

    console.log('\n================================================');
    console.log('  Test tokens minted successfully!');
    console.log('================================================');
}

main().catch(console.error);
