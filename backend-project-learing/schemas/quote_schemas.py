"""Schema 层：每日金句"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class QuoteResponse(BaseModel):
    id: int
    content_zh: str
    content_en: str
    author: Optional[str]
    source: Optional[str]
    is_ai_generated: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class TodayQuoteResponse(BaseModel):
    quote: QuoteResponse
    is_collected: bool


class CollectQuoteResponse(BaseModel):
    quote_id: int
    is_new: bool
    message: str


class CollectedQuoteItem(BaseModel):
    quote: QuoteResponse
    collected_at: datetime

    model_config = {"from_attributes": True}
