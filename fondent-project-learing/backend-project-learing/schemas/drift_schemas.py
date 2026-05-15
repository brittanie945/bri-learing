from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional
from uuid import UUID


class BottleCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=500)


class BottleReplyCreate(BaseModel):
    content: str = Field(..., min_length=1, max_length=300)


class BottleResponse(BaseModel):
    id: UUID
    content: str
    is_picked: bool
    picked_at: Optional[datetime] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class BottleReplyResponse(BaseModel):
    id: UUID
    bottle_id: UUID
    content: str
    created_at: datetime

    model_config = {"from_attributes": True}


class BottleWithReplies(BaseModel):
    id: UUID
    content: str
    is_picked: bool
    created_at: datetime
    replies: list[BottleReplyResponse] = []

    model_config = {"from_attributes": True}
