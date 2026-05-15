"""业务逻辑层：处理注册/登录的核心业务规则"""
from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from core.security import hash_password, verify_password, create_access_token
from models import User
from repositories.user_repository import (
    get_user_by_login,
    get_user_by_username,
    get_user_by_email,
    create_user,
)
from schemas import UserRegister, UserLogin, TokenResponse, UserResponse


async def register_user(db: AsyncSession, data: UserRegister) -> User:
    """注册新用户，检查用户名/邮箱唯一性"""
    if await get_user_by_username(db, data.username):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="用户名已存在")
    if await get_user_by_email(db, data.email):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="邮箱已被注册")

    return await create_user(db, data.username, data.email, hash_password(data.password))


async def login_user(db: AsyncSession, data: UserLogin) -> TokenResponse:
    """验证用户凭证，返回 JWT 令牌"""
    user = await get_user_by_login(db, data.login)
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="用户名或密码错误")

    token = create_access_token({"sub": str(user.id), "username": user.username})
    return TokenResponse(access_token=token, user=UserResponse.model_validate(user))
