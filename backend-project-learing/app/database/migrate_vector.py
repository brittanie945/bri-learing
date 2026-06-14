"""
pgvector 迁移脚本 — 启用向量扩展、创建表和 HNSW 索引。

用法（在项目根目录执行）：
    python app/database/migrate_vector.py

前置条件：
    - PostgreSQL 服务器已安装 pgvector 扩展（apt-get install postgresql-16-pgvector）
    - 数据库用户有 CREATE EXTENSION 权限
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
from database import DATABASE_URL, Base
import models  # noqa: F401 — 确保 DiaryEmbedding 模型已注册


async def migrate() -> None:
    if not DATABASE_URL:
        print("错误：DATABASE_URL 环境变量未设置，请检查 .env 文件。")
        sys.exit(1)

    engine = create_async_engine(DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        # 1. 启用 pgvector 扩展
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        print("[migrate_vector] pgvector 扩展已启用。")

        # 2. 创建 diary_embeddings 表（及其他缺失表）
        await conn.run_sync(Base.metadata.create_all)
        print("[migrate_vector] diary_embeddings 表已就绪。")

        # 3. 创建 HNSW 索引用于近似最近邻搜索（余弦距离）
        await conn.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_diary_embeddings_hnsw
            ON diary_embeddings
            USING hnsw (embedding vector_cosine_ops)
            WITH (m = 16, ef_construction = 200)
        """))
        print("[migrate_vector] HNSW 索引已创建（m=16, ef_construction=200, cosine）。")

    await engine.dispose()
    print("[migrate_vector] ✅ 全部完成。")


if __name__ == "__main__":
    asyncio.run(migrate())
