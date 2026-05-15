"""AI 时空对话相关 Schema"""
import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class SessionCreate(BaseModel):
    time_preset: Optional[str] = None   # all / 3m / 6m / 1y / 2y
    time_from: Optional[datetime] = None
    time_to: Optional[datetime] = None


class DiaryRefItem(BaseModel):
    id: str
    title: str
    date: str
    mood: Optional[str] = None
    summary: str


class ChatMessageResponse(BaseModel):
    id: uuid.UUID
    session_id: uuid.UUID
    role: str
    content: str
    ref_ids: Optional[list] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionResponse(BaseModel):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    time_from: Optional[datetime] = None
    time_to: Optional[datetime] = None
    diary_refs: Optional[dict] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SessionDetailResponse(SessionResponse):
    messages: list[ChatMessageResponse] = []
    system_prompt: str


class MessageCreate(BaseModel):
    content: str
