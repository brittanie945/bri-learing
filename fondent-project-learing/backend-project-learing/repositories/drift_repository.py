"""数据访问层：漂流瓶相关数据库操作"""
from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import DriftBottle, BottleReply


async def create_bottle(
    db: AsyncSession, author_hash: str, content: str
) -> DriftBottle:
    bottle = DriftBottle(author_hash=author_hash, content=content)
    db.add(bottle)
    await db.commit()
    await db.refresh(bottle)
    return bottle


async def pick_random_bottle(
    db: AsyncSession, picker_hash: str
) -> Optional[DriftBottle]:
    """随机捞取一个未被捞取且不是自己投放的瓶子"""
    result = await db.execute(
        select(DriftBottle)
        .where(
            and_(
                DriftBottle.is_picked == False,  # noqa: E712
                DriftBottle.author_hash != picker_hash,
            )
        )
        .order_by(func.random())
        .limit(1)
    )
    bottle = result.scalar_one_or_none()
    if bottle:
        bottle.is_picked = True
        bottle.picked_by_hash = picker_hash
        bottle.picked_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(bottle)
    return bottle


async def count_picks_today(db: AsyncSession, picker_hash: str) -> int:
    """统计今日已捞次数（每日限 3 次）"""
    today_start = datetime.now(timezone.utc).replace(
        hour=0, minute=0, second=0, microsecond=0
    )
    result = await db.execute(
        select(func.count(DriftBottle.id)).where(
            and_(
                DriftBottle.picked_by_hash == picker_hash,
                DriftBottle.picked_at >= today_start,
            )
        )
    )
    return result.scalar_one() or 0


async def get_bottle_by_id(
    db: AsyncSession, bottle_id: UUID
) -> Optional[DriftBottle]:
    result = await db.execute(
        select(DriftBottle).where(DriftBottle.id == bottle_id)
    )
    return result.scalar_one_or_none()


async def add_reply(
    db: AsyncSession, bottle_id: UUID, replier_hash: str, content: str
) -> BottleReply:
    reply = BottleReply(
        bottle_id=bottle_id, replier_hash=replier_hash, content=content
    )
    db.add(reply)
    await db.commit()
    await db.refresh(reply)
    return reply


async def get_replies_for_bottle(
    db: AsyncSession, bottle_id: UUID
) -> list[BottleReply]:
    result = await db.execute(
        select(BottleReply)
        .where(BottleReply.bottle_id == bottle_id)
        .order_by(BottleReply.created_at.asc())
    )
    return list(result.scalars().all())


async def get_my_bottles(
    db: AsyncSession, author_hash: str
) -> list[DriftBottle]:
    result = await db.execute(
        select(DriftBottle)
        .where(DriftBottle.author_hash == author_hash)
        .order_by(DriftBottle.created_at.desc())
    )
    return list(result.scalars().all())
