"""语义搜索与混合搜索请求/响应 Schema。"""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, Field


class SemanticSearchRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=500, description="自然语言搜索查询")
    mood: Optional[str] = Field(None, description="按心情过滤")
    tag: Optional[str] = Field(None, description="按标签过滤")
    limit: int = Field(default=10, ge=1, le=50)
    offset: int = Field(default=0, ge=0)


class SemanticSearchResultItem(BaseModel):
    id: UUID
    title: str
    content_preview: str
    mood: Optional[str]
    similarity: float
    created_at: datetime

    model_config = {"from_attributes": True}


class SemanticSearchResponse(BaseModel):
    items: list[SemanticSearchResultItem]
    total: int
    query: str


class RelatedDiaryItem(BaseModel):
    id: UUID
    title: str
    content_preview: str
    mood: Optional[str]
    similarity: float
    created_at: datetime


class RelatedDiaryResponse(BaseModel):
    diary_id: UUID
    items: list[RelatedDiaryItem]
