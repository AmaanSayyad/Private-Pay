# Supabase Setup Instructions

## Create Stealth Payments Table

Run this SQL in your Supabase dashboard (SQL Editor):

```sql
-- Create stealth_payments table
CREATE TABLE stealth_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  wallet_address TEXT NOT NULL,
  stealth_address TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  tx_hash TEXT UNIQUE NOT NULL,
  timestamp BIGINT NOT NULL,
  chain TEXT NOT NULL,
  is_spent BOOLEAN DEFAULT FALSE,
  ephemeral_pub_key TEXT,
  block_number BIGINT,
  from_address TEXT,
  to_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_wallet_address ON stealth_payments(wallet_address);
CREATE INDEX idx_stealth_address ON stealth_payments(stealth_address);
CREATE INDEX idx_tx_hash ON stealth_payments(tx_hash);
CREATE INDEX idx_is_spent ON stealth_payments(is_spent);
CREATE INDEX idx_timestamp ON stealth_payments(timestamp DESC);

-- Enable Row Level Security (RLS)
ALTER TABLE stealth_payments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to read their own payments
CREATE POLICY "Users can view their own stealth payments"
  ON stealth_payments
  FOR SELECT
  USING (true);  -- Public read for now, can restrict later

-- Create policy to allow inserting payments
CREATE POLICY "Anyone can insert stealth payments"
  ON stealth_payments
  FOR INSERT
  WITH CHECK (true);
```

## Enable Real-time (Optional)

To enable real-time updates when new payments arrive:

1. Go to **Database** → **Replication** in Supabase
2. Enable replication for `stealth_payments` table
3. Real-time subscriptions will automatically work

## Verify

After running the SQL, verify the table exists:

```sql
SELECT * FROM stealth_payments LIMIT 1;
```

You should see the table structure (even if empty).
