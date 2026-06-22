---
name: create-branch
description: Create a development branch and Draft MR from a Linear issue, following team branch naming rules. Use this skill whenever a developer provides a Linear issue key and wants to start development — including when they say "start working on", "begin", "open a branch for", or "set up CAST-xxx". Always use this skill for branch creation; manual branch naming is not allowed.
---

# Create Branch

根据 Linear Issue 自动创建开发分支并同步建立 Draft MR，确保分支命名规范、负责人已配置、变更与 Issue 关联可见。

## Workflow

1. 从 Linear 读取 Issue 信息
2. 校验 Issue 负责人是否已分配
3. 解析分支名称（优先使用 Linear 建议的分支名）
4. 创建本地分支并切换
5. push 分支到远端
6. 创建 Draft MR，关联 Linear Issue
7. 在 Linear Issue 上评论分支和 Draft MR 信息

## Inputs

- Required: `LINEAR_ISSUE_KEY`（例如：`CAST-123`）
- Required: `BASE_BRANCH`（目标基线分支，必须由用户确认；若用户未提供，需先自动探测最近的 release 分支（见 Step 4），然后暂停并询问：「请确认要从哪个分支切出？（默认：`<最近的 release 分支>`）」，用户直接回车则使用探测到的 release 分支；若无 release 分支则回退到 `main`）

## Trigger Convention

标准调用语法：`create-branch CAST-xxx`

收到此命令后，作为完整流程执行，无需额外确认。

## Execution Procedure

### Step 1：读取 Issue 信息

使用 `$linear` skill 读取 Issue：

```
读取 Linear Issue ${LINEAR_ISSUE_KEY}，获取：
- title
- assignee（负责人）
- branchName（Linear 建议的分支名）
- state
```

### Step 2：校验负责人

- 如果 Issue 没有指定负责人，**停止执行**，提示用户先在 Linear 上分配负责人后再建分支
- 负责人必须存在，这是流程规范要求 —— 无人认领的分支是流程漏洞的来源

### Step 3：解析分支名称

1. 优先使用 Linear Issue 的 `branchName` 字段
2. 若 `branchName` 为空，按以下规则生成：
   - 格式：`<issue-key-lowercase>-<title-slug>`
   - title-slug：全小写 + 空格替换为 `-` + 去除特殊字符
   - 示例：`CAST-42` + `用户登录功能` → `cast-42-user-login`
3. **强制清洗分支名（无论来源是 Linear 还是自行生成）**：
   - **禁止出现中文、拼音或中英混杂、有特殊字符的分支名**
4. 确认本地不存在同名分支，避免冲突

### Step 4：探测基线分支 & 创建并切换分支

**4.1 探测最近 release 分支（仅当用户未指定 BASE_BRANCH 时执行）：**

```bash
# 拉取最新远端信息
git fetch origin --prune

# 列出所有远端 release/* 分支，按提交时间倒序取最近两条
RECENT_RELEASES=$(git branch -r --sort=-committerdate \
  | grep 'origin/release/' \
  | sed 's|.*origin/||' \
  | head -2)

# 取第一条作为默认值
DEFAULT_BASE=$(echo "$RECENT_RELEASES" | head -1)
DEFAULT_BASE=${DEFAULT_BASE:-main}

echo "探测到最近 release 分支："
echo "$RECENT_RELEASES"
```

将探测到的**最近两条 release 分支**作为可选项列出，第一条作为默认值，询问用户：

```
探测到最近两个 release 分支：
  1) <branch-1>（最新，默认）
  2) <branch-2>

请确认要从哪个分支切出？（直接回车使用默认：<branch-1>）
```

用户确认后赋值给 `BASE_BRANCH`。若无 release 分支则直接使用 `main`。

**4.2 创建并切换分支：**

```bash
# BASE_BRANCH 必须来自用户确认
git checkout -b "${BRANCH_NAME}" "origin/${BASE_BRANCH}"
```

### Step 5：推送分支到远端

```bash
git push -u origin "${BRANCH_NAME}"
```

### Step 6：创建 Draft MR

