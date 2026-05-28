$ErrorActionPreference = "Stop"

$WORKSPACE_DIR = Split-Path -Parent $PSScriptRoot
$BACKEND_DIR   = Join-Path $WORKSPACE_DIR "backend-project-learing"
$FRONTEND_DIR  = Join-Path $WORKSPACE_DIR "fondent-project-learing"

# ── 启动后端 ──────────────────────────────────────────────
Write-Host ">>> 启动后端服务 (FastAPI :8000)..." -ForegroundColor Cyan
Set-Location $BACKEND_DIR

if (-not (Test-Path ".venv")) {
    Write-Host "    创建虚拟环境..."
    uv venv
}

Write-Host "    安装 Python 依赖..."
uv pip install -r requirements.txt

Write-Host "    启动 uvicorn..."
$backendProc = Start-Process -FilePath "uv" `
    -ArgumentList "run","uvicorn","main:app","--reload","--port","8000" `
    -PassThru -NoNewWindow
Write-Host "    后端 PID: $($backendProc.Id)"

# ── 启动前端 ──────────────────────────────────────────────
Write-Host ">>> 启动前端服务 (Next.js :3000)..." -ForegroundColor Cyan
Set-Location $FRONTEND_DIR

if (-not (Test-Path "node_modules")) {
    Write-Host "    安装 Node 依赖..."
    npm install
}

$frontendProc = Start-Process -FilePath "cmd" `
    -ArgumentList "/c","npm","run","dev" `
    -PassThru -NoNewWindow -WorkingDirectory $FRONTEND_DIR
Write-Host "    前端 PID: $($frontendProc.Id)"

# ── 等待并处理退出信号 ────────────────────────────────────
Write-Host ""
Write-Host "✓ 服务已启动" -ForegroundColor Green
Write-Host "  后端: http://127.0.0.1:8000"
Write-Host "  前端: http://localhost:3000"
Write-Host ""
Write-Host "按 Ctrl+C 停止所有服务"

try {
    while ($true) { Start-Sleep -Seconds 1 }
} finally {
    Write-Host ">>> 停止所有服务..." -ForegroundColor Yellow
    if ($backendProc -and -not $backendProc.HasExited)  { Stop-Process -Id $backendProc.Id  -Force -ErrorAction SilentlyContinue }
    if ($frontendProc -and -not $frontendProc.HasExited) { Stop-Process -Id $frontendProc.Id -Force -ErrorAction SilentlyContinue }
}
