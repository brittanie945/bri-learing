"""数据访问层：封装所有对 User 表的数据库操作"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_

from models import User


async def get_user_by_login(db: AsyncSession, login: str) -> User | None:
    """通过用户名或邮箱查询用户"""
    result = await db.execute(
        select(User).where(or_(User.username == login, User.email == login))
    )
    return result.scalar_one_or_none()


async def get_user_by_username(db: AsyncSession, username: str) -> User | None:
    result = await db.execute(select(User).where(User.username == username))
    return result.scalar_one_or_none()


async def get_user_by_email(db: AsyncSession, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession, username: str, email: str, hashed_password: str
) -> User:
    user = User(username=username, email=email, hashed_password=hashed_password)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user
