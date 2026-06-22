# 🌳 心洞 — Treehouse

一个以「情感日记」为核心的 Web 应用，帮助用户记录心情、追踪情绪、封存时间胶囊。

## ✨ 功能特性

- 📝 **情感日记** — 记录每日心情，支持情绪标签、天气、自定义标签
- ⏳ **时间胶囊** — 设置解锁日期，写给未来的自己
- 💣 **自毁日记** — 设定自毁天数，到期自动清除
- 🌐 **中英文切换** — 内置 i18n，支持中文 / English
- 🔐 **JWT 认证** — 注册 / 登录，bcrypt 加密

## 🛠 技术栈

| 层级 | 技术 |
|------|------|
| 后端 | FastAPI · SQLAlchemy (async) · asyncpg · PostgreSQL |
| 前端 | Next.js 16 · React 19 · TypeScript · Tailwind CSS · shadcn/ui |
| 国际化 | next-intl |
| 认证 | JWT (python-jose) · bcrypt |

## 📁 项目结构

```
backend-project-learing/       # FastAPI 后端
├── main.py                    # 应用入口
├── models.py                  # ORM 模型（User / DiaryEntry）
├── database.py                # 数据库连接
├── app/database/init_db.py    # 数据库初始化 / 增量更新 / 重置
├── core/security.py           # JWT 生成与校验
├── routers/                   # API 路由（auth / diary）
├── schemas/                   # Pydantic 数据校验
├── services/                  # 业务逻辑
└── repositories/              # 数据访问层

fondent-project-learing/       # Next.js 前端
├── app/
│   ├── login/ & register/     # 认证页面
│   └── (dashboard)/           # 主面板
│       ├── diary/             # 日记列表 & 详情
│       └── settings/          # 个人设置
├── components/                # UI 组件（编辑器 / 情绪选择器 / 语言切换）
├── lib/api/                   # API 客户端
└── messages/                  # i18n 文案（zh / en）

scripts/
└── deploy.sh                  # 一键启动后端 + 前端
```

## 🚀 快速启动

```bash
# 一键启动（后端 :8000 + 前端 :3000）
bash scripts/deploy.sh
```

或分别启动：

```bash
# 后端
cd backend-project-learing
source .venv/bin/activate
uvicorn main:app --reload --port 8000

# 前端
cd fondent-project-learing
npm run dev
```

## 📌 环境变量

| 变量 | 说明 | 示例 |
|------|------|------|
| `DATABASE_URL` | PostgreSQL 异步连接串 | `postgresql+asyncpg://user:pass@localhost:5432/treehouse` |
| `SECRET_KEY` | JWT 签名密钥 | — |
| `NEXT_PUBLIC_API_URL` | 后端 API 地址 | `http://localhost:8000` |

## 📄 License

MIT
