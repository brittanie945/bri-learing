"""业务逻辑层：AI 时空对话核心"""
import os
import re
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from dotenv import load_dotenv
from fastapi import HTTPException, status
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession
from zhipuai import ZhipuAI

from models import DiaryEntry, User, ChatSession
from repositories.chat_repository import (
    create_session,
    get_session,
    get_session_messages,
    add_message,
)
from schemas.chat_schemas import SessionCreate

load_dotenv()

ZHIPUAI_API_KEY = os.getenv("ZHIPUAI_API_KEY", "")
ZHIPUAI_MODEL = os.getenv("ZHIPUAI_MODEL", "glm-4-flash")

MOOD_LABELS = {
    "happy": "开心",
    "sad": "难过",
    "anxious": "焦虑",
    "calm": "平静",
    "angry": "愤怒",
    "neutral": "普通",
}

PRESET_LABELS = {
    "all": "全部记忆",
    "3m": "最近 3 个月",
    "6m": "半年前",
    "1y": "1 年前",
    "2y": "2 年前",
}


def _format_time_desc(time_from: Optional[datetime], time_to: Optional[datetime]) -> str:
    if not time_from and not time_to:
        return "你的整段人生记忆"
    if time_from and time_to:
        return f"{time_from.strftime('%Y年%m月%d日')} 至 {time_to.strftime('%Y年%m月%d日')}"
    if time_from:
        return f"{time_from.strftime('%Y年%m月%d日')} 之后"
    return f"{time_to.strftime('%Y年%m月%d日')} 之前"


async def _get_username(db: AsyncSession, user_id: uuid.UUID) -> str:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    return user.username if user else "你"


async def _fetch_diary_entries(
    db: AsyncSession,
    user_id: uuid.UUID,
    time_from: Optional[datetime],
    time_to: Optional[datetime],
) -> list[DiaryEntry]:
    filters = [
        DiaryEntry.user_id == user_id,
        DiaryEntry.is_deleted == False,  # noqa: E712
        DiaryEntry.is_capsule == False,  # noqa: E712
    ]
    if time_from:
        filters.append(DiaryEntry.created_at >= time_from)
    if time_to:
        filters.append(DiaryEntry.created_at <= time_to)

    result = await db.execute(
        select(DiaryEntry)
        .where(and_(*filters))
        .order_by(DiaryEntry.created_at.desc())
        .limit(30)
    )
    entries = list(result.scalars().all())
    # 按时间正序排列，让 REF 编号从早到晚
    return list(reversed(entries))


def _build_system_prompt(
    username: str,
    time_desc: str,
    diary_refs: dict,
    dominant_mood: Optional[str],
) -> str:
    lines = [
        f"你现在是 {username}，时间停留在 {time_desc}。",
        "以下是你在这段时间里亲手写下的日记（你可以引用这些记忆）：",
        "---",
    ]
    if diary_refs:
        for ref_num, ref in diary_refs.items():
            mood_label = MOOD_LABELS.get(ref.get("mood", ""), ref.get("mood", "")) if ref.get("mood") else "未知"
            lines.append(
                f"[REF:{ref_num}] {ref['date']} | 心情：{mood_label} | 《{ref['title']}》\n{ref['summary']}"
            )
        lines.append("---")
    else:
        lines.append("（这段时间你没有写过日记）")
        lines.append("---")

    if dominant_mood:
        lines.append(f"你当时的主要情绪基调是：{MOOD_LABELS.get(dominant_mood, dominant_mood)}")
        lines.append("")

    lines += [
        "== 角色设定规则 ==",
        f"1. 你只知道 {time_desc} 及之前发生的事情，不知道这之后的未来。",
        "2. 用第一人称，以当时的心态、语气和认知水平说话，语气要真实、有温度。",
        "3. 当提到日记里记录的某件事时，在句子里自然插入 [REF:N]（例：我那天 [REF:1] 哭了很久）。",
        "4. 如果被问及你不知道的未来，诚实地说你不知道，但可以表达当时的期待或担忧。",
        "5. 不要说我是AI或我是语言模型，始终保持角色沉浸感。",
        "6. 回复保持自然对话长度，不要过于冗长，就像两个人真实聊天一样。",
    ]
    return "\n".join(lines)


