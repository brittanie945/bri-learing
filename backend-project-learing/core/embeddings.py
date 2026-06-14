"""异步 Embedding 生成服务 — 基于 ZhipuAI embedding-3 模型。

使用 asyncio.to_thread() 包装同步 SDK 调用，避免阻塞 FastAPI 事件循环。
Embedding 生成失败不会抛出异常，返回 None 让调用方优雅降级。
"""

import asyncio
import logging
import os
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

ZHIPUAI_API_KEY = os.getenv("ZHIPUAI_API_KEY", "")
EMBEDDING_MODEL = "embedding-3"
EMBEDDING_DIMENSIONS = 1024
# embedding-3 最大输入 3072 tokens，~500 中文字符远低于此限制
MAX_TEXT_CHARS_FOR_EMBEDDING = 500


def _prepare_text(title: str, content: str) -> str:
    """拼接标题和内容，截断至安全长度以生成 embedding。"""
    combined = f"{title}\n{content}"
    if len(combined) > MAX_TEXT_CHARS_FOR_EMBEDDING:
        combined = combined[:MAX_TEXT_CHARS_FOR_EMBEDDING]
    return combined


async def generate_embedding(text: str) -> Optional[list[float]]:
    """
    使用 ZhipuAI embedding-3 为文本生成向量。

    返回 1024 维浮点数列表，失败时返回 None。
    """
    if not ZHIPUAI_API_KEY:
        logger.error("ZHIPUAI_API_KEY 未配置")
        return None

    def _sync_call() -> list[float]:
        from zhipuai import ZhipuAI
        client = ZhipuAI(api_key=ZHIPUAI_API_KEY)
        response = client.embeddings.create(
            model=EMBEDDING_MODEL,
            input=text,
            dimensions=EMBEDDING_DIMENSIONS,
        )
        return response.data[0].embedding

    try:
        return await asyncio.to_thread(_sync_call)
    except Exception as e:
        logger.exception("Embedding 生成失败: %s", e)
        return None


async def generate_diary_embedding(title: str, content: str) -> Optional[list[float]]:
    """便捷函数：准备日记文本并生成 embedding。"""
    text = _prepare_text(title, content)
    return await generate_embedding(text)
