#!/usr/bin/env bash
# ARIA Virtual Assistant — Quick Setup Script

set -e

YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}"
cat << 'EOF'
    ___    ____  _____
   /   |  / __ \/  _/   /\
  / /| | / /_/ // /    /  \
 / ___ |/ _, _// /    / /\ \
/_/  |_/_/ |_/___/   /_/  \_\

AI Remote Intelligence Assistant
EOF
echo -e "${NC}"

echo -e "${GREEN}Setting up ARIA...${NC}\n"

# Check prerequisites
check_cmd() {
    if ! command -v "$1" &> /dev/null; then
        echo -e "${RED}✗ $1 not found. Please install it.${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ $1 found${NC}"
}

echo "Checking prerequisites..."
check_cmd python3
check_cmd node
check_cmd npm

# Setup backend
echo -e "\n${YELLOW}Setting up backend...${NC}"
cd backend

if [ ! -f ".env" ]; then
    cp .env.example .env
    echo -e "${YELLOW}Created backend/.env — please add your API keys!${NC}"
fi

python3 -m venv .venv 2>/dev/null || true
source .venv/bin/activate
pip install -r requirements.txt -q
echo -e "${GREEN}✓ Backend dependencies installed${NC}"
cd ..

# Setup frontend
echo -e "\n${YELLOW}Setting up frontend...${NC}"
cd frontend
npm install --silent
echo -e "${GREEN}✓ Frontend dependencies installed${NC}"
cd ..

# Setup laptop agent
echo -e "\n${YELLOW}Setting up laptop agent...${NC}"
cd laptop-agent
pip install -r requirements.txt -q 2>/dev/null || echo -e "${YELLOW}Some agent packages need manual install${NC}"
echo -e "${GREEN}✓ Laptop agent ready${NC}"
cd ..

echo -e "\n${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}ARIA is ready!${NC}"
echo ""
echo -e "To start ARIA:"
echo -e "  ${BLUE}1. Backend:${NC}  cd backend && source .venv/bin/activate && python main.py"
echo -e "  ${BLUE}2. Frontend:${NC} cd frontend && npm run dev"
echo -e "  ${BLUE}3. On laptop:${NC} cd laptop-agent && python agent.py"
echo ""
echo -e "  ${BLUE}Or with Docker:${NC} docker-compose up"
echo ""
echo -e "  ${YELLOW}⚠ Don't forget to add your ANTHROPIC_API_KEY to backend/.env${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
