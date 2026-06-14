"""端口层：日记路由"""
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Query, status
from fastapi.responses import JSONResponse
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
from services.rag_service import svc_semantic_search, svc_get_related_diaries
import logging
from core.response import ok, created

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/diary", tags=["diary"])


@router.post("")
async def create_diary(
    data: DiaryCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("POST /diary user_id=%s", user_id)
    diary, coins_earned = await svc_create_diary(db, user_id, data)
    return created({**diary.model_dump(), "coins_earned": coins_earned})


@router.get("")
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
    logger.info("GET /diary user_id=%s mood=%s search=%s", user_id, mood, search)
    return ok(await svc_list_diaries(db, user_id, mood, is_capsule, tag, search, limit, offset))


@router.get("/search/semantic")
async def semantic_search(
    query: str = Query(..., min_length=1, max_length=500),
    mood: Optional[str] = Query(None),
    tag: Optional[str] = Query(None),
    limit: int = Query(10, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /diary/search/semantic user_id=%s query=%s", user_id, query[:50])
    results = await svc_semantic_search(
        db, user_id, query, mood=mood, tag=tag, limit=limit, offset=offset
    )
    return ok(results)


@router.get("/{diary_id}/related")
async def related_diaries(
    diary_id: UUID,
    limit: int = Query(5, ge=1, le=20),
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /diary/%s/related user_id=%s", diary_id, user_id)
    results = await svc_get_related_diaries(db, user_id, diary_id, limit=limit)
    return ok(results)


@router.get("/memory-lane")
async def memory_lane(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /diary/memory-lane user_id=%s", user_id)
    return ok(await svc_memory_lane(db, user_id))


@router.get("/stats/mood")
async def mood_stats(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /diary/stats/mood user_id=%s", user_id)
    return ok(await svc_mood_stats(db, user_id))


@router.get("/{diary_id}")
async def get_diary(
    diary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("GET /diary/%s user_id=%s", diary_id, user_id)
    return ok(await svc_get_diary(db, user_id, diary_id))


@router.patch("/{diary_id}")
async def update_diary(
    diary_id: UUID,
    data: DiaryUpdate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("PATCH /diary/%s user_id=%s", diary_id, user_id)
    return ok(await svc_update_diary(db, user_id, diary_id, data))


@router.delete("/{diary_id}")
async def delete_diary(
    diary_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    logger.info("DELETE /diary/%s user_id=%s", diary_id, user_id)
    await svc_delete_diary(db, user_id, diary_id)
    return ok()
