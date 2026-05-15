"""端口层：AI 时空对话路由"""
from uuid import UUID

from fastapi import APIRouter, Depends, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import get_current_user_id
from database import get_db
from repositories.chat_repository import (
    list_sessions,
    get_session,
    get_session_messages,
    delete_session,
)
from schemas.chat_schemas import (
    SessionCreate,
    SessionResponse,
    SessionDetailResponse,
    ChatMessageResponse,
    MessageCreate,
)
from services.chat_service import svc_create_session, svc_stream_message

router = APIRouter(prefix="/chat", tags=["chat"])


@router.post("/sessions", response_model=SessionDetailResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    data: SessionCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    session = await svc_create_session(db, user_id, data)
    return SessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        time_from=session.time_from,
        time_to=session.time_to,
        diary_refs=session.diary_refs,
        system_prompt=session.system_prompt,
        created_at=session.created_at,
        messages=[],
    )


@router.get("/sessions", response_model=list[SessionResponse])
async def list_my_sessions(
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    return await list_sessions(db, user_id)


@router.get("/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session_detail(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    from fastapi import HTTPException
    session = await get_session(db, session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")
    messages = await get_session_messages(db, session_id)
    return SessionDetailResponse(
        id=session.id,
        user_id=session.user_id,
        title=session.title,
        time_from=session.time_from,
        time_to=session.time_to,
        diary_refs=session.diary_refs,
        system_prompt=session.system_prompt,
        created_at=session.created_at,
        messages=[ChatMessageResponse.model_validate(m) for m in messages],
    )


@router.post("/sessions/{session_id}/messages")
async def send_message(
    session_id: UUID,
    data: MessageCreate,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    generator = svc_stream_message(db, user_id, session_id, data.content)
    return StreamingResponse(
        generator,
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_session(
    session_id: UUID,
    db: AsyncSession = Depends(get_db),
    user_id: UUID = Depends(get_current_user_id),
):
    from fastapi import HTTPException
    ok = await delete_session(db, session_id, user_id)
    if not ok:
        raise HTTPException(status_code=404, detail="会话不存在")
