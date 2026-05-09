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

router = APIRouter(prefix="/drift", tags=["drift"])


@router.post("/throw", response_model=BottleResponse, status_code=status.HTTP_201_CREATED)
async def throw_bottle(
    data: BottleCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_throw_bottle(db, user_id, data)


@router.post("/pick", response_model=BottleResponse)
async def pick_bottle(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_pick_bottle(db, user_id)


@router.get("/my", response_model=list[BottleResponse])
async def my_bottles(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_my_bottles(db, user_id)


@router.get("/{bottle_id}", response_model=BottleWithReplies)
async def get_bottle(
    bottle_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_get_bottle_with_replies(db, user_id, bottle_id)


@router.post("/{bottle_id}/reply", response_model=BottleReplyResponse, status_code=status.HTTP_201_CREATED)
async def reply_bottle(
    bottle_id: UUID,
    data: BottleReplyCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_reply_bottle(db, user_id, bottle_id, data)
