"""
回填脚本 — 为缺少 embedding 的已有日记条目批量生成向量。

用法（在项目根目录执行）：
    python app/database/backfill_embeddings.py

可安全重复运行 — 只处理尚无 embedding 的条目。
"""

import asyncio
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from sqlalchemy import select, and_
from database import async_session
from models import DiaryEntry, DiaryEmbedding
from repositories.embedding_repository import upsert_embedding
from core.embeddings import generate_diary_embedding, _prepare_text


async def backfill(batch_size: int = 20) -> None:
    """为所有缺少 embedding 的日记条目生成向量。"""
    total_processed = 0
    total_failed = 0

    while True:
        async with async_session() as db:
            # 查找尚无 embedding 的日记条目
            subq = select(DiaryEmbedding.diary_id)
            result = await db.execute(
                select(DiaryEntry)
                .where(
                    and_(
                        DiaryEntry.is_deleted == False,  # noqa: E712
                        DiaryEntry.is_capsule == False,  # noqa: E712
                        DiaryEntry.id.notin_(subq),
                    )
                )
                .order_by(DiaryEntry.created_at.desc())
                .limit(batch_size)
            )
            entries = list(result.scalars().all())

            if not entries:
                break  # 全部处理完毕

            count = 0
            for entry in entries:
                embedding = await generate_diary_embedding(entry.title, entry.content)
                if embedding:
                    text_snapshot = _prepare_text(entry.title, entry.content)
                    await upsert_embedding(
                        db,
                        diary_id=entry.id,
                        embedding=embedding,
                        text_snapshot=text_snapshot,
                    )
                    count += 1
                    print(f"  [{total_processed + count}] ✓ {entry.title[:40]}")
                else:
                    total_failed += 1
                    print(f"  [FAIL] {entry.title[:40]} — embedding 生成失败")

                # 遵守 API 限流（免费版约 60 RPM）
                await asyncio.sleep(0.3)

            total_processed += count

    print(f"\n回填完成。成功：{total_processed}，失败：{total_failed}")


if __name__ == "__main__":
    asyncio.run(backfill())
