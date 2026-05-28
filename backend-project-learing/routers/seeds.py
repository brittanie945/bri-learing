from uuid import UUID
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from core.security import get_current_user_id
from services.seed_service import (
    svc_get_current,
    svc_plant_seed,
    svc_water_seed,
    svc_revive_seed,
)
from schemas.seed_schemas import (
    PlantSeedRequest,
    SeedResponse,
    WaterSeedResponse,
    CurrentSeedResponse,
)
import logging
from core.response import ok, created

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/seeds", tags=["seeds"])


@router.get("/current")
async def get_current(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    logger.info("GET /seeds/current user_id=%s", user_id)
    return ok(await svc_get_current(db, user_id))


@router.post("/plant")
async def plant_seed(
    req: PlantSeedRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    logger.info("POST /seeds/plant user_id=%s", user_id)
    return created(await svc_plant_seed(db, user_id, req))


@router.post("/water")
async def water_seed_endpoint(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    logger.info("POST /seeds/water user_id=%s", user_id)
    return ok(await svc_water_seed(db, user_id))


@router.post("/revive")
async def revive_seed_endpoint(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    logger.info("POST /seeds/revive user_id=%s", user_id)
    return ok(await svc_revive_seed(db, user_id))
