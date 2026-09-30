#!/usr/bin/env bash
set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"

echo "=== LearnLoop AI — Local Setup Helper ==="

# Backend
echo ""
echo "→ Setting up backend..."
cd "$ROOT/backend"
if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
source .venv/bin/activate
pip install -q -r requirements.txt

# Create .env if missing
if [ ! -f ".env" ]; then
  cp "$ROOT/.env.example" .env
  echo "Created backend/.env (MOCK_MODE=true by default)"
fi

echo ""
echo "Backend ready. Start it with:"
echo "  cd backend && source .venv/bin/activate && uvicorn app.main:app --reload --port 8000"
echo ""

# Frontend
echo "→ Setting up frontend..."
cd "$ROOT/frontend"
if [ ! -d "node_modules" ]; then
  npm install
fi

if [ ! -f ".env.local" ]; then
  echo "NEXT_PUBLIC_API_URL=http://localhost:8000" > .env.local
  echo "Created frontend/.env.local"
fi

echo ""
echo "Frontend ready. Start it with:"
echo "  cd frontend && npm run dev"
echo ""
echo "Then open http://localhost:3000"
echo ""
echo "Run tests:   cd backend && source .venv/bin/activate && pytest -v"
echo "Run eval:    cd backend && source .venv/bin/activate && python ../evaluation/run_evaluation.py"
