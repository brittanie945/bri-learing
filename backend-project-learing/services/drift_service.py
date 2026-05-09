"""业务逻辑层：漂流瓶匿名化与限流"""
import hashlib
import os
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.drift_repository import (
    create_bottle,
    pick_random_bottle,
    count_picks_today,
    get_bottle_by_id,
    add_reply,
    get_replies_for_bottle,
    get_my_bottles,
)
from schemas.drift_schemas import (
    BottleCreate,
    BottleReplyCreate,
    BottleResponse,
    BottleReplyResponse,
    BottleWithReplies,
)

_SALT = os.getenv("BOTTLE_HASH_SALT", "treehouse-drift-salt-2026")
DAILY_PICK_LIMIT = 3


def _make_hash(user_id: UUID) -> str:
    """单向匿名化：sha256(user_id + salt)"""
    raw = f"{user_id}{_SALT}".encode()
    return hashlib.sha256(raw).hexdigest()


async def svc_throw_bottle(
    db: AsyncSession, user_id: UUID, data: BottleCreate
) -> BottleResponse:
    author_hash = _make_hash(user_id)
    bottle = await create_bottle(db, author_hash=author_hash, content=data.content)
    return BottleResponse.model_validate(bottle)


async def svc_pick_bottle(
    db: AsyncSession, user_id: UUID
) -> BottleResponse:
    picker_hash = _make_hash(user_id)
    today_count = await count_picks_today(db, picker_hash)
    if today_count >= DAILY_PICK_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail=f"今日已捞 {DAILY_PICK_LIMIT} 次，明天再来吧",
        )
    bottle = await pick_random_bottle(db, picker_hash)
    if not bottle:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="大海里暂时没有漂流瓶，稍后再试",
        )
    return BottleResponse.model_validate(bottle)


async def svc_reply_bottle(
    db: AsyncSession, user_id: UUID, bottle_id: UUID, data: BottleReplyCreate
) -> BottleReplyResponse:
    replier_hash = _make_hash(user_id)
    bottle = await get_bottle_by_id(db, bottle_id)
    if not bottle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="漂流瓶不存在")
    # 不能回复自己的瓶子
    if bottle.author_hash == replier_hash:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="不能回复自己的漂流瓶"
        )
    reply = await add_reply(db, bottle_id, replier_hash, data.content)
    return BottleReplyResponse.model_validate(reply)


async def svc_get_bottle_with_replies(
    db: AsyncSession, user_id: UUID, bottle_id: UUID
) -> BottleWithReplies:
    user_hash = _make_hash(user_id)
    bottle = await get_bottle_by_id(db, bottle_id)
    if not bottle:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="漂流瓶不存在")
    # 只有投放者或捞取者可以查看
    if bottle.author_hash != user_hash and bottle.picked_by_hash != user_hash:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="无权查看此漂流瓶")
    replies = await get_replies_for_bottle(db, bottle_id)
    resp = BottleWithReplies.model_validate(bottle)
    resp.replies = [BottleReplyResponse.model_validate(r) for r in replies]
    return resp


async def svc_my_bottles(
    db: AsyncSession, user_id: UUID
) -> list[BottleResponse]:
    author_hash = _make_hash(user_id)
    bottles = await get_my_bottles(db, author_hash)
    return [BottleResponse.model_validate(b) for b in bottles]
