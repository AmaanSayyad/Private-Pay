import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validate Supabase configuration
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Supabase configuration missing!', {
    hasUrl: !!supabaseUrl,
    hasKey: !!supabaseAnonKey
  });
}

// Validate that URL doesn't look like an error message
if (supabaseUrl && (supabaseUrl.includes('<') || supabaseUrl.includes('Per anonym'))) {
  console.error('❌ Supabase URL appears to be corrupted HTML:', supabaseUrl.substring(0, 100));
  throw new Error('Supabase URL is corrupted. Please check environment variables.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: { schema: 'public' },
  auth: { persistSession: false },
  global: {
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
    },
  },
});

// Helper function to validate Supabase responses
const validateSupabaseResponse = (data, error, operation) => {
  // Check if data is HTML instead of JSON
  if (data && typeof data === 'string') {
    const trimmedData = data.trim();
    if (trimmedData.startsWith('<') || trimmedData.includes('<!DOCTYPE') || trimmedData.includes('Per anonym')) {
      console.error(`❌ Supabase ${operation} returned HTML:`, data.substring(0, 100));
      throw new Error(`Supabase ${operation} failed: Server returned HTML instead of JSON. Database may be unreachable.`);
    }
  }
  
  // Check if error contains HTML
  if (error && error.message && typeof error.message === 'string') {
    if (error.message.includes('<') || error.message.includes('Per anonym') || error.message.includes('<!DOCTYPE')) {
      console.error(`❌ Supabase ${operation} error contains HTML:`, error.message.substring(0, 100));
      throw new Error(`Supabase ${operation} failed: Server returned HTML error page. Database may be unreachable.`);
    }
  }
  
  return { data, error };
};

// Database Tables:
// 1. users: id, wallet_address, username, created_at
// 2. payments: id, sender_address, recipient_username, amount, tx_hash, status, created_at
// 3. balances: id, username, wallet_address, available_balance, created_at, updated_at
// 4. payment_links: id, wallet_address, username, alias, created_at

/**
 * Register or get user
 */
export async function registerUser(walletAddress, username) {
  try {
    // Check if user exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('wallet_address', walletAddress)
      .single();

    if (existingUser) {
      // Update username if changed
      if (existingUser.username !== username) {
        const { data, error } = await supabase
          .from('users')
          .update({ username })
          .eq('wallet_address', walletAddress)
          .select()
          .single();

        if (error) throw error;
        return data;
      }
      return existingUser;
    }

    // Create new user
    const { data, error } = await supabase
      .from('users')
      .insert([{ wallet_address: walletAddress, username }])
      .select()
      .single();

    if (error) throw error;

    // Initialize balance
    await supabase
      .from('balances')
      .insert([{ 
        username, 
        wallet_address: walletAddress, 
        available_balance: 0 
      }]);

    return data;
  } catch (error) {
    console.error('Error registering user:', error);
    throw error;
  }
}

/**
 * Record incoming payment
 */
export async function recordPayment(senderAddress, recipientUsername, amount, txHash) {
  try {
    // Record payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert([{
        sender_address: senderAddress,
        recipient_username: recipientUsername,
        amount: parseFloat(amount),
        tx_hash: txHash,
        status: 'completed'
      }])
      .select()
      .single();

    validateSupabaseResponse(payment, paymentError, 'recordPayment');

    if (paymentError) throw paymentError;

    // Update balance
    const { data: balance, error: balanceError } = await supabase
      .from('balances')
      .select('available_balance')
      .eq('username', recipientUsername)
      .single();

    validateSupabaseResponse(balance, balanceError, 'recordPayment.getBalance');

    if (balanceError) throw balanceError;

    const newBalance = (balance?.available_balance || 0) + parseFloat(amount);

    await supabase
      .from('balances')
      .update({ 
        available_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('username', recipientUsername);

    return payment;
  } catch (error) {
    console.error('Error recording payment:', error);
    // Check if error message contains HTML
    if (error.message && typeof error.message === 'string' && error.message.includes('<')) {
      console.error('Supabase returned HTML error page during payment recording');
      throw new Error('Database is unreachable. Payment may not have been recorded.');
    }
    throw error;
  }
}

/**
 * Get user balance
 */
export async function getUserBalance(username) {
  try {
    const { data, error } = await supabase
      .from('balances')
      .select('*')
      .eq('username', username)
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error getting balance:', error);
    return { available_balance: 0 };
  }
}

/**
 * Get user payments (received and sent)
 */
