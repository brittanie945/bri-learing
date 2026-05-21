"""业务逻辑层：每日金句"""
import json
import os
import uuid
from typing import List

from dotenv import load_dotenv
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from zhipuai import ZhipuAI

from repositories.quote_repository import (
    add_quote,
    collect_quote,
    get_quote_by_id,
    get_today_quote,
    get_total_count,
    get_user_collection,
    is_collected,
    seed_initial_quotes,
)
from schemas.quote_schemas import (
    CollectQuoteResponse,
    CollectedQuoteItem,
    QuoteResponse,
    TodayQuoteResponse,
)

load_dotenv()

ZHIPUAI_API_KEY = os.getenv("ZHIPUAI_API_KEY", "")
ZHIPUAI_MODEL = os.getenv("ZHIPUAI_MODEL", "glm-4-flash")

_AI_GENERATE_PROMPT = """请生成 {count} 条富有哲理的中文名句（可来自古诗词、名人语录或原创）。
每条语录必须包含：
- 中文原文（简洁有力，不超过 50 字）
- 对应的英文翻译
- 作者（如不确定请写"佚名"）
- 来源（书名或作品，无则留空字符串）

请严格按照以下 JSON 数组格式输出，不要有任何其他文字：
[
  {{"content_zh": "...", "content_en": "...", "author": "...", "source": "..."}}
]"""


async def svc_seed_and_maybe_generate(db: AsyncSession) -> None:
    """应用启动时调用：确保词库有预置数据；若不足 30 条则尝试 AI 补充。"""
    await seed_initial_quotes(db)
    count = await get_total_count(db)
    if count < 30 and ZHIPUAI_API_KEY:
        await svc_ai_generate_quotes(db, count=max(10, 30 - count))


async def svc_get_today(db: AsyncSession, user_id: uuid.UUID) -> TodayQuoteResponse:
    quote = await get_today_quote(db)
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="金句词库暂未初始化，请稍后再试",
        )
    collected = await is_collected(db, user_id, quote.id)
    return TodayQuoteResponse(
        quote=QuoteResponse.model_validate(quote),
        is_collected=collected,
    )


async def svc_collect(
    db: AsyncSession, user_id: uuid.UUID, quote_id: int
) -> CollectQuoteResponse:
    quote = await get_quote_by_id(db, quote_id)
    if quote is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="语录不存在",
        )
    _, is_new = await collect_quote(db, user_id, quote_id)
    if is_new:
        message = "已收藏到金句本 ✨"
    else:
        message = "已在金句本中"
    return CollectQuoteResponse(quote_id=quote_id, is_new=is_new, message=message)


async def svc_get_collection(
    db: AsyncSession, user_id: uuid.UUID
) -> List[CollectedQuoteItem]:
    rows = await get_user_collection(db, user_id)
    return [
        CollectedQuoteItem(
            quote=QuoteResponse.model_validate(quote),
            collected_at=collected.collected_at,
        )
        for collected, quote in rows
    ]


async def svc_ai_generate_quotes(db: AsyncSession, count: int = 7) -> int:
    """调用 ZhipuAI 生成若干条语录并存入 DB，返回实际写入条数。"""
    if not ZHIPUAI_API_KEY:
        return 0
    try:
        client = ZhipuAI(api_key=ZHIPUAI_API_KEY)
        response = client.chat.completions.create(
            model=ZHIPUAI_MODEL,
            messages=[
                {
                    "role": "user",
                    "content": _AI_GENERATE_PROMPT.format(count=count),
                }
            ],
            temperature=0.8,
        )
        raw = response.choices[0].message.content.strip()
        # 提取 JSON 数组部分（防止模型输出多余文字）
        start = raw.find("[")
        end = raw.rfind("]") + 1
        if start == -1 or end == 0:
            return 0
        quotes = json.loads(raw[start:end])
        added = 0
        for q in quotes:
            content_zh = q.get("content_zh", "").strip()
            content_en = q.get("content_en", "").strip()
            if not content_zh or not content_en:
                continue
            await add_quote(
                db,
                content_zh=content_zh,
                content_en=content_en,
                author=q.get("author") or None,
                source=q.get("source") or None,
                is_ai_generated=True,
            )
            added += 1
        return added
    except Exception:
        # AI 生成失败不应阻断启动，静默忽略
        return 0
