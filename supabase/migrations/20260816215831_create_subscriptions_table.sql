/*
# Create subscriptions table for WaafiPay payments

1. New Tables
- `subscriptions` — tracks WaafiPay payment transactions for plan upgrades
  - `id` (uuid, primary key)
  - `user_id` (uuid, references auth.users, defaults to auth.uid())
  - `plan` (text: 'starter' | 'business' | 'enterprise')
  - `amount` (numeric, payment amount)
  - `currency` (text, e.g. 'DJF')
  - `phone` (text, payer's phone number)
  - `reference_id` (text, unique internal reference for WaafiPay)
  - `waafi_transaction_id` (text, transaction ID returned by WaafiPay)
  - `status` (text: 'pending' | 'approved' | 'failed' | 'cancelled')
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

2. Security
- RLS enabled on `subscriptions`.
- Owner-scoped CRUD: each authenticated user can only access their own subscription records.
*/

CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL CHECK (plan IN ('starter','business','enterprise')),
  amount numeric(12,2) NOT NULL,
  currency text NOT NULL DEFAULT 'DJF',
  phone text NOT NULL,
  reference_id text UNIQUE NOT NULL,
  waafi_transaction_id text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','failed','cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_subscriptions" ON subscriptions;
CREATE POLICY "update_own_subscriptions" ON subscriptions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_subscriptions" ON subscriptions;
CREATE POLICY "delete_own_subscriptions" ON subscriptions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_reference ON subscriptions(reference_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
