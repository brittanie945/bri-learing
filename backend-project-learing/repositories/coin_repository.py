"""数据访问层：时光币余额、流水、打卡记录、道具库存"""
from datetime import date, datetime, timezone
from uuid import UUID
from typing import List

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from models import User, CoinTransaction, DailyCheckin, UserVoucher


async def get_balance(db: AsyncSession, user_id: UUID) -> int:
    result = await db.execute(select(User.coins).where(User.id == user_id))
    return result.scalar_one_or_none() or 0


async def get_totals(db: AsyncSession, user_id: UUID) -> tuple[int, int]:
    """返回 (total_earned, total_spent)"""
    earned_q = await db.execute(
        select(func.coalesce(func.sum(CoinTransaction.amount), 0)).where(
            CoinTransaction.user_id == user_id,
            CoinTransaction.type == "EARN",
        )
    )
    spent_q = await db.execute(
        select(func.coalesce(func.sum(func.abs(CoinTransaction.amount)), 0)).where(
            CoinTransaction.user_id == user_id,
            CoinTransaction.type == "SPEND",
        )
    )
    return int(earned_q.scalar()), int(spent_q.scalar())


async def add_coins(
    db: AsyncSession,
    user_id: UUID,
    amount: int,
    reason: str,
    related_id: str | None = None,
) -> CoinTransaction:
    """增加时光币，记录流水，更新 User.coins（amount 必须为正数）。"""
    tx = CoinTransaction(
        user_id=user_id,
        amount=amount,
        type="EARN",
        reason=reason,
        related_id=related_id,
    )
    db.add(tx)
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()
    user.coins += amount
    await db.commit()
    await db.refresh(tx)
    return tx


async def deduct_coins(
    db: AsyncSession,
    user_id: UUID,
    amount: int,
    reason: str,
    related_id: str | None = None,
) -> CoinTransaction:
    """扣除时光币，余额不足时抛 ValueError（amount 必须为正数）。"""
    user_result = await db.execute(select(User).where(User.id == user_id))
    user = user_result.scalar_one()
    if user.coins < amount:
        raise ValueError(f"时光币不足，当前余额 {user.coins}，需要 {amount}")
    tx = CoinTransaction(
        user_id=user_id,
        amount=-amount,
        type="SPEND",
        reason=reason,
        related_id=related_id,
    )
    db.add(tx)
    user.coins -= amount
    await db.commit()
    await db.refresh(tx)
    return tx


async def has_checked_in_today(db: AsyncSession, user_id: UUID, today: date) -> bool:
    result = await db.execute(
        select(DailyCheckin).where(
            DailyCheckin.user_id == user_id,
            DailyCheckin.checkin_date == today,
        )
    )
    return result.scalar_one_or_none() is not None


async def record_checkin(
    db: AsyncSession, user_id: UUID, today: date, coins_earned: int
) -> DailyCheckin:
    checkin = DailyCheckin(user_id=user_id, checkin_date=today, coins_earned=coins_earned)
    db.add(checkin)
    await db.commit()
    await db.refresh(checkin)
    return checkin


async def get_history(
    db: AsyncSession, user_id: UUID, limit: int = 20
) -> List[CoinTransaction]:
    result = await db.execute(
        select(CoinTransaction)
        .where(CoinTransaction.user_id == user_id)
        .order_by(CoinTransaction.created_at.desc())
        .limit(limit)
    )
    return list(result.scalars().all())


# ────── 道具库存 ──────

async def get_voucher_inventory(
    db: AsyncSession, user_id: UUID
) -> List[UserVoucher]:
    """返回用户所有道具的库存行（quantity > 0）。"""
    result = await db.execute(
        select(UserVoucher).where(
            UserVoucher.user_id == user_id,
            UserVoucher.quantity > 0,
        )
    )
    return list(result.scalars().all())


async def add_voucher(
    db: AsyncSession, user_id: UUID, voucher_type: str
) -> UserVoucher:
    """购买一张券：库存 +1（upsert）。"""
    result = await db.execute(
        select(UserVoucher).where(
            UserVoucher.user_id == user_id,
            UserVoucher.voucher_type == voucher_type,
        )
    )
    row = result.scalar_one_or_none()
    if row:
        row.quantity += 1
    else:
        row = UserVoucher(user_id=user_id, voucher_type=voucher_type, quantity=1)
        db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def consume_voucher(
    db: AsyncSession, user_id: UUID, voucher_type: str
) -> UserVoucher:
    """使用一张券：库存 -1，库存不足时抛 ValueError。"""
    result = await db.execute(
        select(UserVoucher).where(
            UserVoucher.user_id == user_id,
            UserVoucher.voucher_type == voucher_type,
        )
    )
    row = result.scalar_one_or_none()
    if not row or row.quantity <= 0:
        raise ValueError("该道具库存不足，请先在商城购买")
    row.quantity -= 1
    await db.commit()
    await db.refresh(row)
    return row
