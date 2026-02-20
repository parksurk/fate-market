-- Migration 003: Phase 3 Full DeFi
-- Adds reputation scoring, staking, subscriptions, and governance tracking

-- 1. Agent reputation fields
ALTER TABLE agents
  ADD COLUMN IF NOT EXISTS reputation_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reputation_updated_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS fate_staked NUMERIC(36,18) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sfate_balance NUMERIC(36,18) NOT NULL DEFAULT 0;

-- 2. Agent staking ledger
CREATE TABLE IF NOT EXISTS agent_stakes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_sbt_token_id INTEGER NOT NULL,
  staker_address TEXT NOT NULL,
  staker_agent_id TEXT REFERENCES agents(id),
  amount NUMERIC(36,18) NOT NULL CHECK (amount > 0),
  action TEXT NOT NULL CHECK (action IN ('stake', 'unstake')),
  tx_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_stakes_token ON agent_stakes(agent_sbt_token_id);
CREATE INDEX IF NOT EXISTS idx_agent_stakes_staker ON agent_stakes(staker_address);

-- 3. Agent subscriptions
CREATE TABLE IF NOT EXISTS agent_subscriptions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_sbt_token_id INTEGER NOT NULL,
  follower_address TEXT NOT NULL,
  follower_agent_id TEXT REFERENCES agents(id),
  fee_amount NUMERIC(18,6) NOT NULL,
  paid_until TIMESTAMPTZ NOT NULL,
  tx_hash TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_subs_token ON agent_subscriptions(agent_sbt_token_id);
CREATE INDEX IF NOT EXISTS idx_agent_subs_follower ON agent_subscriptions(follower_address);

-- 4. Governance proposals
CREATE TABLE IF NOT EXISTS governance_proposals (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proposal_id TEXT NOT NULL UNIQUE,
  proposer_address TEXT NOT NULL,
  proposer_agent_id TEXT REFERENCES agents(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  targets TEXT[] NOT NULL,
  calldatas TEXT[] NOT NULL,
  start_block BIGINT,
  end_block BIGINT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'defeated', 'succeeded', 'queued', 'executed', 'cancelled', 'expired')),
  for_votes NUMERIC(36,18) DEFAULT 0,
  against_votes NUMERIC(36,18) DEFAULT 0,
  abstain_votes NUMERIC(36,18) DEFAULT 0,
  propose_tx_hash TEXT,
  queue_tx_hash TEXT,
  execute_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_gov_proposals_status ON governance_proposals(status);
CREATE INDEX IF NOT EXISTS idx_gov_proposals_proposer ON governance_proposals(proposer_address);

-- 5. Governance votes
CREATE TABLE IF NOT EXISTS governance_votes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  proposal_id TEXT NOT NULL REFERENCES governance_proposals(id),
  voter_address TEXT NOT NULL,
  voter_agent_id TEXT REFERENCES agents(id),
  support SMALLINT NOT NULL CHECK (support IN (0, 1, 2)),
  weight NUMERIC(36,18) NOT NULL,
  tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(proposal_id, voter_address)
);

CREATE INDEX IF NOT EXISTS idx_gov_votes_proposal ON governance_votes(proposal_id);

-- RLS policies
ALTER TABLE agent_stakes ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_proposals ENABLE ROW LEVEL SECURITY;
ALTER TABLE governance_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on agent_stakes" ON agent_stakes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on agent_subscriptions" ON agent_subscriptions FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on governance_proposals" ON governance_proposals FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on governance_votes" ON governance_votes FOR ALL USING (auth.role() = 'service_role');
