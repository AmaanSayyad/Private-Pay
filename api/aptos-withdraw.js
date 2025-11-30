import { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } from "@aptos-labs/ts-sdk";
import { createClient } from '@supabase/supabase-js';

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  // Get environment variables
  const supabaseUrl = process.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
  const treasuryPrivateKey = process.env.TREASURY_PRIVATE_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return res.status(500).json({ message: 'Supabase configuration missing' });
  }

  if (!treasuryPrivateKey) {
    return res.status(500).json({ message: 'Treasury configuration missing' });
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    db: { schema: 'public' },
    auth: { persistSession: false }
  });

  // Initialize Aptos client
  const getAptosClient = (isTestnet = true) => {
    const config = new AptosConfig({
      network: isTestnet ? Network.TESTNET : Network.MAINNET,
    });
    return new Aptos(config);
  };

  try {
    const { username, amount, destinationAddress } = req.body;

    if (!username || !amount || !destinationAddress) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    if (!treasuryPrivateKey) {
      return res.status(500).json({ message: 'Treasury configuration error' });
    }

    // Get user balance from Supabase
    const { data: balanceData, error: balanceError } = await supabase
      .from('balances')
      .select('available_balance')
      .eq('username', username)
      .single();

    if (balanceError || !balanceData) {
      return res.status(404).json({ message: 'User balance not found' });
    }

    if (balanceData.available_balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    // Initialize Aptos client and treasury account
    const aptos = getAptosClient(true); // testnet için true
    const privateKey = new Ed25519PrivateKey(treasuryPrivateKey);
    const treasuryAccount = Account.fromPrivateKey({ privateKey });

    // Check treasury balance
    const treasuryBalance = await aptos.getAccountAPTAmount({
      accountAddress: treasuryAccount.accountAddress.toString()
    });
    const treasuryBalanceInAPT = treasuryBalance / 100_000_000;

    if (treasuryBalanceInAPT < amount) {
      return res.status(500).json({ message: 'Treasury has insufficient funds' });
    }

    // Convert amount to octas (1 APT = 100000000 octas)
    const amountInOctas = Math.floor(amount * 100_000_000);

    // Build and submit transaction
    const transaction = await aptos.transaction.build.simple({
      sender: treasuryAccount.accountAddress,
      data: {
        function: "0x1::coin::transfer",
        typeArguments: ["0x1::aptos_coin::AptosCoin"],
        functionArguments: [destinationAddress, amountInOctas],
      },
    });

    // Sign and submit transaction
    const committedTxn = await aptos.signAndSubmitTransaction({
      signer: treasuryAccount,
      transaction,
    });

    // Wait for transaction to complete
    const executedTxn = await aptos.waitForTransaction({
      transactionHash: committedTxn.hash,
    });

    if (!executedTxn.success) {
      throw new Error('Transaction failed on blockchain');
    }

    // Update Supabase balance
    const newBalance = balanceData.available_balance - amount;

    // Record withdrawal in payments table
    await supabase
      .from('payments')
      .insert([{
        sender_address: 'treasury',
        recipient_username: username,
        amount: -amount,
        tx_hash: committedTxn.hash,
        status: 'withdrawn'
      }]);

    // Update balance
    await supabase
      .from('balances')
      .update({ 
        available_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('username', username);

    return res.status(200).json({
      success: true,
      txHash: committedTxn.hash,
      newBalance,
      explorerUrl: `https://explorer.aptoslabs.com/txn/${committedTxn.hash}?network=testnet`
    });

  } catch (error) {
    console.error('Withdrawal error:', error);
    return res.status(500).json({ 
      message: error.message || 'Withdrawal failed',
      error: error.toString()
    });
  }
}
