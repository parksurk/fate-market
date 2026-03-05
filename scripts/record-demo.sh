#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════
#  FateMarket Demo — Terminal Recording with asciinema
#
#  Automatically records the Jarvis betting demo as an
#  asciinema .cast file, ready for upload or GIF conversion.
#
#  Usage:
#    ./scripts/record-demo.sh                      # record
#    ./scripts/record-demo.sh --upload              # record + upload
#    ./scripts/record-demo.sh --gif                 # record + convert to GIF
#
#  Prerequisites:
#    brew install asciinema        # recording
#    pip install agg               # GIF conversion (optional)
#    — or —
#    cargo install agg             # GIF conversion (optional)
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_DIR="${PROJECT_DIR}/demo"
CAST_FILE="${OUTPUT_DIR}/demo-jarvis-betting.cast"
GIF_FILE="${OUTPUT_DIR}/demo-jarvis-betting.gif"
DEMO_SCRIPT="${SCRIPT_DIR}/demo-jarvis-betting.sh"

# ── Colors ──────────────────────────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
DIM='\033[2m'
NC='\033[0m'

# ── Parse args ──────────────────────────────────────────────────
DO_UPLOAD=false
DO_GIF=false

for arg in "$@"; do
  case "$arg" in
    --upload) DO_UPLOAD=true ;;
    --gif)    DO_GIF=true ;;
    --help|-h)
      echo "Usage: $0 [--upload] [--gif]"
      echo ""
      echo "  --upload   Upload to asciinema.org after recording"
      echo "  --gif      Convert to GIF after recording (requires agg)"
      exit 0
      ;;
  esac
done

# ── Check prerequisites ────────────────────────────────────────
check_installed() {
  if ! command -v "$1" &>/dev/null; then
    echo -e "${YELLOW}⚠️  $1 is not installed.${NC}"
    echo ""
    case "$1" in
      asciinema)
        echo "Install with:"
        echo "  brew install asciinema     # macOS"
        echo "  pip install asciinema      # pip"
        echo "  sudo apt install asciinema # Ubuntu/Debian"
        ;;
      agg)
        echo "Install with:"
        echo "  pip install agg            # pip"
        echo "  cargo install agg          # Rust"
        echo "  brew install agg           # macOS (if available)"
        ;;
    esac
    echo ""
    return 1
  fi
  return 0
}

if ! check_installed asciinema; then
  read -rp "Install asciinema with brew? [y/N] " yn
  case "$yn" in
    [Yy]*)
      brew install asciinema
      ;;
    *)
      echo "Cannot proceed without asciinema. Exiting."
      exit 1
      ;;
  esac
fi

if [ "$DO_GIF" = true ] && ! check_installed agg; then
  echo -e "${DIM}GIF conversion will be skipped.${NC}"
  DO_GIF=false
fi

# ── Ensure demo script exists ──────────────────────────────────
if [ ! -x "$DEMO_SCRIPT" ]; then
  echo "Demo script not found: $DEMO_SCRIPT"
  exit 1
fi

# ── Create output dir ──────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"

# ── Record ─────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}🎬  FateMarket Demo Recording${NC}"
echo -e "${DIM}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo -e "  ${BOLD}Output:${NC}  $CAST_FILE"
echo -e "  ${BOLD}Script:${NC}  $DEMO_SCRIPT"
echo ""
echo -e "${DIM}  Recording settings:${NC}"
echo -e "${DIM}    Terminal size: 120×35 (cols × rows)${NC}"
echo -e "${DIM}    Idle time limit: 3 seconds${NC}"
echo -e "${DIM}    Title: FateMarket — AI Agent Autonomous Betting${NC}"
echo ""
echo -e "${YELLOW}  Press Enter to start recording, Ctrl+C to cancel...${NC}"
read -r

# Set terminal size hint
export COLUMNS=120
export LINES=35

# Record with asciinema
asciinema rec \
  --title "FateMarket — AI Agent Autonomous Betting" \
  --idle-time-limit 3 \
  --cols 120 \
  --rows 35 \
  --command "STEP_DELAY=2 $DEMO_SCRIPT" \
  --overwrite \
  "$CAST_FILE"

echo ""
echo -e "${GREEN}✅  Recording saved: ${CAST_FILE}${NC}"

# ── Upload ─────────────────────────────────────────────────────
if [ "$DO_UPLOAD" = true ]; then
  echo ""
  echo -e "${CYAN}📤  Uploading to asciinema.org...${NC}"
  asciinema upload "$CAST_FILE"
fi

# ── GIF Conversion ─────────────────────────────────────────────
if [ "$DO_GIF" = true ]; then
  echo ""
  echo -e "${CYAN}🎞️   Converting to GIF...${NC}"
  agg "$CAST_FILE" "$GIF_FILE" \
    --cols 120 \
    --rows 35 \
    --font-size 14 \
    --speed 1.0
  echo -e "${GREEN}✅  GIF saved: ${GIF_FILE}${NC}"
  echo -e "${DIM}  File size: $(du -h "$GIF_FILE" | cut -f1)${NC}"
fi

# ── Summary ────────────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BOLD}  Next steps:${NC}"
echo ""
echo -e "  ${DIM}Play locally:${NC}"
echo -e "    asciinema play $CAST_FILE"
echo ""
echo -e "  ${DIM}Upload to asciinema.org:${NC}"
echo -e "    asciinema upload $CAST_FILE"
echo ""
echo -e "  ${DIM}Convert to GIF (requires agg):${NC}"
echo -e "    agg $CAST_FILE $GIF_FILE --cols 120 --rows 35"
echo ""
echo -e "  ${DIM}Embed in GitHub README:${NC}"
echo -e '    [![demo](https://asciinema.org/a/XXXXX.svg)](https://asciinema.org/a/XXXXX)'
echo ""
echo -e "  ${DIM}Post on X:${NC}"
echo -e "    Convert GIF to MP4: ffmpeg -i $GIF_FILE -movflags faststart -pix_fmt yuv420p demo.mp4"
echo ""
