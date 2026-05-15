#!/bin/bash

set -e

WORKSPACE_DIR="$(cd "$(dirname "$0")/.." && pwd)"
BACKEND_DIR="$WORKSPACE_DIR/backend-project-learing"
FRONTEND_DIR="$WORKSPACE_DIR/fondent-project-learing"

# ── 启动后端 ──────────────────────────────────────────────
echo ">>> 启动后端服务 (FastAPI :8000)..."
cd "$BACKEND_DIR"

if [ ! -d ".venv" ]; then
  echo "    创建虚拟环境..."
  python3 -m venv .venv
fi

echo "    安装 Python 依赖..."
.venv/bin/pip install --quiet \
  --trusted-host pypi.org \
  --trusted-host files.pythonhosted.org \
  --trusted-host pypi.python.org \
  -r requirements.txt

echo "    启动 uvicorn..."
.venv/bin/uvicorn main:app --reload --port 8000 &
BACKEND_PID=$!
echo "    后端 PID: $BACKEND_PID"

# ── 启动前端 ──────────────────────────────────────────────
echo ">>> 启动前端服务 (Next.js :3000)..."
cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
  echo "    安装 Node 依赖..."
  npm install
fi

npm run dev &
FRONTEND_PID=$!
echo "    前端 PID: $FRONTEND_PID"

# ── 等待并处理退出信号 ────────────────────────────────────
echo ""
echo "✓ 服务已启动"
echo "  后端: http://127.0.0.1:8000"
echo "  前端: http://localhost:3000"
echo ""
echo "按 Ctrl+C 停止所有服务"

trap "echo '>>> 停止所有服务...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit 0" INT TERM

wait