async def svc_create_session(
    db: AsyncSession, user_id: uuid.UUID, data: SessionCreate
) -> ChatSession:
    # 解析时间范围
    time_from = data.time_from
    time_to = data.time_to

    if data.time_preset and data.time_preset != "all":
        now = datetime.now(timezone.utc)
        if data.time_preset == "3m":
            from dateutil.relativedelta import relativedelta
            time_from = now - relativedelta(months=3)
        elif data.time_preset == "6m":
            from dateutil.relativedelta import relativedelta
            time_from = now - relativedelta(months=6)
        elif data.time_preset == "1y":
            from dateutil.relativedelta import relativedelta
            time_from = now - relativedelta(years=1)
        elif data.time_preset == "2y":
            from dateutil.relativedelta import relativedelta
            time_from = now - relativedelta(years=2)
        time_to = now

    # 获取日记条目
    entries = await _fetch_diary_entries(db, user_id, time_from, time_to)

    # 构建 diary_refs
    diary_refs: dict = {}
    moods = []
    for i, entry in enumerate(entries, 1):
        diary_refs[str(i)] = {
            "id": str(entry.id),
            "title": entry.title,
            "date": entry.created_at.strftime("%Y-%m-%d"),
            "mood": entry.mood,
            "summary": entry.content[:300],
        }
        if entry.mood:
            moods.append(entry.mood)

    dominant_mood = Counter(moods).most_common(1)[0][0] if moods else None
    username = await _get_username(db, user_id)
    time_desc = _format_time_desc(time_from, time_to)

    system_prompt = _build_system_prompt(username, time_desc, diary_refs, dominant_mood)

    # 生成会话标题
    preset_label = PRESET_LABELS.get(data.time_preset or "all", time_desc)
    title = f"与「{preset_label}」的自己对话"
    if data.time_preset not in PRESET_LABELS and (time_from or time_to):
        title = f"与「{time_desc}」的自己对话"

    session = await create_session(
        db,
        user_id=user_id,
        title=title,
        system_prompt=system_prompt,
        diary_refs=diary_refs,
        time_from=time_from,
        time_to=time_to,
    )
    return session


def _extract_ref_ids(content: str) -> list[int]:
    """从 AI 回复中提取 [REF:N] 编号列表"""
    return [int(n) for n in re.findall(r"\[REF:(\d+)\]", content)]


async def svc_stream_message(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    user_content: str,
) -> AsyncGenerator[str, None]:
    """
    向 ZhipuAI 发送消息，流式 yield SSE 文本块，最后将完整消息存入 DB。
    """
    import json

    if not ZHIPUAI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="ZHIPUAI_API_KEY 未配置",
        )

    session = await get_session(db, session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    # 保存用户消息
    await add_message(db, session_id, "user", user_content)

    # 构建历史消息（含系统提示词）
    history = await get_session_messages(db, session_id)
    messages = [{"role": "system", "content": session.system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    client = ZhipuAI(api_key=ZHIPUAI_API_KEY)

    # 流式调用
    full_content = ""
    try:
        response = client.chat.completions.create(
            model=ZHIPUAI_MODEL,
            messages=messages,
            stream=True,
        )
        for chunk in response:
            delta_content = chunk.choices[0].delta.content
            if delta_content:
                full_content += delta_content
                yield f"data: {json.dumps({'type': 'chunk', 'content': delta_content}, ensure_ascii=False)}\n\n"
    except Exception as e:
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
        return

    # 提取引用的 REF 编号
    ref_ids = _extract_ref_ids(full_content)

    # 保存 AI 完整回复
    await add_message(db, session_id, "assistant", full_content, ref_ids)

    if ref_ids:
        yield f"data: {json.dumps({'type': 'refs', 'ids': ref_ids}, ensure_ascii=False)}\n\n"

    yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
