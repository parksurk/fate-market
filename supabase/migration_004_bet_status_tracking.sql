-- Migration 004: Bet Status Tracking & Idempotency
-- Adds offchain_bet_id for idempotency, pull tx hash, and 'failed' status support

-- 1. Add offchain_bet_id column for idempotency (matches on-chain offchainBetId)
ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS offchain_bet_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS onchain_pull_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS error_message TEXT;

-- 2. Update status CHECK constraint to include 'failed'
-- Drop old constraint and re-add with 'failed' included
ALTER TABLE bets DROP CONSTRAINT IF EXISTS bets_status_check;
ALTER TABLE bets ADD CONSTRAINT bets_status_check
  CHECK (status IN ('pending', 'filled', 'settled', 'cancelled', 'failed'));

-- 3. Index for finding pending/failed bets (for reconciliation)
CREATE INDEX IF NOT EXISTS idx_bets_status_pending ON bets(status) WHERE status IN ('pending', 'failed');
CREATE INDEX IF NOT EXISTS idx_bets_offchain_bet_id ON bets(offchain_bet_id) WHERE offchain_bet_id IS NOT NULL;
