from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum


class SeedType(str, Enum):
    happy = "happy"
    sad = "sad"
    anxious = "anxious"
    calm = "calm"
    angry = "angry"
    neutral = "neutral"


class SeedStatus(str, Enum):
    growing = "growing"
    sprouted = "sprouted"
    withered = "withered"


class PlantSeedRequest(BaseModel):
    seed_type: SeedType
    task_note: Optional[str] = None


class SeedResponse(BaseModel):
    id: UUID
    user_id: UUID
    seed_type: str
    task_note: Optional[str]
    status: str
    streak_days: int
    planted_at: datetime
    last_watered_at: datetime
    sprouted_at: Optional[datetime]
    withered_at: Optional[datetime]
    wither_day: Optional[int]
    is_revived: bool

    model_config = {"from_attributes": True}


class WaterSeedResponse(BaseModel):
    seed: SeedResponse
    already_watered: bool
    sprouted: bool
    coins_earned: int
    encouragement_message: str


class CurrentSeedResponse(BaseModel):
    active_seed: Optional[SeedResponse]
    withered_seeds: List[SeedResponse]  # 枯枝记录