export async function getUserPayments(username) {
  try {
    // Get received payments
    const { data: receivedPayments, error: receivedError } = await supabase
      .from('payments')
      .select('*')
      .eq('recipient_username', username)
      .order('created_at', { ascending: false });

    if (receivedError) throw receivedError;

    // Get sent payments (where user is the sender)
    // We need to get the user's wallet address first
    const { data: user } = await supabase
      .from('users')
      .select('wallet_address')
      .eq('username', username)
      .single();

    let sentPayments = [];
    if (user) {
      const { data: sent, error: sentError } = await supabase
        .from('payments')
        .select('*')
        .eq('sender_address', user.wallet_address)
        .order('created_at', { ascending: false });

      if (!sentError && sent) {
        // Mark sent payments with a flag
        sentPayments = sent.map(payment => ({
          ...payment,
          is_sent: true
        }));
      }
    }

    // Combine and sort by date
    const allPayments = [...(receivedPayments || []), ...sentPayments]
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return allPayments;
  } catch (error) {
    console.error('Error getting payments:', error);
    return [];
  }
}

/**
 * Withdraw funds
 */
export async function withdrawFunds(username, amount, destinationAddress, txHash) {
  try {
    // Get current balance
    const { data: balance, error: balanceError } = await supabase
      .from('balances')
      .select('available_balance')
      .eq('username', username)
      .single();

    validateSupabaseResponse(balance, balanceError, 'withdrawFunds.getBalance');

    if (balanceError) throw balanceError;

    if (!balance || balance.available_balance < amount) {
      throw new Error('Insufficient balance');
    }

    // Record withdrawal
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from('payments')
      .insert([{
        sender_address: 'treasury',
        recipient_username: username,
        amount: -parseFloat(amount),
        tx_hash: txHash,
        status: 'withdrawn'
      }])
      .select()
      .single();

    validateSupabaseResponse(withdrawal, withdrawalError, 'withdrawFunds.recordWithdrawal');

    if (withdrawalError) throw withdrawalError;

    // Update balance
    const newBalance = balance.available_balance - parseFloat(amount);
    const { error: updateError } = await supabase
      .from('balances')
      .update({ 
        available_balance: newBalance,
        updated_at: new Date().toISOString()
      })
      .eq('username', username);

    if (updateError) {
      validateSupabaseResponse(null, updateError, 'withdrawFunds.updateBalance');
      throw updateError;
    }

    return { success: true, newBalance };
  } catch (error) {
    console.error('❌ Error withdrawing funds from Supabase:', error);
    
    // Check if error message contains HTML or "Per anonym"
    const errorStr = error?.message || error?.toString() || '';
    if (errorStr.includes('<') || errorStr.includes('Per anonym') || errorStr.includes('<!DOCTYPE')) {
      console.error('🚨 Supabase returned HTML error page during withdrawal');
      throw new Error('Database is unreachable or returned an error page. Your funds were transferred on-chain successfully, but the balance may not be updated in the dashboard.');
    }
    
    // Check for JSON parsing errors
    if (errorStr.includes('Unexpected token') || errorStr.includes('JSON')) {
      console.error('🚨 JSON parsing error - likely received HTML instead of JSON');
      throw new Error('Database returned invalid data. Your transaction succeeded on the blockchain, but balance tracking failed.');
    }
    
    // Check for network/connection errors
    if (errorStr.includes('Failed to fetch') || errorStr.includes('Network')) {
      console.error('🚨 Network connection error');
      throw new Error('Cannot connect to database. Please check your internet connection.');
    }
    
    throw error;
  }
}

/**
 * Get user by username
 */
export async function getUserByUsername(username) {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .single();

    // Validate response
    validateSupabaseResponse(data, error, 'getUserByUsername');

    if (error) {
      // Handle "not found" gracefully
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting user:', error);
    // Check if error message contains HTML
    if (error.message && typeof error.message === 'string' && error.message.includes('<')) {
      console.error('Supabase returned HTML error page');
      throw new Error('Database is unreachable. Please check your connection.');
    }
    return null;
  }
}

/**
 * Create payment link
 */
export async function createPaymentLink(walletAddress, username, alias) {
  try {
    const { data, error } = await supabase
      .from('payment_links')
      .insert([{
        wallet_address: walletAddress,
        username,
        alias
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating payment link:', error);
    throw error;
  }
}

/**
 * Get payment links by wallet address
 */
export async function getPaymentLinks(walletAddress) {
  try {
    const { data, error } = await supabase
      .from('payment_links')
      .select('*')
      .eq('wallet_address', walletAddress)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error getting payment links:', error);
    return [];
  }
}

/**
 * Get payment link by alias
 */
export async function getPaymentLinkByAlias(alias) {
  try {
    const { data, error } = await supabase
      .from('payment_links')
      .select('*')
      .eq('alias', alias)
      .single();

    validateSupabaseResponse(data, error, 'getPaymentLinkByAlias');

    if (error) {
      // Handle "not found" gracefully
      if (error.code === 'PGRST116') {
        return null;
      }
      throw error;
    }
    return data;
  } catch (error) {
    console.error('Error getting payment link:', error);
    // Check if error message contains HTML
    if (error.message && typeof error.message === 'string' && error.message.includes('<')) {
      console.error('Supabase returned HTML error page');
      throw new Error('Database is unreachable. Please check your connection.');
    }
    return null;
  }
}
