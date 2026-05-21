import uuid
from datetime import datetime, date
from typing import Optional
from sqlalchemy import String, Text, DateTime, Boolean, Integer, ForeignKey, func, Date
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    username: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    coins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
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


class CoinTransaction(Base):
    """时光币流水记录"""
    __tablename__ = "coin_transactions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    amount: Mapped[int] = mapped_column(Integer, nullable=False)  # 正数=获得，负数=消费
    type: Mapped[str] = mapped_column(String(10), nullable=False)  # EARN | SPEND
    reason: Mapped[str] = mapped_column(String(50), nullable=False)  # 原因枚举
    related_id: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class DailyCheckin(Base):
    """每日打卡记录（幂等防重复领取时光币）"""
    __tablename__ = "daily_checkins"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    checkin_date: Mapped[date] = mapped_column(Date, nullable=False)
    coins_earned: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class UserVoucher(Base):
    """用户道具库存（每种券一行，quantity 表示持有数量）"""
    __tablename__ = "user_vouchers"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    voucher_type: Mapped[str] = mapped_column(String(50), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Seed(Base):
    """时光种子 — 签到叙事化包装"""
    __tablename__ = "seeds"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    seed_type: Mapped[str] = mapped_column(String(20), nullable=False)  # 对应心情枚举值
    task_note: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="growing")  # growing | sprouted | withered
    streak_days: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    planted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    last_watered_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    sprouted_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    withered_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    wither_day: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_revived: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)


class DailyQuote(Base):
    """每日金句词库"""
    __tablename__ = "daily_quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    content_zh: Mapped[str] = mapped_column(Text, nullable=False)
    content_en: Mapped[str] = mapped_column(Text, nullable=False)
    author: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    source: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class CollectedQuote(Base):
    """用户收藏的金句"""
    __tablename__ = "collected_quotes"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    quote_id: Mapped[int] = mapped_column(
        ForeignKey("daily_quotes.id", ondelete="CASCADE"), nullable=False
    )
    collected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
