"""
init_db.py — 数据库初始化、增量更新与重置工具

用法（在项目根目录执行）：
    python app/database/init_db.py init     # 初始化：创建所有不存在的表（幂等）
    python app/database/init_db.py upgrade  # 增量更新：补充缺失列/表，不丢失数据
    python app/database/init_db.py reset    # 重置：清空全部数据后重建表结构
"""

import asyncio
import os
import sys

# 将项目根目录加入 sys.path，使直接运行脚本时可正常导入根目录的模块
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import inspect, text
from sqlalchemy.ext.asyncio import create_async_engine

from database import Base, DATABASE_URL
import models  # noqa: F401 — 确保所有 ORM 模型已注册到 Base.metadata


# ---------------------------------------------------------------------------
# 初始化
# ---------------------------------------------------------------------------

async def init_db(engine) -> None:
    """创建所有尚不存在的表（checkfirst=True，幂等操作，不修改已有表）。"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("[init] 数据库初始化完成。")


# ---------------------------------------------------------------------------
# 增量更新
# ---------------------------------------------------------------------------

async def upgrade_db(engine) -> None:
    """增量更新：

    1. 创建所有尚不存在的新表。
    2. 对已存在的表，补充 ORM 模型中新增但数据库中缺失的列。

    注意：此工具不处理列类型变更或列删除。如需复杂迁移，请使用 Alembic。
    """
    async with engine.begin() as conn:
        # 第一步：创建新增表
        await conn.run_sync(Base.metadata.create_all)

        # 第二步：检查并补充缺失列
        def _add_missing_columns(sync_conn):
            inspector = inspect(sync_conn)
            existing_tables = set(inspector.get_table_names())
            added: list[str] = []

            for table in Base.metadata.sorted_tables:
                if table.name not in existing_tables:
                    continue  # 新表已在第一步创建

                existing_col_names = {
                    col["name"] for col in inspector.get_columns(table.name)
                }

                for col in table.columns:
                    if col.name in existing_col_names:
                        continue

                    # 构造 ALTER TABLE ... ADD COLUMN DDL
                    col_type = col.type.compile(dialect=sync_conn.dialect)
                    nullable_clause = "" if col.nullable else " NOT NULL"

                    default_clause = ""
                    if col.server_default is not None:
                        default_clause = f" DEFAULT {col.server_default.arg}"
                    elif col.default is not None and col.default.is_scalar:
                        default_clause = f" DEFAULT {col.default.arg!r}"

                    ddl = (
                        f'ALTER TABLE "{table.name}" '
                        f'ADD COLUMN "{col.name}" {col_type}'
                        f"{default_clause}{nullable_clause}"
                    )
                    sync_conn.execute(text(ddl))
                    added.append(f"{table.name}.{col.name}")

            if added:
                print(f"[upgrade] 已添加缺失列：{', '.join(added)}")
            else:
                print("[upgrade] 无需更新，所有表结构已是最新。")

        await conn.run_sync(_add_missing_columns)


# ---------------------------------------------------------------------------
# 重置
# ---------------------------------------------------------------------------

async def reset_db(engine) -> None:
    """重置：删除全部表后重新创建（所有数据将被永久清空！）。"""
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("[reset] 数据库已重置，所有表结构已重建。")


# ---------------------------------------------------------------------------
# 入口
# ---------------------------------------------------------------------------

async def main() -> None:
    if not DATABASE_URL:
        print("错误：DATABASE_URL 环境变量未设置，请检查 .env 文件。")
        sys.exit(1)

    command = sys.argv[1] if len(sys.argv) > 1 else "init"
    engine = create_async_engine(DATABASE_URL, echo=False)

    try:
        if command == "init":
            await init_db(engine)

        elif command == "upgrade":
            await upgrade_db(engine)

        elif command == "reset":
            confirm = input(
                "[reset] 警告：此操作将永久清空所有数据！确认请输入 yes："
            )
            if confirm.strip().lower() == "yes":
                await reset_db(engine)
            else:
                print("[reset] 已取消。")

        else:
            print(f"未知命令：{command!r}")
            print("可用命令：init | upgrade | reset")
            sys.exit(1)

    finally:
        await engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
