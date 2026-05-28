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
import logging
from core.response import ok, created

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.get("/today")
async def get_today_quote(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /quotes/today user_id=%s", user_id)
    return ok(await svc_get_today(db, user_id))


@router.post("/{quote_id}/collect")
async def collect_quote(
    quote_id: int,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("POST /quotes/%s/collect user_id=%s", quote_id, user_id)
    return ok(await svc_collect(db, user_id, quote_id))


@router.get("/my-collection")
async def my_collection(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /quotes/my-collection user_id=%s", user_id)
    return ok(await svc_get_collection(db, user_id))
