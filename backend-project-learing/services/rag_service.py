"""业务逻辑层：RAG 检索编排。

提供语义搜索、相关日记发现、聊天上下文检索等 RAG 核心功能。
"""

import logging
from typing import Optional
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from core.embeddings import generate_embedding, generate_diary_embedding, _prepare_text
from repositories.embedding_repository import (
    find_similar_diaries,
    upsert_embedding,
    get_embedding,
)

logger = logging.getLogger(__name__)


async def svc_semantic_search(
    db: AsyncSession,
    user_id: UUID,
    query: str,
    mood: Optional[str] = None,
    tag: Optional[str] = None,
    limit: int = 10,
    offset: int = 0,
) -> list[dict]:
    """
    语义搜索：为查询生成 embedding，查找语义相似的日记条目。

    embedding 生成失败时自动回退到关键词搜索（通过 diary_repository.list_diaries）。
    """
    query_embedding = await generate_embedding(query)

    if query_embedding:
        # 语义搜索 + 后过滤（mood / tag）
        fetch_limit = limit + offset + 10  # 多取一些以补偿后过滤的损失
        results = await find_similar_diaries(
            db,
            user_id=user_id,
            query_embedding=query_embedding,
            limit=fetch_limit,
        )

        # 后过滤：mood 和 tag
        filtered = []
        for row in results:
            if mood and row.get("mood") != mood:
                continue
            if tag:
                from models import DiaryEntry
                from sqlalchemy import select as sa_select
                entry_result = await db.execute(
                    sa_select(DiaryEntry).where(DiaryEntry.id == row["diary_id"])
                )
                entry = entry_result.scalar_one_or_none()
                if not entry or not entry.tags or tag not in entry.tags:
                    continue
            filtered.append(row)
            if len(filtered) >= limit + offset:
                break

        # 分页
        return filtered[offset : offset + limit]
    else:
        # 回退到关键词搜索
        logger.warning(
            "Embedding 生成失败，回退到关键词搜索 query=%s", query[:50]
        )
        from repositories.diary_repository import list_diaries as repo_list

        entries = await repo_list(
            db, user_id, mood=mood, tag=tag, search=query, limit=limit, offset=offset
        )
        return [
            {
                "id": e.id,
                "title": e.title,
                "content_preview": e.content[:200],
                "mood": e.mood,
                "similarity": 0.0,
                "created_at": e.created_at,
            }
            for e in entries
        ]


async def svc_get_related_diaries(
    db: AsyncSession,
    user_id: UUID,
    diary_id: UUID,
    limit: int = 5,
) -> list[dict]:
    """查找与指定日记语义相似的其他日记条目。"""
    emb = await get_embedding(db, diary_id)
    if not emb:
        return []

    results = await find_similar_diaries(
        db,
        user_id=user_id,
        query_embedding=emb.embedding,
        limit=limit,
        exclude_diary_id=diary_id,
    )
    return results


async def svc_ensure_diary_embedding(
    db: AsyncSession,
    diary_id: UUID,
    title: str,
    content: str,
) -> bool:
    """
    为日记条目生成并存储 embedding。

    由日记 CRUD 操作触发（fire-and-forget 模式）。
    返回 True 表示成功。
    """
    embedding = await generate_diary_embedding(title, content)
    if not embedding:
        return False

    text_snapshot = _prepare_text(title, content)
    await upsert_embedding(
        db,
        diary_id=diary_id,
        embedding=embedding,
        text_snapshot=text_snapshot,
    )
    return True


async def svc_retrieve_for_chat(
    db: AsyncSession,
    user_id: UUID,
    user_message: str,
    limit: int = 15,
) -> list[dict]:
    """
    为聊天上下文提供语义检索：
    1. 生成用户消息的 embedding
    2. 查找语义相似的日记条目
    3. 返回去重后的结果列表
    """
    query_embedding = await generate_embedding(user_message)

    if not query_embedding:
        return []

    results = await find_similar_diaries(
        db,
        user_id=user_id,
        query_embedding=query_embedding,
        limit=limit,
    )

    # 按 diary_id 去重，保持相似度排序
    seen = set()
    merged = []
    for row in results:
        if row["diary_id"] not in seen:
            seen.add(row["diary_id"])
            merged.append(row)

    return merged[:limit]
