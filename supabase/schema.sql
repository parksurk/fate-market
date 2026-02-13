-- FATE Market Database Schema

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  avatar TEXT NOT NULL DEFAULT '🤖',
  provider TEXT NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'meta', 'mistral', 'custom')),
  model TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  api_key_hash TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  balance NUMERIC(12,2) NOT NULL DEFAULT 10000.00,
  total_bets INTEGER NOT NULL DEFAULT 0,
  total_wins INTEGER NOT NULL DEFAULT 0,
  total_losses INTEGER NOT NULL DEFAULT 0,
  profit_loss NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  win_rate NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_active_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('sports', 'politics', 'crypto', 'entertainment', 'science', 'technology', 'economics', 'other')),
  creator_id TEXT NOT NULL REFERENCES agents(id),
  creator_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved', 'cancelled')),
  outcomes JSONB NOT NULL DEFAULT '[]',
  total_volume NUMERIC(14,2) NOT NULL DEFAULT 0.00,
  total_bets INTEGER NOT NULL DEFAULT 0,
  unique_traders INTEGER NOT NULL DEFAULT 0,
  resolution_date TIMESTAMPTZ NOT NULL,
  resolved_outcome_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tags TEXT[] NOT NULL DEFAULT '{}',
  image_url TEXT
);

CREATE TABLE IF NOT EXISTS bets (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  market_id TEXT NOT NULL REFERENCES markets(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  outcome_id TEXT NOT NULL,
  side TEXT NOT NULL CHECK (side IN ('yes', 'no')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  shares INTEGER NOT NULL DEFAULT 0,
  price NUMERIC(6,4) NOT NULL,
  potential_payout INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'filled', 'settled', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  settled_at TIMESTAMPTZ,
  profit NUMERIC(12,2)
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  market_id TEXT NOT NULL REFERENCES markets(id),
  agent_id TEXT NOT NULL REFERENCES agents(id),
  agent_name TEXT NOT NULL,
  agent_avatar TEXT NOT NULL DEFAULT '🤖',
  type TEXT NOT NULL CHECK (type IN ('bet', 'create', 'resolve')),
  side TEXT CHECK (side IN ('yes', 'no')),
  amount NUMERIC(12,2),
  outcome_label TEXT,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  agent_id TEXT NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  label TEXT NOT NULL DEFAULT 'default',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_agent ON api_keys(agent_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_active ON api_keys(is_active) WHERE is_active = true;

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read access on api_keys" ON api_keys FOR SELECT USING (true);
CREATE POLICY "Service role full access on api_keys" ON api_keys FOR ALL USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_markets_category ON markets(category);
CREATE INDEX IF NOT EXISTS idx_markets_status ON markets(status);
CREATE INDEX IF NOT EXISTS idx_markets_creator ON markets(creator_id);
CREATE INDEX IF NOT EXISTS idx_bets_market ON bets(market_id);
CREATE INDEX IF NOT EXISTS idx_bets_agent ON bets(agent_id);
CREATE INDEX IF NOT EXISTS idx_activities_market ON activities(market_id);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp DESC);

ALTER TABLE agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE markets ENABLE ROW LEVEL SECURITY;
ALTER TABLE bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access on agents" ON agents FOR SELECT USING (true);
CREATE POLICY "Public read access on markets" ON markets FOR SELECT USING (true);
CREATE POLICY "Public read access on bets" ON bets FOR SELECT USING (true);
CREATE POLICY "Public read access on activities" ON activities FOR SELECT USING (true);

CREATE POLICY "Service role full access on agents" ON agents FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on markets" ON markets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on bets" ON bets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Service role full access on activities" ON activities FOR ALL USING (auth.role() = 'service_role');
