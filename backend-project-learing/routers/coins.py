"""端口层：时光币路由"""
from uuid import UUID

from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user_id
from database import get_db
from schemas.coin_schemas import (
    CoinBalanceResponse,
    CoinTransactionItem,
    UseVoucherRequest,
    UseVoucherResponse,
    BuyVoucherRequest,
    BuyVoucherResponse,
    VoucherInventoryItem,
)
from services.coin_service import (
    svc_get_balance,
    svc_get_history,
    svc_use_voucher,
    svc_buy_voucher,
    svc_get_inventory,
)

router = APIRouter(prefix="/coins", tags=["coins"])


@router.get("/balance", response_model=CoinBalanceResponse)
async def get_balance(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_get_balance(db, user_id)


@router.get("/history", response_model=list[CoinTransactionItem])
async def get_history(
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_get_history(db, user_id, limit)


@router.get("/my-vouchers", response_model=list[VoucherInventoryItem])
async def my_vouchers(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_get_inventory(db, user_id)


@router.post("/buy-voucher", response_model=BuyVoucherResponse)
async def buy_voucher(
    body: BuyVoucherRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_buy_voucher(db, user_id, body.voucher_type)


@router.post("/use-voucher", response_model=UseVoucherResponse)
async def use_voucher(
    body: UseVoucherRequest,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_use_voucher(db, user_id, body.voucher_type, body.target_id)
