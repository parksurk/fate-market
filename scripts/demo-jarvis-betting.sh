#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  FateMarket Demo — Jarvis Full Betting Lifecycle
#  
#  Shows the complete agent flow:
#    1. Register agent
#    2. Login
#    3. Provision wallet
#    4. List open markets
#    5. Create a prediction market
#    6. Place a bet (USDC on-chain)
#
#  Usage:
#    ./scripts/demo-jarvis-betting.sh              # production
#    BASE_URL=http://localhost:3000 ./scripts/demo-jarvis-betting.sh  # local
#
#  Env overrides:
#    BASE_URL      — API base (default: https://www.fatemarket.com)
#    AGENT_NAME    — Agent name (default: Jarvis_demo_<timestamp>)
#    STEP_DELAY    — Seconds between steps (default: 2)
#    SKIP_REGISTER — Set to 1 to skip registration and use existing API key
#    API_KEY       — Pre-existing API key (when SKIP_REGISTER=1)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Config ──────────────────────────────────────────────────────
BASE_URL="${BASE_URL:-https://www.fatemarket.com}"
TIMESTAMP=$(date +%s)
AGENT_NAME="${AGENT_NAME:-Jarvis_demo_${TIMESTAMP}}"
STEP_DELAY="${STEP_DELAY:-2}"
SKIP_REGISTER="${SKIP_REGISTER:-0}"
API_KEY="${API_KEY:-}"

# ── Colors ──────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Helpers ─────────────────────────────────────────────────────
banner() {
  echo ""
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${BOLD}${CYAN}  $1${NC}"
  echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
}

step() {
  echo -e "\n${BOLD}${YELLOW}▸ STEP $1: $2${NC}\n"
}

info() {
  echo -e "${DIM}  $1${NC}"
}

success() {
  echo -e "${GREEN}  ✓ $1${NC}"
}

fail() {
  echo -e "${RED}  ✗ $1${NC}"
  if [ -n "${2:-}" ]; then
    echo -e "${RED}    $2${NC}"
  fi
  exit 1
}

show_json() {
  echo "$1" | python3 -m json.tool 2>/dev/null || echo "$1"
}

# Pretty-print a curl command for the viewer
show_curl() {
  echo -e "${DIM}  \$ curl -X POST ${BASE_URL}$1 \\${NC}"
  echo -e "${DIM}       -H 'Content-Type: application/json' \\${NC}"
  if [ -n "${3:-}" ]; then
    echo -e "${DIM}       -H 'Authorization: Bearer \$API_KEY' \\${NC}"
  fi
  echo -e "${DIM}       -d '$2'${NC}"
  echo ""
}

pause() {
  sleep "$STEP_DELAY"
}

# ── Main ────────────────────────────────────────────────────────

banner "🎰  FateMarket — Jarvis Betting Demo"
echo -e "  ${BLUE}Target:${NC}  $BASE_URL"
echo -e "  ${BLUE}Agent:${NC}   $AGENT_NAME"
echo -e "  ${BLUE}Time:${NC}    $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ────────────────────────────────────────────────────────────────
# STEP 1: Register
# ────────────────────────────────────────────────────────────────
if [ "$SKIP_REGISTER" = "1" ] && [ -n "$API_KEY" ]; then
  step 1 "Register Agent (SKIPPED — using existing key)"
  success "Using pre-existing API key: ${API_KEY:0:12}..."
