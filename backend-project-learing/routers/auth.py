"""端口层（路由层）：负责 HTTP 请求/响应的绑定，不包含业务逻辑"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from database import get_db
from schemas import UserRegister, UserLogin, UserResponse, TokenResponse
from services.auth_service import register_user, login_user
import logging
from core.response import ok, created

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register")
async def register(data: UserRegister, db: AsyncSession = Depends(get_db)):
    logger.info("POST /auth/register email=%s", data.email)
    return created(UserResponse.model_validate(await register_user(db, data)))


@router.post("/login")
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    logger.info("POST /auth/login login=%s", data.login)
    return ok(await login_user(db, data))

