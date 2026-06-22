#!/usr/bin/env bash
# deploy-sit.sh — 部署 Castrel SIT 环境
# 用法: bash .agents/skills/deploy-castrel-sit/scripts/deploy-sit.sh [branch]
# 示例: bash .agents/skills/deploy-castrel-sit/scripts/deploy-sit.sh release/20260514

set -euo pipefail

HOST="69.5.22.221"
PORT="22"
REMOTE_USER="root"
PASSWORD="Yunzhihui123"
DIR="/data/castrel-ai"

# ServerAliveInterval=30 x ServerAliveCountMax=20 = 最长保持 10 分钟
SSH_OPTS=(-o StrictHostKeyChecking=no -o ConnectTimeout=15 -o ServerAliveInterval=30 -o ServerAliveCountMax=20 -p "$PORT")
ssh_run() {
    sshpass -p "$PASSWORD" ssh "${SSH_OPTS[@]}" "${REMOTE_USER}@${HOST}" "$1"
}
ts() { date '+%H:%M:%S'; }

# ── 分支选择 ─────────────────────────────────────────────
BRANCH="${1:-}"

if [[ -z "${BRANCH}" ]]; then
    # 未传参：从远端获取候选分支，强制用户手动选择
    echo "[探测分支] 从远端服务器获取最近 release 分支..."
    RECENT_RELEASES=$(ssh_run "cd ${DIR} && git fetch origin --prune -q 2>/dev/null && git branch -r --sort=-committerdate | grep 'origin/release/' | sed 's|.*origin/||' | head -5" || true)

    if [[ -z "${RECENT_RELEASES}" ]]; then
        echo "[探测分支] 未找到 release 分支，请手动输入分支名："
        while [[ -z "${BRANCH}" ]]; do
            read -rp "分支名（不可为空）：" BRANCH
            [[ -z "${BRANCH}" ]] && echo "[ERROR] 分支名不能为空，请重新输入"
        done
    else
        echo ""
        echo "探测到最近 release 分支："
        IDX=1
        while IFS= read -r b; do
            echo "  ${IDX}) ${b}"
            IDX=$((IDX + 1))
        done <<< "${RECENT_RELEASES}"
        echo "  ${IDX}) 输入自定义分支"
        echo ""

        TOTAL_LISTED=$((IDX - 1))

        BRANCH_DEFAULT=$(echo "${RECENT_RELEASES}" | sed -n '1p')

        while [[ -z "${BRANCH}" ]]; do
            read -rp "请选择分支（序号或分支名，直接回车选第 1 项：${BRANCH_DEFAULT}）：" CHOICE
            if [[ -z "${CHOICE}" ]]; then
                BRANCH="${BRANCH_DEFAULT}"
            elif [[ "${CHOICE}" =~ ^[0-9]+$ ]]; then
                if [[ "${CHOICE}" -ge 1 && "${CHOICE}" -le "${TOTAL_LISTED}" ]]; then
                    BRANCH=$(echo "${RECENT_RELEASES}" | sed -n "${CHOICE}p")
                elif [[ "${CHOICE}" -eq $((TOTAL_LISTED + 1)) ]]; then
                    while [[ -z "${BRANCH}" ]]; do
                        read -rp "请输入分支名：" BRANCH
                        [[ -z "${BRANCH}" ]] && echo "[ERROR] 分支名不能为空"
                    done
                else
                    echo "[ERROR] 序号 ${CHOICE} 超出范围，请重新选择"
                fi
            else
                BRANCH="${CHOICE}"
            fi
        done
    fi
else
    # 已传参：校验该分支是否存在于远端
    echo "[校验分支] 检查分支 '${BRANCH}' 是否存在于远端..."
    EXISTS=$(ssh_run "cd ${DIR} && git fetch origin --prune -q 2>/dev/null && git branch -r | grep -c 'origin/${BRANCH}$' || true")
    if [[ "${EXISTS}" -eq 0 ]]; then
        echo "[ERROR] 分支 '${BRANCH}' 在远端不存在，请确认分支名后重试"
        exit 1
    fi
    echo "[校验分支] 分支存在，继续部署"
fi

if [[ -z "${BRANCH}" ]]; then
    echo "[ERROR] 未指定分支，退出"
    exit 1
fi

echo ""
echo "[$(ts)] ===== 开始部署 SIT 环境（分支：${BRANCH}）====="

# ── 步骤 1: 切换分支并拉取代码 ───────────────────────────
echo ""
echo "[$(ts)] [1/5] 切换分支并拉取代码..."
ssh_run "cd ${DIR} && git fetch origin && git checkout ${BRANCH} && git pull origin ${BRANCH}"
echo "[$(ts)]       代码拉取完成"

# ── 步骤 2: 停止旧后端进程 ──────────────────────────────
echo ""
echo "[$(ts)] [2/5] 停止旧后端进程..."
# 使用 [c] 字符类技巧避免 pkill 匹配自身的 SSH session 进程
ssh_run "pkill -9 -f '[c]astrel-ai/backend' 2>/dev/null || true; sleep 1; echo done"
echo "[$(ts)]       旧进程已清理"

# ── 步骤 3: 启动后端服务 ─────────────────────────────────
echo ""
echo "[$(ts)] [3/5] 启动后端服务..."
# 同样使用 [c] 字符类技巧避免 pgrep 匹配自身的 SSH session 进程
ssh_run "cd ${DIR} && nohup ./dev.sh dev backend > backend.log 2>&1 & sleep 5 && pgrep -af '[c]astrel-ai/backend' && echo '[OK] 后端进程已确认' || echo '[WARN] 进程暂未检测到，可能仍在初始化，请查看远端 backend.log'"
echo "[$(ts)]       后端启动命令已发出"

# ── 步骤 4: 构建并 reload 前端 ───────────────────────────
echo ""
echo "[$(ts)] [4/5] 构建并 reload 前端（next build 通常需 2-5 分钟，完成后自动继续）..."
if ssh_run "source /root/.nvm/nvm.sh && nvm use v20.20.0 && cd ${DIR}/frontend && pnpm run pm2:reload"; then
    echo "[$(ts)]       前端构建并 reload 完成"
else
    echo "[$(ts)] [WARN] 前端 build 或 reload 失败，继续执行状态检查..."
fi

# ── 步骤 5: 验证前端状态 ─────────────────────────────────
echo ""
echo "[$(ts)] [5/5] 验证前端 PM2 状态..."
ssh_run "source /root/.nvm/nvm.sh && nvm use v20.20.0 && pm2 status castrel-demo" || echo "[$(ts)] [ERROR] 无法获取 PM2 状态"

echo ""
echo "[$(ts)] ===== SIT 环境部署完成 ====="
