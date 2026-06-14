"""数据访问层：日记相关数据库操作"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, func, cast, Date, text
from sqlalchemy.ext.asyncio import AsyncSession

from models import DiaryEntry


async def create_diary(db: AsyncSession, user_id: UUID, **kwargs) -> DiaryEntry:
    entry = DiaryEntry(user_id=user_id, **kwargs)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry


async def get_diary_by_id(
    db: AsyncSession, diary_id: UUID, user_id: UUID
) -> Optional[DiaryEntry]:
    result = await db.execute(
        select(DiaryEntry).where(
            and_(
                DiaryEntry.id == diary_id,
                DiaryEntry.user_id == user_id,
                DiaryEntry.is_deleted == False,  # noqa: E712
            )
        )
    )
    return result.scalar_one_or_none()


async def list_diaries(
    db: AsyncSession,
    user_id: UUID,
    mood: Optional[str] = None,
    is_capsule: Optional[bool] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> list[DiaryEntry]:
    filters = [
        DiaryEntry.user_id == user_id,
        DiaryEntry.is_deleted == False,  # noqa: E712
    ]
    if mood:
        filters.append(DiaryEntry.mood == mood)
    if is_capsule is not None:
        filters.append(DiaryEntry.is_capsule == is_capsule)
    if search:
        filters.append(DiaryEntry.title.ilike(f"%{search}%"))
    if tag:
        # JSONB contains element
        filters.append(DiaryEntry.tags.contains([tag]))

    result = await db.execute(
        select(DiaryEntry)
        .where(and_(*filters))
        .order_by(DiaryEntry.created_at.desc())
        .limit(limit)
        .offset(offset)
    )
    return list(result.scalars().all())


async def update_diary(
    db: AsyncSession, entry: DiaryEntry, **kwargs
) -> DiaryEntry:
    for key, value in kwargs.items():
        if value is not None:
            setattr(entry, key, value)
    await db.commit()
    await db.refresh(entry)
    return entry


async def soft_delete_diary(db: AsyncSession, entry: DiaryEntry) -> None:
    entry.is_deleted = True
    await db.commit()


async def get_mood_stats(
    db: AsyncSession, user_id: UUID
) -> list[tuple[Optional[str], int]]:
    """按心情聚合计数"""
    result = await db.execute(
        select(DiaryEntry.mood, func.count(DiaryEntry.id).label("cnt"))
        .where(
            and_(DiaryEntry.user_id == user_id, DiaryEntry.is_deleted == False)  # noqa: E712
        )
        .group_by(DiaryEntry.mood)
    )
    return result.all()


async def get_diary_dates(db: AsyncSession, user_id: UUID) -> list[datetime]:
    """获取所有有日记的日期（用于连续打卡计算）"""
    result = await db.execute(
        select(cast(DiaryEntry.created_at, Date))
        .where(
            and_(DiaryEntry.user_id == user_id, DiaryEntry.is_deleted == False)  # noqa: E712
        )
        .distinct()
        .order_by(cast(DiaryEntry.created_at, Date).desc())
    )
    return list(result.scalars().all())


async def get_diary_on_date(
    db: AsyncSession, user_id: UUID, month: int, day: int
) -> list[DiaryEntry]:
    """回望：获取历史同一天的日记（跨年）"""
    result = await db.execute(
        select(DiaryEntry).where(
            and_(
                DiaryEntry.user_id == user_id,
                DiaryEntry.is_deleted == False,  # noqa: E712
                func.extract("month", DiaryEntry.created_at) == month,
                func.extract("day", DiaryEntry.created_at) == day,
            )
        ).order_by(DiaryEntry.created_at.desc())
    )
    return list(result.scalars().all())


async def hybrid_search_diaries(
    db: AsyncSession,
    user_id: UUID,
    query_embedding: list[float],
    keyword: Optional[str] = None,
    mood: Optional[str] = None,
    limit: int = 20,
) -> list[DiaryEntry]:
    """
    混合搜索：向量相似度 + 可选关键词加权 + 过滤条件。

    使用 pgvector 余弦距离运算符 <=> 进行语义排序。
    当有关键词时，同时匹配标题和内容做 ILIKE 过滤。
    """
    sql_parts = [
        "SELECT DISTINCT ON (de.id) de.*, "
        "  1 - (demb.embedding <=> :query_embedding) AS similarity "
        "FROM diary_entries de "
        "JOIN diary_embeddings demb ON de.id = demb.diary_id "
        "WHERE de.user_id = :user_id "
        "  AND de.is_deleted = FALSE "
        "  AND de.is_capsule = FALSE "
    ]

    params: dict = {
        "query_embedding": query_embedding,
        "user_id": user_id,
        "limit": limit,
    }

    if mood:
        sql_parts.append("  AND de.mood = :mood")
        params["mood"] = mood

    if keyword:
        sql_parts.append(
            "  AND (de.title ILIKE :kw OR de.content ILIKE :kw)"
        )
        params["kw"] = f"%{keyword}%"

    sql_parts.append(
        "ORDER BY demb.embedding <=> :query_embedding, de.created_at DESC "
        "LIMIT :limit"
    )

    result = await db.execute(text("\n".join(sql_parts)), params)
    return list(result.scalars().all())
