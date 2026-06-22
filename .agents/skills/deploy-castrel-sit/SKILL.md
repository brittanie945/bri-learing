---
name: deploy-castrel-sit
description: Deploy Castrel frontend and backend to the SIT environment via SSH. Use when the user says "部署 SIT", "deploy SIT", "发布到 SIT", "更新 SIT 环境", "deploy-castrel-sit", or provides a branch name to deploy. Automates code pull, backend restart, frontend build, and PM2 reload in one command.
---

# Deploy Castrel SIT

## 环境信息

| 项目       | 值                 |
| ---------- | ------------------ |
| 主机       | `69.5.22.221`      |
| 用户       | `root`             |
| 代码目录   | `/data/castrel-ai` |
| PM2 进程名 | `castrel-demo`     |

## 执行步骤（必须按顺序执行）

### Step 1 — 确认分支名

- 如果用户已在消息中明确提供分支名 → 跳至 Step 2，带参数执行脚本。
- 如果用户**未提供分支名** → **直接运行脚本（不带参数）**，脚本会自动从远端探测候选分支并进入交互选择模式，由用户在终端中自行选择，**Agent 不得替用户选择或填入分支参数**。

### Step 2 — 执行部署

**已知分支**（用户明确提供）：

```bash
bash .agents/skills/deploy-castrel-sit/scripts/deploy-sit.sh <branch>
```

示例：

```bash
bash .agents/skills/deploy-castrel-sit/scripts/deploy-sit.sh release/20260514
```

脚本会先校验分支是否存在于远端，不存在则报错退出，不会继续部署。

**未提供分支**（让用户交互选择）：

```bash
bash .agents/skills/deploy-castrel-sit/scripts/deploy-sit.sh
```

交互示例：

```
[探测分支] 从远端服务器获取最近 release 分支...

探测到最近 release 分支：
  1) release/20260514
  2) release/20260430
  3) 输入自定义分支

请选择分支（输入序号或分支名，不可为空）：
```

> 用户可以输入序号或分支名，直接回车选第 1 项。交互选择由用户在终端中自行操作，**Agent 不得替用户做分支参数填入**。

## 前置条件

- 本地已安装 `sshpass`（`brew install sshpass`）
