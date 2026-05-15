import uuid
from datetime import datetime
from typing import Optional
from sqlalchemy import String, Text, DateTime, Boolean, Integer, ForeignKey, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class DiaryEntry(Base):
    """日记条目，同时承载普通日记与时间胶囊"""
    __tablename__ = "diary_entries"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    mood: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    weather: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    tags: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    is_capsule: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    unlock_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    self_destruct_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class DriftBottle(Base):
    """漂流瓶 — 匿名投放（用 sha256(user_id+salt) 代替原始 user_id）"""
    __tablename__ = "drift_bottles"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    author_hash: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    is_picked: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    picked_by_hash: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    picked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class BottleReply(Base):
    """漂流瓶回复"""
    __tablename__ = "bottle_replies"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    bottle_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("drift_bottles.id", ondelete="CASCADE"), nullable=False, index=True
    )
    replier_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ChatSession(Base):
    """AI时空对话会话"""
    __tablename__ = "chat_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    time_from: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    time_to: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    system_prompt: Mapped[str] = mapped_column(Text, nullable=False)
    diary_refs: Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ChatMessage(Base):
    """AI时空对话消息"""
    __tablename__ = "chat_messages"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    session_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(String(20), nullable=False)  # user | assistant
    content: Mapped[str] = mapped_column(Text, nullable=False)
    ref_ids: Mapped[Optional[list]] = mapped_column(JSONB, nullable=True, default=list)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class DailyPrompt(Base):
    """每日写作提示"""
    __tablename__ = "daily_prompts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_zh: Mapped[str] = mapped_column(Text, nullable=False)
    content_en: Mapped[str] = mapped_column(Text, nullable=False)
    prompt_date: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True), nullable=True, unique=True
    )
