/**
 * Supabase Storage for Stealth Payments
 * Cloud-based storage with cross-device sync
 */

import { supabase } from './supabaseClient';

const TABLE_NAME = 'stealth_payments';

/**
 * Store a received stealth payment in Supabase
 */
export async function storeReceivedPayment(payment, walletAddress) {
    try {
        const paymentData = {
            wallet_address: walletAddress,
            stealth_address: payment.stealthAddress,
            amount: payment.amount,
            tx_hash: payment.txHash,
            timestamp: payment.timestamp || Date.now(),
            chain: payment.chain,
            is_spent: false,
            ephemeral_pub_key: payment.ephemeralPubKey,
            block_number: payment.blockNumber || null,
            from_address: payment.from || null,
            to_address: payment.to || null,
        };

        const { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([paymentData])
            .select()
            .single();

        if (error) {
            // Check if duplicate (tx_hash already exists)
            if (error.code === '23505') {
                console.log('⚠️ Payment already stored:', payment.txHash);
                return null;
            }
            throw error;
        }

        console.log('✅ Stealth payment stored in Supabase:', data);
        return data;
    } catch (error) {
        console.error('❌ Failed to store payment in Supabase:', error);
        throw error;
    }
}

/**
 * Get all received payments for a wallet
 */
export async function getAllReceivedPayments(walletAddress) {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('wallet_address', walletAddress)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('❌ Failed to fetch payments from Supabase:', error);
        return [];
    }
}

/**
 * Get received payments by stealth address
 */
export async function getPaymentsByAddress(stealthAddress, walletAddress) {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('wallet_address', walletAddress)
            .eq('stealth_address', stealthAddress)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('❌ Failed to fetch payments by address:', error);
        return [];
    }
}

/**
 * Get unspent payments
 */
export async function getUnspentPayments(walletAddress) {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('wallet_address', walletAddress)
            .eq('is_spent', false)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        return data || [];
    } catch (error) {
        console.error('❌ Failed to fetch unspent payments:', error);
        return [];
    }
}

/**
 * Mark payment as spent
 */
export async function markPaymentSpent(paymentId) {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .update({ is_spent: true })
            .eq('id', paymentId)
            .select()
            .single();

        if (error) throw error;

        console.log('✅ Payment marked as spent:', data);
        return data;
    } catch (error) {
        console.error('❌ Failed to mark payment as spent:', error);
        throw error;
    }
}

/**
 * Get total unspent balance from stealth payments
 */
export async function getTotalUnspentBalance(walletAddress) {
    try {
        const unspent = await getUnspentPayments(walletAddress);

        return unspent.reduce((total, payment) => {
            return total + (parseFloat(payment.amount) || 0);
        }, 0);
    } catch (error) {
        console.error('❌ Failed to calculate unspent balance:', error);
        return 0;
    }
}

/**
 * Check if transaction hash already exists
 */
export async function transactionExists(txHash, walletAddress) {
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('id')
            .eq('wallet_address', walletAddress)
            .eq('tx_hash', txHash)
            .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
            throw error;
        }

        return !!data;
    } catch (error) {
        console.error('❌ Failed to check transaction existence:', error);
        return false;
    }
}

/**
 * Clear all payments for a wallet (for testing)
 */
export async function clearAllPayments(walletAddress) {
    try {
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('wallet_address', walletAddress);

        if (error) throw error;

        console.log('✅ All payments cleared for wallet');
    } catch (error) {
        console.error('❌ Failed to clear payments:', error);
        throw error;
    }
}

/**
 * Subscribe to new payments in real-time
 */
export function subscribeToNewPayments(walletAddress, callback) {
    const channel = supabase
        .channel('stealth_payments_changes')
        .on(
            'postgres_changes',
            {
                event: 'INSERT',
                schema: 'public',
                table: TABLE_NAME,
                filter: `wallet_address=eq.${walletAddress}`
            },
            (payload) => {
                console.log('🔔 New payment received (real-time):', payload.new);
                callback(payload.new);
            }
        )
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
}
