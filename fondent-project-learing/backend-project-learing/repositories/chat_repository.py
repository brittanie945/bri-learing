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
