"""端口层：日记路由"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user_id
from database import get_db
from schemas.diary_schemas import (
    DiaryCreate,
    DiaryUpdate,
    DiaryResponse,
    DiaryListResponse,
    MoodStats,
)
from services.diary_service import (
    svc_create_diary,
    svc_get_diary,
    svc_list_diaries,
    svc_update_diary,
    svc_delete_diary,
    svc_mood_stats,
    svc_memory_lane,
)

router = APIRouter(prefix="/diary", tags=["diary"])


@router.post("", response_model=DiaryResponse, status_code=status.HTTP_201_CREATED)
async def create_diary(
    data: DiaryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_create_diary(db, user_id, data)


@router.get("", response_model=list[DiaryListResponse])
async def list_diaries(
    mood: Optional[str] = Query(None),
    is_capsule: Optional[bool] = Query(None),
    tag: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_list_diaries(db, user_id, mood, is_capsule, tag, search, limit, offset)


@router.get("/memory-lane", response_model=list[DiaryListResponse])
async def memory_lane(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_memory_lane(db, user_id)


@router.get("/stats/mood", response_model=MoodStats)
async def mood_stats(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_mood_stats(db, user_id)


@router.get("/{diary_id}", response_model=DiaryResponse)
async def get_diary(
    diary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_get_diary(db, user_id, diary_id)


@router.patch("/{diary_id}", response_model=DiaryResponse)
async def update_diary(
    diary_id: UUID,
    data: DiaryUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await svc_update_diary(db, user_id, diary_id, data)


@router.delete("/{diary_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_diary(
    diary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    await svc_delete_diary(db, user_id, diary_id)
