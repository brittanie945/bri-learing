"""业务逻辑层：日记 & 时间胶囊"""
import asyncio
import logging
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.diary_repository import (
    create_diary,
    get_diary_by_id,
    list_diaries,
    update_diary,
    soft_delete_diary,
    get_mood_stats,
    get_diary_dates,
    get_diary_on_date,
)
from schemas.diary_schemas import (
    DiaryCreate,
    DiaryUpdate,
    DiaryResponse,
    DiaryListResponse,
    MoodStats,
    MoodStatsItem,
)

logger = logging.getLogger(__name__)


async def _compute_streak(db: AsyncSession, user_id: UUID) -> int:
    """计算连续打卡天数（复用逻辑，供多处调用）。"""
    dates = await get_diary_dates(db, user_id)
    streak = 0
    if dates:
        today = datetime.now(timezone.utc).date()
        for i, d in enumerate(dates):
            expected = today - __import__("datetime").timedelta(days=i)
            if d == expected:
                streak += 1
            else:
                break
    return streak


async def svc_create_diary(
    db: AsyncSession, user_id: UUID, data: DiaryCreate, is_ai_generated: bool = False
) -> tuple[DiaryResponse, int]:
    """创建日记，返回 (diary, coins_earned)。"""
    # 时间胶囊：unlock_at 必须在未来
    if data.is_capsule:
        if not data.unlock_at:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="时间胶囊必须设置解锁日期",
            )
        if data.unlock_at <= datetime.now(timezone.utc):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="解锁日期必须在未来",
            )
    entry = await create_diary(
        db,
        user_id=user_id,
        title=data.title,
        content=data.content,
        mood=data.mood,
        weather=data.weather,
        tags=data.tags or [],
        is_capsule=data.is_capsule,
        unlock_at=data.unlock_at,
        self_destruct_days=data.self_destruct_days,
        is_ai_generated=is_ai_generated,
    )

    # 打卡奖励（每天首次写日记才奖励）
    from services.coin_service import svc_diary_checkin_coins
    streak = await _compute_streak(db, user_id)
    checkin = await svc_diary_checkin_coins(db, user_id, streak)

    # 异步生成 embedding（fire-and-forget，不影响日记创建）
    from services.rag_service import svc_ensure_diary_embedding
    asyncio.ensure_future(
        svc_ensure_diary_embedding(db, entry.id, entry.title, entry.content)
    )

    return DiaryResponse.model_validate(entry), checkin.coins_earned


async def svc_get_diary(
    db: AsyncSession, user_id: UUID, diary_id: UUID
) -> DiaryResponse:
    entry = await get_diary_by_id(db, diary_id, user_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="日记不存在")

    # 时间胶囊：锁定期内不返回内容
    if entry.is_capsule and entry.unlock_at and entry.unlock_at > datetime.now(timezone.utc):
        locked = DiaryResponse.model_validate(entry)
        locked.content = ""  # 屏蔽内容
        return locked

    return DiaryResponse.model_validate(entry)


async def svc_list_diaries(
    db: AsyncSession,
    user_id: UUID,
    mood: Optional[str] = None,
    is_capsule: Optional[bool] = None,
    tag: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 20,
    offset: int = 0,
) -> list[DiaryListResponse]:
    entries = await list_diaries(
        db, user_id, mood=mood, is_capsule=is_capsule,
        tag=tag, search=search, limit=limit, offset=offset,
    )
    return [DiaryListResponse.model_validate(e) for e in entries]


async def svc_update_diary(
    db: AsyncSession, user_id: UUID, diary_id: UUID, data: DiaryUpdate
) -> DiaryResponse:
    entry = await get_diary_by_id(db, diary_id, user_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="日记不存在")
    if entry.is_capsule:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="时间胶囊不可编辑"
        )
    updated = await update_diary(
        db, entry, **{k: v for k, v in data.model_dump().items() if v is not None}
    )

    # 标题或内容变更时重新生成 embedding
    if data.title or data.content:
        from services.rag_service import svc_ensure_diary_embedding
        asyncio.ensure_future(
            svc_ensure_diary_embedding(db, updated.id, updated.title, updated.content)
        )

    return DiaryResponse.model_validate(updated)


async def svc_delete_diary(
    db: AsyncSession, user_id: UUID, diary_id: UUID
) -> None:
    entry = await get_diary_by_id(db, diary_id, user_id)
    if not entry:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="日记不存在")
    await soft_delete_diary(db, entry)

    # 同步删除对应 embedding
    from repositories.embedding_repository import delete_embedding
    await delete_embedding(db, diary_id)


async def svc_mood_stats(db: AsyncSession, user_id: UUID) -> MoodStats:
    raw = await get_mood_stats(db, user_id)
    stats = [MoodStatsItem(mood=mood, count=cnt) for mood, cnt in raw]
    total = sum(s.count for s in stats)
    streak = await _compute_streak(db, user_id)
    return MoodStats(stats=stats, streak=streak, total=total)


async def svc_memory_lane(
    db: AsyncSession, user_id: UUID
) -> list[DiaryListResponse]:
    """回望：历史上的今天"""
    now = datetime.now(timezone.utc)
    entries = await get_diary_on_date(db, user_id, now.month, now.day)
    # 过滤掉今年的（只要历史）
    past = [e for e in entries if e.created_at.year < now.year]
    return [DiaryListResponse.model_validate(e) for e in past]