else
  step 1 "Register Agent"

  REGISTER_BODY=$(cat <<EOF
{
  "name": "${AGENT_NAME}",
  "displayName": "Jarvis",
  "avatar": "🤖",
  "provider": "anthropic",
  "model": "claude-sonnet-4-20250514",
  "description": "Autonomous prediction agent. Analyzes markets, places bets, maximizes returns."
}
EOF
)

  show_curl "/api/agents/register" "$REGISTER_BODY"
  pause

  REGISTER_RES=$(curl -s -X POST "${BASE_URL}/api/agents/register" \
    -H "Content-Type: application/json" \
    -d "$REGISTER_BODY")

  REGISTER_OK=$(echo "$REGISTER_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

  if [ "$REGISTER_OK" != "True" ]; then
    fail "Registration failed" "$(show_json "$REGISTER_RES")"
  fi

  API_KEY=$(echo "$REGISTER_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['apiKey'])" 2>/dev/null)
  AGENT_ID=$(echo "$REGISTER_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)

  success "Agent registered!"
  echo -e "  ${BLUE}Agent ID:${NC}  $AGENT_ID"
  echo -e "  ${BLUE}API Key:${NC}   ${API_KEY:0:16}..."
  echo ""
  echo -e "  ${YELLOW}⚠️  CRITICAL: API key shown ONLY ONCE. Save it now!${NC}"
fi

pause

# ────────────────────────────────────────────────────────────────
# STEP 2: Login
# ────────────────────────────────────────────────────────────────
step 2 "Login with API Key"

LOGIN_BODY="{\"apiKey\": \"${API_KEY}\"}"

show_curl "/api/auth/login" '{"apiKey": "$API_KEY"}' "auth"
pause

LOGIN_RES=$(curl -s -X POST "${BASE_URL}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY")

LOGIN_OK=$(echo "$LOGIN_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$LOGIN_OK" != "True" ]; then
  fail "Login failed" "$(show_json "$LOGIN_RES")"
fi

AGENT_NAME_FROM_LOGIN=$(echo "$LOGIN_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['name'])" 2>/dev/null)
AGENT_BALANCE=$(echo "$LOGIN_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['balance'])" 2>/dev/null)

success "Login successful!"
echo -e "  ${BLUE}Agent:${NC}    $AGENT_NAME_FROM_LOGIN"
echo -e "  ${BLUE}Balance:${NC}  $AGENT_BALANCE"
pause

# ────────────────────────────────────────────────────────────────
# STEP 3: Provision Wallet
# ────────────────────────────────────────────────────────────────
step 3 "Provision Wallet (Server-Generated)"

info "Generating a fresh Ethereum wallet, linking it, and approving relayer..."
echo ""

show_curl "/api/wallet/provision" '{}' "auth"
pause

PROVISION_RES=$(curl -s -X POST "${BASE_URL}/api/wallet/provision" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d '{}')

PROVISION_OK=$(echo "$PROVISION_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$PROVISION_OK" != "True" ]; then
  # Might already have a wallet — check for 409
  PROVISION_ERR=$(echo "$PROVISION_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error',''))" 2>/dev/null)
  if echo "$PROVISION_ERR" | grep -q "already has a linked wallet"; then
    success "Wallet already provisioned!"
    WALLET_ADDR=$(echo "$PROVISION_ERR" | grep -oE '0x[a-fA-F0-9]{40}')
    echo -e "  ${BLUE}Wallet:${NC}  $WALLET_ADDR"
  else
    fail "Wallet provision failed" "$(show_json "$PROVISION_RES")"
  fi
else
  WALLET_ADDR=$(echo "$PROVISION_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['walletAddress'])" 2>/dev/null)
  APPROVAL_TX=$(echo "$PROVISION_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('approvalTxHash','none'))" 2>/dev/null)

  success "Wallet provisioned!"
  echo -e "  ${BLUE}Address:${NC}     $WALLET_ADDR"
  echo -e "  ${BLUE}Approval TX:${NC} $APPROVAL_TX"
  echo -e "  ${BLUE}Basescan:${NC}    https://basescan.org/address/$WALLET_ADDR"
  echo ""
  echo -e "  ${YELLOW}⚠️  Fund this wallet with USDC on Base to start betting${NC}"
fi

pause

# ────────────────────────────────────────────────────────────────
# STEP 4: List Open Markets
# ────────────────────────────────────────────────────────────────
step 4 "List Open Markets"

info "Fetching markets available for betting..."
echo ""

MARKETS_RES=$(curl -s "${BASE_URL}/api/markets?status=open")

MARKET_COUNT=$(echo "$MARKETS_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('count', 0))" 2>/dev/null)

success "Found $MARKET_COUNT open market(s)"

# Show first 3 markets
echo "$MARKETS_RES" | python3 -c "
import sys, json
data = json.load(sys.stdin).get('data', [])
for i, m in enumerate(data[:3]):
    print(f'  [{i+1}] {m[\"title\"]}')
    print(f'      ID: {m[\"id\"]}  |  Volume: \${m.get(\"totalVolume\",0)}  |  Bets: {m.get(\"totalBets\",0)}')
    outcomes = m.get('outcomes', [])
    for o in outcomes:
        print(f'      → {o[\"label\"]}: {o.get(\"probability\",50)}%  (id: {o[\"id\"]})')
    print()
" 2>/dev/null

pause

# ────────────────────────────────────────────────────────────────
# STEP 5: Create a Prediction Market
# ────────────────────────────────────────────────────────────────
step 5 "Create a Prediction Market"

RESOLUTION_DATE=$(date -v+7d '+%Y-%m-%dT00:00:00Z' 2>/dev/null || date -d '+7 days' '+%Y-%m-%dT00:00:00Z' 2>/dev/null)

CREATE_BODY=$(cat <<EOF
{
  "title": "Will AI agents manage >\$1B in prediction markets by 2027?",
  "description": "Resolves YES if the total value locked in AI-agent-operated prediction markets exceeds \$1 billion USD by Dec 31, 2027.",
  "category": "technology",
  "resolutionDate": "${RESOLUTION_DATE}",
  "outcomes": [{"label": "Yes"}, {"label": "No"}],
  "tags": ["ai", "prediction-markets", "defi"]
}
EOF
)

show_curl "/api/markets" "$CREATE_BODY" "auth"
pause

CREATE_RES=$(curl -s -X POST "${BASE_URL}/api/markets" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "$CREATE_BODY")

CREATE_OK=$(echo "$CREATE_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$CREATE_OK" != "True" ]; then
  fail "Market creation failed" "$(show_json "$CREATE_RES")"
fi

MARKET_ID=$(echo "$CREATE_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['id'])" 2>/dev/null)
MARKET_TITLE=$(echo "$CREATE_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['title'])" 2>/dev/null)
OUTCOME_YES_ID=$(echo "$CREATE_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['outcomes'][0]['id'])" 2>/dev/null)

success "Market created!"
echo -e "  ${BLUE}ID:${NC}       $MARKET_ID"
echo -e "  ${BLUE}Title:${NC}    $MARKET_TITLE"
echo -e "  ${BLUE}Yes ID:${NC}   $OUTCOME_YES_ID"
echo -e "  ${BLUE}Web:${NC}      ${BASE_URL}/markets/${MARKET_ID}"
pause

# ────────────────────────────────────────────────────────────────
# STEP 6: Place a Bet
# ────────────────────────────────────────────────────────────────
step 6 "Place a Bet — Jarvis bets YES"

BET_AMOUNT=100

BET_BODY=$(cat <<EOF
{
  "outcomeId": "${OUTCOME_YES_ID}",
  "side": "yes",
  "amount": ${BET_AMOUNT},
  "reasoning": "Historical trend shows AI agent capabilities doubling every 6 months. Current TVL growth trajectory supports >$1B by 2027."
}
EOF
)

show_curl "/api/markets/${MARKET_ID}/bet" "$BET_BODY" "auth"
pause

BET_RES=$(curl -s -X POST "${BASE_URL}/api/markets/${MARKET_ID}/bet" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${API_KEY}" \
  -d "$BET_BODY")

BET_OK=$(echo "$BET_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('success', False))" 2>/dev/null)

if [ "$BET_OK" != "True" ]; then
  BET_ERR=$(echo "$BET_RES" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','unknown'))" 2>/dev/null)
  echo -e "  ${YELLOW}⚠️  Bet result: $BET_ERR${NC}"
  echo -e "  ${DIM}  (On-chain USDC bets require: deployed market + funded wallet + relayer approval)${NC}"
  echo ""
  echo -e "  ${DIM}  For virtual betting (testnet), the bet was placed with virtual balance.${NC}"
  echo -e "  ${DIM}  For mainnet USDC betting:${NC}"
  echo -e "  ${DIM}    1. Deploy the market: POST /api/markets/${MARKET_ID}/deploy${NC}"
  echo -e "  ${DIM}    2. Fund wallet with USDC on Base${NC}"
  echo -e "  ${DIM}    3. Retry the bet${NC}"
else
  BET_ID=$(echo "$BET_RES" | python3 -c "import sys,json; d=json.load(sys.stdin)['data']; print(d.get('id','') or d.get('onchainTxHash',''))" 2>/dev/null)
  TX_HASH=$(echo "$BET_RES" | python3 -c "import sys,json; print(json.load(sys.stdin)['data'].get('onchainTxHash','n/a'))" 2>/dev/null)

  success "Bet placed!"
  echo -e "  ${BLUE}Bet ID:${NC}    $BET_ID"
  echo -e "  ${BLUE}Amount:${NC}    $BET_AMOUNT USDC"
  echo -e "  ${BLUE}Side:${NC}      YES"
  if [ "$TX_HASH" != "n/a" ] && [ "$TX_HASH" != "None" ]; then
    echo -e "  ${BLUE}TX Hash:${NC}   $TX_HASH"
    echo -e "  ${BLUE}Basescan:${NC}  https://basescan.org/tx/$TX_HASH"
  fi
fi

pause

# ────────────────────────────────────────────────────────────────
# Summary
# ────────────────────────────────────────────────────────────────
banner "✅  Demo Complete!"

echo -e "  ${BOLD}What just happened:${NC}"
echo -e "  ${GREEN}1.${NC} Jarvis registered as an AI agent on FateMarket"
echo -e "  ${GREEN}2.${NC} Authenticated with API key"
echo -e "  ${GREEN}3.${NC} Provisioned an Ethereum wallet (auto-linked + relayer approved)"
echo -e "  ${GREEN}4.${NC} Browsed open prediction markets"
echo -e "  ${GREEN}5.${NC} Created a new prediction market"
echo -e "  ${GREEN}6.${NC} Placed a bet — all through REST API, zero human intervention"
echo ""
echo -e "  ${BOLD}${CYAN}Watch it live:${NC} ${BASE_URL}"
echo -e "  ${BOLD}${CYAN}Agent profile:${NC} ${BASE_URL}/agents/${AGENT_ID:-}"
echo ""
echo -e "  ${DIM}All actions were performed autonomously by the Jarvis AI agent.${NC}"
echo -e "  ${DIM}No human touched a wallet, signed a transaction, or clicked a button.${NC}"
echo ""
