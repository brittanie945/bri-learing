"""数据访问层：AI 时空对话"""
import uuid
from typing import Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from models import ChatSession, ChatMessage


async def create_session(
    db: AsyncSession,
    user_id: uuid.UUID,
    title: str,
    system_prompt: str,
    diary_refs: dict,
    time_from=None,
    time_to=None,
) -> ChatSession:
    session = ChatSession(
        user_id=user_id,
        title=title,
        system_prompt=system_prompt,
        diary_refs=diary_refs,
        time_from=time_from,
        time_to=time_to,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


async def list_sessions(db: AsyncSession, user_id: uuid.UUID) -> list[ChatSession]:
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == user_id)
        .order_by(ChatSession.created_at.desc())
        .limit(50)
    )
    return list(result.scalars().all())


async def get_session(
    db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID
) -> Optional[ChatSession]:
    result = await db.execute(
        select(ChatSession).where(
            and_(ChatSession.id == session_id, ChatSession.user_id == user_id)
        )
    )
    return result.scalar_one_or_none()


async def get_session_messages(
    db: AsyncSession, session_id: uuid.UUID
) -> list[ChatMessage]:
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at.asc())
    )
    return list(result.scalars().all())


async def add_message(
    db: AsyncSession,
    session_id: uuid.UUID,
    role: str,
    content: str,
    ref_ids: Optional[list] = None,
) -> ChatMessage:
    msg = ChatMessage(
        session_id=session_id,
        role=role,
        content=content,
        ref_ids=ref_ids or [],
    )
    db.add(msg)
    await db.commit()
    await db.refresh(msg)
    return msg


async def delete_session(
    db: AsyncSession, session_id: uuid.UUID, user_id: uuid.UUID
) -> bool:
    session = await get_session(db, session_id, user_id)
    if not session:
        return False
    await db.delete(session)
    await db.commit()
    return True


async def get_active_sessions_with_messages(
    db: AsyncSession,
) -> list[dict]:
    """
    获取所有有消息的会话及其消息历史，用于 Checkpointer hydration。

    返回列表，每项包含 session_id 和按时间排序的 messages 列表。
    """
    # 子查询：找出所有有消息的会话
    subq = (
        select(ChatMessage.session_id)
        .group_by(ChatMessage.session_id)
        .subquery()
    )

    # 主查询：获取这些会话的消息（按时间排序）
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id.in_(select(subq)))
        .order_by(ChatMessage.session_id.asc(), ChatMessage.created_at.asc())
    )
    all_messages = list(result.scalars().all())

    # 按 session_id 分组
    sessions_map: dict[str, list[dict]] = {}
    for msg in all_messages:
        sid = str(msg.session_id)
        if sid not in sessions_map:
            sessions_map[sid] = []
        sessions_map[sid].append({
            "role": msg.role,
            "content": msg.content,
        })

    return [
        {"session_id": uuid.UUID(sid), "messages": msgs}
        for sid, msgs in sessions_map.items()
    ]
