"""端口层：漂流瓶路由"""
from uuid import UUID

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user_id
from database import get_db
from schemas.drift_schemas import (
    BottleCreate,
    BottleReplyCreate,
    BottleResponse,
    BottleReplyResponse,
    BottleWithReplies,
)
from services.drift_service import (
    svc_throw_bottle,
    svc_pick_bottle,
    svc_reply_bottle,
    svc_get_bottle_with_replies,
    svc_my_bottles,
)
import logging
from core.response import ok, created

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/drift", tags=["drift"])


@router.post("/throw")
async def throw_bottle(
    data: BottleCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("POST /drift/throw user_id=%s", user_id)
    return created(await svc_throw_bottle(db, user_id, data))


@router.post("/pick")
async def pick_bottle(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("POST /drift/pick user_id=%s", user_id)
    return ok(await svc_pick_bottle(db, user_id))


@router.get("/my")
async def my_bottles(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /drift/my user_id=%s", user_id)
    return ok(await svc_my_bottles(db, user_id))


@router.get("/{bottle_id}")
async def get_bottle(
    bottle_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /drift/%s user_id=%s", bottle_id, user_id)
    return ok(await svc_get_bottle_with_replies(db, user_id, bottle_id))


@router.post("/{bottle_id}/reply")
async def reply_bottle(
    bottle_id: UUID,
    data: BottleReplyCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("POST /drift/%s/reply user_id=%s", bottle_id, user_id)
    return created(await svc_reply_bottle(db, user_id, bottle_id, data))
