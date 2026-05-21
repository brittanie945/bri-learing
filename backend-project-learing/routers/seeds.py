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

router = APIRouter(prefix="/seeds", tags=["seeds"])


@router.get("/current", response_model=CurrentSeedResponse)
async def get_current(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await svc_get_current(db, user_id)


@router.post("/plant", response_model=SeedResponse)
async def plant_seed(
    req: PlantSeedRequest,
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await svc_plant_seed(db, user_id, req)


@router.post("/water", response_model=WaterSeedResponse)
async def water_seed_endpoint(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await svc_water_seed(db, user_id)


@router.post("/revive", response_model=SeedResponse)
async def revive_seed_endpoint(
    user_id: UUID = Depends(get_current_user_id),
    db: AsyncSession = Depends(get_db),
):
    return await svc_revive_seed(db, user_id)
