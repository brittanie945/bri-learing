"""数据访问层：向量存储操作 (pgvector)。"""

import uuid
from typing import Optional

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from models import DiaryEmbedding


def _embedding_to_str(embedding: list[float]) -> str:
    """将 Python float list 转为 pgvector 可识别的字符串格式。"""
    return "[" + ",".join(str(v) for v in embedding) + "]"


async def upsert_embedding(
    db: AsyncSession,
    diary_id: uuid.UUID,
    embedding: list[float],
    text_snapshot: str,
    model: str = "embedding-3",
    tokens_used: int = 0,
) -> DiaryEmbedding:
    """插入或更新日记条目的 embedding。"""
    result = await db.execute(
        select(DiaryEmbedding).where(DiaryEmbedding.diary_id == diary_id)
    )
    existing = result.scalar_one_or_none()

    if existing:
        existing.embedding = embedding
        existing.text_snapshot = text_snapshot
        existing.model = model
        existing.tokens_used = tokens_used
    else:
        existing = DiaryEmbedding(
            diary_id=diary_id,
            embedding=embedding,
            text_snapshot=text_snapshot,
            model=model,
            tokens_used=tokens_used,
        )
        db.add(existing)

    await db.commit()
    await db.refresh(existing)
    return existing


async def get_embedding(
    db: AsyncSession, diary_id: uuid.UUID
) -> Optional[DiaryEmbedding]:
    """获取特定日记条目的 embedding。"""
    result = await db.execute(
        select(DiaryEmbedding).where(DiaryEmbedding.diary_id == diary_id)
    )
    return result.scalar_one_or_none()


async def delete_embedding(db: AsyncSession, diary_id: uuid.UUID) -> bool:
    """删除日记条目的 embedding。返回 True 表示已删除。"""
    emb = await get_embedding(db, diary_id)
    if emb:
        await db.delete(emb)
        await db.commit()
        return True
    return False


async def find_similar_diaries(
    db: AsyncSession,
    user_id: uuid.UUID,
    query_embedding: list[float],
    limit: int = 10,
    exclude_diary_id: Optional[uuid.UUID] = None,
) -> list[dict]:
    """
    查找与查询向量语义相似的日记条目，限定在指定用户范围内。

    使用 pgvector 余弦距离运算符 <=>（值越小越相似）。
    返回字段：diary_id, similarity, title, content_preview, mood, created_at。
    """
    exclude_clause = ""
    if exclude_diary_id:
        exclude_clause = "AND de.id != :exclude_id"

    # 使用 ::vector 显式转换，避免 asyncpg 无法处理 Python list 的问题
    sql = f"""
        SELECT
            de.id AS diary_id,
            1 - (demb.embedding <=> CAST(:query_vec AS vector)) AS similarity,
            de.title,
            LEFT(de.content, 200) AS content_preview,
            de.mood,
            de.created_at
        FROM diary_embeddings demb
        JOIN diary_entries de ON de.id = demb.diary_id
        WHERE de.user_id = :user_id
          AND de.is_deleted = FALSE
          AND de.is_capsule = FALSE
          {exclude_clause}
        ORDER BY demb.embedding <=> CAST(:query_vec AS vector)
        LIMIT :limit
    """

    params: dict = {
        "query_vec": _embedding_to_str(query_embedding),
        "user_id": user_id,
        "limit": limit,
    }
    if exclude_diary_id:
        params["exclude_id"] = exclude_diary_id

    result = await db.execute(text(sql), params)
    rows = result.mappings().all()
    return [dict(row) for row in rows]
