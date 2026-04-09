#!/bin/bash
# Together Launcher Script

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "   🗂  Together Project Tracker"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# --- Backend ---
echo "[1/2] 백엔드 서버 시작 중..."
cd "$PROJECT_DIR/backend"
if [ ! -d "venv" ]; then
    echo "  → Python 가상환경 생성 및 패키지 설치 중... (최초 1회)"
    python3 -m venv venv
    source venv/bin/activate
    pip install -q -r requirements.txt
else
    source venv/bin/activate
fi
uvicorn main:app --reload --port 8001 &
BACKEND_PID=$!

sleep 1

# --- Frontend ---
echo "[2/2] 프론트엔드 서버 시작 중..."
cd "$PROJECT_DIR/frontend"
if [ ! -d "node_modules" ]; then
    echo "  → npm 패키지 설치 중... (최초 1회)"
    npm install --silent
fi
npm run dev -- --port 5174 &
FRONTEND_PID=$!

sleep 2
echo ""
echo "✅ Together 실행 완료!"
echo "   브라우저: http://localhost:5174"
echo "   Ctrl+C 로 종료"
echo ""

open "http://localhost:5174"

trap "echo '종료 중...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" SIGINT SIGTERM
wait
