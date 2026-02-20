-- Migration 002: Phase 2 On-chain Settlement
-- Adds on-chain market tracking, USDC ledger, and oracle resolution fields

-- 1. Markets: on-chain address and oracle fields
ALTER TABLE markets
  ADD COLUMN IF NOT EXISTS onchain_address TEXT,
  ADD COLUMN IF NOT EXISTS onchain_market_id TEXT,
  ADD COLUMN IF NOT EXISTS oracle_type TEXT DEFAULT 'manual' CHECK (oracle_type IN ('manual', 'chainlink', 'custom')),
  ADD COLUMN IF NOT EXISTS oracle_request_id TEXT,
  ADD COLUMN IF NOT EXISTS resolution_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS resolution_evidence_hash TEXT,
  ADD COLUMN IF NOT EXISTS dispute_deadline TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS onchain_status TEXT CHECK (onchain_status IN ('created', 'open', 'closed', 'proposed', 'final', 'cancelled')),
  ADD COLUMN IF NOT EXISTS metadata_hash TEXT,
  ADD COLUMN IF NOT EXISTS fee_bps INTEGER DEFAULT 200;

CREATE INDEX IF NOT EXISTS idx_markets_onchain ON markets(onchain_address) WHERE onchain_address IS NOT NULL;

-- 2. Bets: on-chain position tracking
ALTER TABLE bets
  ADD COLUMN IF NOT EXISTS onchain_market_address TEXT,
  ADD COLUMN IF NOT EXISTS onchain_outcome_index SMALLINT,
  ADD COLUMN IF NOT EXISTS onchain_tx_hash TEXT,
  ADD COLUMN IF NOT EXISTS bet_type TEXT DEFAULT 'virtual' CHECK (bet_type IN ('virtual', 'usdc'));

CREATE INDEX IF NOT EXISTS idx_bets_onchain ON bets(onchain_market_address) WHERE onchain_market_address IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bets_type ON bets(bet_type);

-- 3. USDC deposit/withdrawal ledger
CREATE TABLE IF NOT EXISTS ledger_deposits (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  wallet_address TEXT NOT NULL,
  amount NUMERIC(18,6) NOT NULL CHECK (amount > 0),
  tx_hash TEXT NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL,
  block_number BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ledger_deposits_agent ON ledger_deposits(agent_id);
CREATE INDEX IF NOT EXISTS idx_ledger_deposits_status ON ledger_deposits(status) WHERE status = 'pending';

CREATE TABLE IF NOT EXISTS ledger_withdrawals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL REFERENCES agents(id),
  wallet_address TEXT NOT NULL,
  amount NUMERIC(18,6) NOT NULL CHECK (amount > 0),
  tx_hash TEXT UNIQUE,
  chain_id INTEGER NOT NULL,
  block_number BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ledger_withdrawals_agent ON ledger_withdrawals(agent_id);

-- 4. On-chain settlement claims
CREATE TABLE IF NOT EXISTS settlement_claims (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  market_id TEXT NOT NULL REFERENCES markets(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  wallet_address TEXT NOT NULL,
  amount NUMERIC(18,6) NOT NULL,
  tx_hash TEXT UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'claimed', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_settlement_claims_market ON settlement_claims(market_id);
CREATE INDEX IF NOT EXISTS idx_settlement_claims_agent ON settlement_claims(agent_id);

-- 5. Agent USDC balance (separate from virtual balance)
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS usdc_balance NUMERIC(18,6) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sbt_token_id INTEGER,
  ADD COLUMN IF NOT EXISTS sbt_minted_at TIMESTAMPTZ;

-- 6. Contract deployment registry
CREATE TABLE IF NOT EXISTS contract_deployments (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  contract_name TEXT NOT NULL,
  contract_address TEXT NOT NULL UNIQUE,
  chain_id INTEGER NOT NULL,
  deployer TEXT NOT NULL,
  tx_hash TEXT NOT NULL,
  block_number BIGINT,
  abi_version TEXT NOT NULL DEFAULT 'v2',
  deployed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_contract_deployments_name ON contract_deployments(contract_name);

-- RLS policies
ALTER TABLE ledger_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE ledger_withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE settlement_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_deployments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on ledger_deposits" ON ledger_deposits FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on ledger_withdrawals" ON ledger_withdrawals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on settlement_claims" ON settlement_claims FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on contract_deployments" ON contract_deployments FOR ALL USING (auth.role() = 'service_role');
