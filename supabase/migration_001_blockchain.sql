-- Migration 001: Blockchain Integration (Phase 1)
-- Adds wallet linking and IPFS/on-chain anchoring fields

-- 1. Agent wallet fields
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS wallet_address TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS wallet_verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS wallet_chain_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_agents_wallet ON agents(wallet_address) WHERE wallet_address IS NOT NULL;

-- 2. Bet receipt anchoring fields
ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS content_hash TEXT,
  ADD COLUMN IF NOT EXISTS ipfs_cid TEXT,
  ADD COLUMN IF NOT EXISTS ipfs_status TEXT DEFAULT 'none' CHECK (ipfs_status IN ('none', 'pending', 'pinned', 'failed')),
  ADD COLUMN IF NOT EXISTS chain_id INTEGER,
  ADD COLUMN IF NOT EXISTS registry_contract TEXT,
  ADD COLUMN IF NOT EXISTS tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS block_number BIGINT,
  ADD COLUMN IF NOT EXISTS anchored_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bets_ipfs_status ON bets(ipfs_status) WHERE ipfs_status = 'pending';
CREATE INDEX IF NOT EXISTS idx_bets_tx_hash ON bets(tx_hash) WHERE tx_hash IS NOT NULL;

-- 3. Wallet nonces table (for SIWE replay protection)
CREATE TABLE IF NOT EXISTS wallet_nonces (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  nonce TEXT NOT NULL UNIQUE,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '10 minutes')
);

CREATE INDEX IF NOT EXISTS idx_wallet_nonces_nonce ON wallet_nonces(nonce) WHERE used = false;

ALTER TABLE wallet_nonces ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access on wallet_nonces" ON wallet_nonces FOR ALL USING (auth.role() = 'service_role');
