"""数据访问层：时光种子"""
from datetime import datetime, timezone
from uuid import UUID
from typing import Optional, List

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from models import Seed


async def get_active_seed(db: AsyncSession, user_id: UUID) -> Optional[Seed]:
    result = await db.execute(
        select(Seed).where(
            Seed.user_id == user_id,
            Seed.status == "growing",
        )
    )
    return result.scalar_one_or_none()


async def get_all_seeds(db: AsyncSession, user_id: UUID) -> List[Seed]:
    result = await db.execute(
        select(Seed)
        .where(Seed.user_id == user_id)
        .order_by(Seed.planted_at.desc())
    )
    return list(result.scalars().all())


async def create_seed(
    db: AsyncSession,
    user_id: UUID,
    seed_type: str,
    task_note: Optional[str] = None,
) -> Seed:
    now = datetime.now(timezone.utc)
    seed = Seed(
        user_id=user_id,
        seed_type=seed_type,
        task_note=task_note,
        status="growing",
        streak_days=1,
        planted_at=now,
        last_watered_at=now,
    )
    db.add(seed)
    await db.commit()
    await db.refresh(seed)
    return seed


def _seed_last_watered_date(seed: Seed):
    lw = seed.last_watered_at
    if lw.tzinfo is None:
        lw = lw.replace(tzinfo=timezone.utc)
    return lw.date()


async def auto_wither_if_missed(db: AsyncSession, seed: Seed) -> bool:
    """惰性枯萎检测：若距上次浇水超过1天则标记枯萎。返回 True 表示已枯萎。"""
    today = datetime.now(timezone.utc).date()
    days_missed = (today - _seed_last_watered_date(seed)).days
    if days_missed > 1:
        seed.status = "withered"
        seed.withered_at = datetime.now(timezone.utc)
        seed.wither_day = seed.streak_days
        await db.commit()
        await db.refresh(seed)
        return True
    return False


async def water_seed(db: AsyncSession, seed: Seed) -> Seed:
    """浇水：streak+1，达到3天则发芽。"""
    seed.streak_days += 1
    seed.last_watered_at = datetime.now(timezone.utc)
    if seed.streak_days >= 3:
        seed.status = "sprouted"
        seed.sprouted_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(seed)
    return seed


async def revive_seed(db: AsyncSession, seed: Seed) -> Seed:
    """复活枯萎种子：streak 重置为 1，状态改回 growing。"""
    seed.status = "growing"
    seed.streak_days = 1
    seed.is_revived = True
    seed.withered_at = None
    seed.wither_day = None
    seed.last_watered_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(seed)
    return seed
