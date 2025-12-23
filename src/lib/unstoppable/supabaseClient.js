/**
 * Supabase Client for Unstoppable Wallet
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
    console.error('Missing Supabase credentials in environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Initialize Supabase table for stealth payments
 * 
 * Table Schema:
 * - id (uuid, primary key)
 * - wallet_address (text) - Main wallet address
 * - stealth_address (text) - Stealth address that received payment
 * - amount (numeric) - Payment amount
 * - tx_hash (text, unique) - Transaction hash
 * - timestamp (bigint) - Transaction timestamp
 * - chain (text) - Blockchain (solana, ethereum, etc)
 * - is_spent (boolean) - Whether payment has been spent
 * - ephemeral_pub_key (text) - Ephemeral public key from sender
 * - block_number (bigint) - Block number
 * - from_address (text) - Sender address
 * - to_address (text) - Recipient address
 * - created_at (timestamp) - Record creation time
 */

/**
 * SQL to create table (run in Supabase dashboard):
 * 
 * CREATE TABLE stealth_payments (
 *   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
 *   wallet_address TEXT NOT NULL,
 *   stealth_address TEXT NOT NULL,
 *   amount NUMERIC NOT NULL,
 *   tx_hash TEXT UNIQUE NOT NULL,
 *   timestamp BIGINT NOT NULL,
 *   chain TEXT NOT NULL,
 *   is_spent BOOLEAN DEFAULT FALSE,
 *   ephemeral_pub_key TEXT,
 *   block_number BIGINT,
 *   from_address TEXT,
 *   to_address TEXT,
 *   created_at TIMESTAMP DEFAULT NOW()
 * );
 * 
 * CREATE INDEX idx_wallet_address ON stealth_payments(wallet_address);
 * CREATE INDEX idx_stealth_address ON stealth_payments(stealth_address);
 * CREATE INDEX idx_tx_hash ON stealth_payments(tx_hash);
 * CREATE INDEX idx_is_spent ON stealth_payments(is_spent);
 */
