"""业务逻辑层：时光币 & 道具消费"""
from datetime import datetime, timezone, timedelta
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from models import DiaryEntry
from repositories.coin_repository import (
    add_coins,
    deduct_coins,
    get_balance,
    get_totals,
    get_history,
    has_checked_in_today,
    record_checkin,
    add_voucher,
    consume_voucher,
    get_voucher_inventory,
)
from schemas.coin_schemas import (
    CoinBalanceResponse,
    CoinTransactionItem,
    UseVoucherResponse,
    BuyVoucherResponse,
    VoucherInventoryItem,
    VoucherType,
    VOUCHER_COST,
    CheckinResult,
)

# 打卡连续天数加成阈值
_STREAK_BONUS = [(30, 10), (7, 5), (3, 2)]


async def svc_diary_checkin_coins(
    db: AsyncSession, user_id: UUID, streak_days: int
) -> CheckinResult:
    """写日记后触发打卡奖励（今日幂等）。"""
    today = datetime.now(timezone.utc).date()
    already = await has_checked_in_today(db, user_id, today)
    if already:
        return CheckinResult(coins_earned=0, streak_days=streak_days, already_checked_in=True)

    base = 5
    bonus = next((b for threshold, b in _STREAK_BONUS if streak_days >= threshold), 0)
    total = base + bonus

    await record_checkin(db, user_id, today, total)
    await add_coins(db, user_id, total, "DIARY_CHECKIN")

    return CheckinResult(coins_earned=total, streak_days=streak_days, already_checked_in=False)


async def svc_get_balance(db: AsyncSession, user_id: UUID) -> CoinBalanceResponse:
    balance = await get_balance(db, user_id)
    earned, spent = await get_totals(db, user_id)
    return CoinBalanceResponse(balance=balance, total_earned=earned, total_spent=spent)


async def svc_get_history(
    db: AsyncSession, user_id: UUID, limit: int = 20
) -> list[CoinTransactionItem]:
    txs = await get_history(db, user_id, limit)
    return [CoinTransactionItem.model_validate(tx) for tx in txs]


async def svc_get_inventory(
    db: AsyncSession, user_id: UUID
) -> list[VoucherInventoryItem]:
    rows = await get_voucher_inventory(db, user_id)
    return [VoucherInventoryItem.model_validate(r) for r in rows]


async def svc_buy_voucher(
    db: AsyncSession, user_id: UUID, voucher_type: VoucherType
) -> BuyVoucherResponse:
    """用时光币购买一张道具，存入背包。"""
    cost = VOUCHER_COST[voucher_type]
    reason_map = {
        VoucherType.TIME_ACCELERATE: "BUY_ACCELERATE",
        VoucherType.TIME_FREEZE: "BUY_FREEZE",
    }
    try:
        await deduct_coins(db, user_id, cost, reason_map[voucher_type])
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    row = await add_voucher(db, user_id, voucher_type.value)
    new_balance = await get_balance(db, user_id)
    name_map = {
        VoucherType.TIME_ACCELERATE: "光加速券",
        VoucherType.TIME_FREEZE: "时光冻结券",
    }
    return BuyVoucherResponse(
        success=True,
        new_balance=new_balance,
        voucher_type=voucher_type,
        quantity=row.quantity,
        message=f"{name_map[voucher_type]} 购买成功，当前持有 {row.quantity} 张",
    )


async def svc_use_voucher(
    db: AsyncSession, user_id: UUID, voucher_type: VoucherType, target_id: str
) -> UseVoucherResponse:
    cost = VOUCHER_COST[voucher_type]

    if voucher_type == VoucherType.TIME_ACCELERATE:
        result = await db.execute(
            select(DiaryEntry).where(
                DiaryEntry.id == target_id,
                DiaryEntry.user_id == user_id,
                DiaryEntry.is_capsule == True,
                DiaryEntry.is_deleted == False,
            )
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="胶囊不存在")
        now = datetime.now(timezone.utc)
        if not entry.unlock_at or entry.unlock_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="胶囊已开启，无需加速"
            )
        try:
            await consume_voucher(db, user_id, voucher_type.value)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        entry.unlock_at = entry.unlock_at - timedelta(days=7)
        # 若提前后已到期，直接设为当前时间（立即解锁）
        if entry.unlock_at <= now:
            entry.unlock_at = now
        await db.commit()
        new_balance = await get_balance(db, user_id)
        return UseVoucherResponse(
            success=True,
            new_balance=new_balance,
            message=f"胶囊已提前 7 天，新解锁时间：{entry.unlock_at.strftime('%Y-%m-%d')}",
        )

    elif voucher_type == VoucherType.TIME_FREEZE:
        result = await db.execute(
            select(DiaryEntry).where(
                DiaryEntry.id == target_id,
                DiaryEntry.user_id == user_id,
                DiaryEntry.is_capsule == True,
                DiaryEntry.is_deleted == False,
            )
        )
        entry = result.scalar_one_or_none()
        if not entry:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="胶囊不存在")
        now = datetime.now(timezone.utc)
        if not entry.unlock_at or entry.unlock_at <= now:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, detail="胶囊已开启，无法冻结"
            )
        try:
            await consume_voucher(db, user_id, voucher_type.value)
        except ValueError as e:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
        entry.unlock_at = entry.unlock_at + timedelta(days=30)
        await db.commit()
        new_balance = await get_balance(db, user_id)
        return UseVoucherResponse(
            success=True,
            new_balance=new_balance,
            message=f"胶囊已延期 30 天，新解锁时间：{entry.unlock_at.strftime('%Y-%m-%d')}",
        )

