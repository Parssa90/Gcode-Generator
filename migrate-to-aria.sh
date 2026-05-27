#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────
# ARIA Migration Script
# Copies all ARIA files from Gcode-Generator into your ARIA repo
# and pushes them.
#
# Run this once on your laptop:
#   chmod +x migrate-to-aria.sh
#   ./migrate-to-aria.sh
# ─────────────────────────────────────────────────────────────

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

ARIA_REPO="https://github.com/Parssa90/ARIA.git"
SOURCE_DIR="virtual-assistant"

echo -e "${BLUE}ARIA Migration Script${NC}"
echo "────────────────────────────────────"

# Make sure we're in the Gcode-Generator root
if [ ! -d "$SOURCE_DIR" ]; then
  echo "ERROR: Run this script from the Gcode-Generator repo root."
  exit 1
fi

# Clone ARIA repo into a temp folder
TMPDIR=$(mktemp -d)
echo -e "${YELLOW}Cloning ARIA repo...${NC}"
git clone "$ARIA_REPO" "$TMPDIR/ARIA"

# Copy all virtual-assistant files into the ARIA clone
echo -e "${YELLOW}Copying files...${NC}"
cp -r "$SOURCE_DIR/." "$TMPDIR/ARIA/"

# Commit and push
cd "$TMPDIR/ARIA"
git add -A
git commit -m "feat: initial ARIA project — full-stack voice assistant

- FastAPI backend with Claude AI integration
- React + Vite web PWA frontend
- Expo React Native iOS app
- Python laptop agent with GPU offload"

echo -e "${YELLOW}Pushing to ARIA repo...${NC}"
git push origin main

echo ""
echo -e "${GREEN}✓ Done! All ARIA files are now in https://github.com/Parssa90/ARIA${NC}"
echo ""
echo -e "Next steps:"
echo -e "  ${BLUE}1.${NC} Open ARIA in PyCharm (clone from GitHub)"
echo -e "  ${BLUE}2.${NC} Add your ANTHROPIC_API_KEY to backend/.env"
echo -e "  ${BLUE}3.${NC} Run setup.sh or follow README.md"

# Cleanup
rm -rf "$TMPDIR"