**必须通过 CLI 直接创建 Draft MR，禁止输出链接让开发者手动点击。** 执行完毕后从命令输出中提取 MR URL 备用。

先组装 MR 描述模板（赋值到 shell 变量 `MR_BODY`）：

```
## 关联 Issue

- **Issue**: [${LINEAR_ISSUE_KEY}](https://linear.app/castrel/issue/${LINEAR_ISSUE_KEY}) ${ISSUE_TITLE}
- **负责人**: ${ASSIGNEE_NAME}

## 变更概述

${具体变更内容}
```

根据远端类型选择工具：

**GitHub：**

```bash
MR_URL=$(gh pr create \
  --base "${BASE_BRANCH}" \
  --head "${BRANCH_NAME}" \
  --title "Draft: [${LINEAR_ISSUE_KEY}] ${ISSUE_TITLE}" \
  --body "${MR_BODY}" \
  --draft \
  --no-browser)
echo "Draft PR created: ${MR_URL}"
```

**GitLab：**

```bash
MR_RESPONSE=$(curl -s -X POST "https://${GITLAB_HOST}/api/v4/projects/${PROJECT_ID}/merge_requests" \
  -H "PRIVATE-TOKEN: ${GITLAB_TOKEN}" \
  -H "Content-Type: application/json" \
  -d "{
    \"source_branch\": \"${BRANCH_NAME}\",
    \"target_branch\": \"${BASE_BRANCH}\",
    \"title\": \"Draft: [${LINEAR_ISSUE_KEY}] ${ISSUE_TITLE}\",
    \"description\": \"Linear Issue: ${LINEAR_ISSUE_KEY}\",
    \"draft\": true
  }")
MR_IID=$(echo "$MR_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['iid'])")
MR_URL=$(echo "$MR_RESPONSE" | python3 -c "import sys,json; print(json.load(sys.stdin)['web_url'])")
```

若使用 `glab`（需已配置 token）：
```bash
MR_URL=$(glab mr create \
  --draft \
  --source-branch "${BRANCH_NAME}" \
  --target-branch "${BASE_BRANCH}" \
  --title "Draft: [${LINEAR_ISSUE_KEY}] ${ISSUE_TITLE}" \
  --description "${MR_BODY}" \
  --yes)
MR_IID=$(echo "$MR_URL" | grep -oE '[0-9]+$')
echo "Draft MR created: ${MR_URL}"
```

Draft MR 的作用是尽早建立代码变更与 Linear Issue 的关联，让研发、测试、管理侧都能看到当前工作的开发状态，避免"黑盒开发"。

### Step 7：评论到 Linear Issue

```
分支已创建：
- Branch: ${BRANCH_NAME}
- Base: ${BASE_BRANCH}
- Draft MR: ${MR_URL}
- 状态：开发中
```

## Linear Integration

按以下优先级降级，不以"工具不可用"为由中断流程：

1. **MCP Tools（`mcp__linear`）** — 优先使用 `$linear` skill 读取和评论 Issue
2. **`linear` CLI** — MCP 不可用时降级使用

   执行前先检查 CLI 是否已安装：

   ```bash
   command -v linear
   ```

   若命令未找到（`command not found`），需先安装：

   ```bash
   # 通过 npm 全局安装
   npm install -g @linear/cli

   # 或通过 yarn
   yarn global add @linear/cli
   ```

   安装后验证并配置 token（参考 `castrel-ai/.agents/skills/linear-dev/SKILL.md` 的 Linear Integration 章节）：

   ```bash
   linear auth login
   ```

3. **Linear GraphQL API** — 若 CLI 未安装或 token 未配置，使用 `LINEAR_API_KEY` 直接调用 Linear GraphQL API

## Guardrails

- **禁止手工随意命名分支**，命名必须来自 Linear 模板或本 skill 的生成规则
- **禁止直接 push 到 `main` 或 `release/*`**，这些分支受保护
- 负责人未分配时必须停止，不允许跳过校验继续建分支
- 每个 Issue 对应一个分支，避免多个 Issue 共用同一分支
