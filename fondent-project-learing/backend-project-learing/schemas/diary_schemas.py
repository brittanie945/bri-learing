from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID

MOOD_VALUES = {"happy", "sad", "anxious", "calm", "angry", "neutral"}
WEATHER_VALUES = {"sunny", "cloudy", "rainy", "snowy", "windy", "stormy"}


class DiaryCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    content: str = Field(..., min_length=1)
    mood: Optional[str] = Field(None)
    weather: Optional[str] = Field(None)
    tags: Optional[List[str]] = Field(default_factory=list)
    is_capsule: bool = False
    unlock_at: Optional[datetime] = None
    self_destruct_days: int = Field(default=0, ge=0, le=3650)


class DiaryUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    content: Optional[str] = Field(None, min_length=1)
    mood: Optional[str] = None
    weather: Optional[str] = None
    tags: Optional[List[str]] = None
    self_destruct_days: Optional[int] = Field(None, ge=0, le=3650)


class DiaryResponse(BaseModel):
    id: UUID
    user_id: UUID
    title: str
    content: str
    mood: Optional[str]
    weather: Optional[str]
    tags: Optional[List[str]]
    is_capsule: bool
    unlock_at: Optional[datetime]
    self_destruct_days: int
    is_deleted: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DiaryListResponse(BaseModel):
    id: UUID
    title: str
    mood: Optional[str]
    weather: Optional[str]
    tags: Optional[List[str]]
    is_capsule: bool
    unlock_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class MoodStatsItem(BaseModel):
    mood: Optional[str]
    count: int


class MoodStats(BaseModel):
    stats: List[MoodStatsItem]
    streak: int
    total: int
