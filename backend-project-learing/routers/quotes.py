"""端口层：每日金句路由"""
from uuid import UUID

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user_id
from database import get_db
from schemas.quote_schemas import (
    CollectQuoteResponse,
    CollectedQuoteItem,
    TodayQuoteResponse,
)
from services.quote_service import (
    svc_collect,
    svc_get_collection,
    svc_get_today,
)

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.get("/today", response_model=TodayQuoteResponse)
async def get_today_quote(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_get_today(db, user_id)


@router.post("/{quote_id}/collect", response_model=CollectQuoteResponse)
async def collect_quote(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_collect(db, user_id, quote_id)


@router.get("/my-collection", response_model=list[CollectedQuoteItem])
async def my_collection(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_get_collection(db, user_id)
