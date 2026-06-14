"""业务逻辑层：AI 时空对话核心"""
import json
import logging
import os
import re
import uuid
from collections import Counter
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional, TypedDict

from dotenv import load_dotenv
from fastapi import HTTPException, status
from langgraph.graph import END, START, StateGraph
from sqlalchemy import and_, select
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

logger = logging.getLogger(__name__)

ZHIPUAI_API_KEY = os.getenv("ZHIPUAI_API_KEY", "")
ZHIPUAI_MODEL = os.getenv("ZHIPUAI_MODEL", "glm-4-flash")


class ChatGraphState(TypedDict):
    messages: list[dict]
    full_content: str
    tool_call_name: Optional[str]
    tool_call_args: str
    diary_saved: bool


# ── Agent 工具定义 ──────────────────────────────────────────
WRITE_DIARY_TOOL = {
    "type": "function",
    "function": {
        "name": "write_diary",
        "description": (
            "当用户明确请求写日记、记录今天的心情、或将对话内容整理成日记时，"
            "调用此工具将日记内容直接保存到用户的日记本。"
        ),
        "parameters": {
            "type": "object",
            "properties": {
                "title": {
                    "type": "string",
                    "description": "日记标题，简洁有意义，不超过 50 字",
                },
                "content": {
                    "type": "string",
                    "description": "日记正文，完整内容，有温度、有细节",
                },
                "mood": {
                    "type": "string",
                    "enum": ["happy", "sad", "anxious", "calm", "angry", "neutral"],
                    "description": "日记对应的心情",
                },
                "tags": {
                    "type": "array",
                    "items": {"type": "string"},
                    "description": "日记标签列表，最多 5 个",
                },
            },
            "required": ["title", "content"],
        },
    },
}

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
        "7. 当用户明确要求写日记、记录今天或将对话整理成日记时，调用 write_diary 工具直接保存，"
        "工具调用后用一句温暖的话告知用户日记已保存，无需输出日记全文。",
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
        from datetime import timedelta
        _delta = {
            "3m": timedelta(days=91),
            "6m": timedelta(days=182),
            "1y": timedelta(days=365),
            "2y": timedelta(days=730),
        }.get(data.time_preset)
        if _delta:
            time_from = now - _delta
        time_to = now

    # ── RAG: 语义检索 vs 时间检索 ──
    if data.use_semantic and data.query:
        # 使用语义检索获取相关日记
        from services.rag_service import svc_retrieve_for_chat
        rag_results = await svc_retrieve_for_chat(
            db, user_id, data.query, limit=15,
        )
        from sqlalchemy import select as sa_select
        matched_ids = [r["diary_id"] for r in rag_results]
        if matched_ids:
            result = await db.execute(
                sa_select(DiaryEntry).where(DiaryEntry.id.in_(matched_ids))
            )
            entries = list(result.scalars().all())
            # 按语义相似度排序
            id_order = {str(did): idx for idx, did in enumerate(matched_ids)}
            entries.sort(key=lambda e: id_order.get(str(e.id), 999))
        else:
            entries = []
        time_desc = f"与你「{data.query[:30]}」相关的回忆"
    else:
        # 保持原有基于时间的检索
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
    if not (data.use_semantic and data.query):
        time_desc = _format_time_desc(time_from, time_to)

    system_prompt = _build_system_prompt(username, time_desc, diary_refs, dominant_mood)

    # 生成会话标题
    if data.use_semantic and data.query:
        title = f"与「{data.query[:20]}」有关的回忆"
    else:
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


def _build_chat_graph(db_context: dict):
    from schemas.diary_schemas import DiaryCreate
    from services.diary_service import svc_create_diary

    def call_model(state: ChatGraphState) -> ChatGraphState:
        if not ZHIPUAI_API_KEY:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="ZHIPUAI_API_KEY 未配置",
            )

        client = ZhipuAI(api_key=ZHIPUAI_API_KEY)
        response = client.chat.completions.create(
            model=ZHIPUAI_MODEL,
            messages=state["messages"],
            tools=[WRITE_DIARY_TOOL],
            tool_choice="auto",
            stream=False,
        )
        message = response.choices[0].message
        tool_calls = getattr(message, "tool_calls", None) or []
        tool_call_name = None
        tool_call_args = ""
        if tool_calls:
            first = tool_calls[0]
            tool_call_name = getattr(first.function, "name", None)
            tool_call_args = getattr(first.function, "arguments", "") or ""

        content = message.content or ""
        assistant_message = {"role": "assistant", "content": content}
        if tool_call_name:
            assistant_message["tool_calls"] = [{"name": tool_call_name, "arguments": tool_call_args}]
        return {
            **state,
            "messages": state["messages"] + [assistant_message],
            "full_content": state["full_content"] + content,
            "tool_call_name": tool_call_name,
            "tool_call_args": tool_call_args,
        }

    async def write_diary_node(state: ChatGraphState) -> ChatGraphState:
        if state.get("tool_call_name") != "write_diary" or not state.get("tool_call_args"):
            return state

        args = json.loads(state["tool_call_args"])
        diary_data = DiaryCreate(
            title=args["title"],
            content=args["content"],
            mood=args.get("mood"),
            tags=args.get("tags") or [],
        )
        diary_entry, _ = await svc_create_diary(db_context["db"], db_context["user_id"], diary_data, is_ai_generated=True)
        state["diary_saved"] = True
        state["tool_call_args"] = json.dumps(
            {"diary_id": str(diary_entry.id), "title": diary_entry.title},
            ensure_ascii=False,
        )
        state["messages"] = state["messages"] + [
            {
                "role": "tool",
                "content": json.dumps(
                    {"diary_id": str(diary_entry.id), "title": diary_entry.title},
                    ensure_ascii=False,
                ),
            }
        ]
        return state

    def route_after_model(state: ChatGraphState) -> str:
        return "write_diary" if state.get("tool_call_name") == "write_diary" else END

    graph = StateGraph(ChatGraphState)
    graph.add_node("model", call_model)
    graph.add_node("write_diary", write_diary_node)
    graph.add_edge(START, "model")
    graph.add_conditional_edges("model", route_after_model, {"write_diary": "write_diary", END: END})
    graph.add_edge("write_diary", END)
    return graph.compile()


_CHAT_GRAPH = None

def _get_chat_graph(db_context: dict):
    return _build_chat_graph(db_context)


async def svc_stream_message(
    db: AsyncSession,
    user_id: uuid.UUID,
    session_id: uuid.UUID,
    user_content: str,
) -> AsyncGenerator[str, None]:
    """
    向 ZhipuAI 发送消息，流式 yield SSE 文本块，最后将完整消息存入 DB。
    """
    session = await get_session(db, session_id, user_id)
    if not session:
        raise HTTPException(status_code=404, detail="会话不存在")

    await add_message(db, session_id, "user", user_content)
    history = await get_session_messages(db, session_id)
    messages = [{"role": "system", "content": session.system_prompt}]
    for msg in history:
        messages.append({"role": msg.role, "content": msg.content})

    state: ChatGraphState = {
        "messages": messages,
        "full_content": "",
        "tool_call_name": None,
        "tool_call_args": "",
        "diary_saved": False,
    }
    db_context = {"db": db, "user_id": user_id}
    graph = _get_chat_graph(db_context)

    try:
        result = await graph.ainvoke(state, config={"configurable": {"db_context": db_context}})
    except Exception as e:
        logger.exception("chat graph execution failed")
        yield f"data: {json.dumps({'type': 'error', 'message': str(e)}, ensure_ascii=False)}\n\n"
        return

    full_content = result.get("full_content", "")
    tool_call_name = result.get("tool_call_name")
    tool_call_args = result.get("tool_call_args", "")

    if tool_call_name == "write_diary" and tool_call_args:
        try:
            args = json.loads(tool_call_args)
            if not full_content:
                full_content = f"好的，日记《{args['title']}》已经悄悄保存到你的日记本里了 ✨"
                yield f"data: {json.dumps({'type': 'chunk', 'content': full_content}, ensure_ascii=False)}\n\n"

            await add_message(
                db,
                session_id,
                "diary_saved",
                json.dumps({"diary_id": "", "title": args["title"]}, ensure_ascii=False),
            )
            yield f"data: {json.dumps({'type': 'diary_saved', 'title': args['title']}, ensure_ascii=False)}\n\n"
        except Exception as e:
            logger.error("write_diary tool error: %s", e)
            err_msg = f"日记保存失败：{e}"
            yield f"data: {json.dumps({'type': 'error', 'message': err_msg}, ensure_ascii=False)}\n\n"
            return

    ref_ids = _extract_ref_ids(full_content)
    await add_message(db, session_id, "assistant", full_content, ref_ids)

    # 将 AI 回复作为 chunk 事件发送给前端
    yield f"data: {json.dumps({'type': 'chunk', 'content': full_content}, ensure_ascii=False)}\n\n"
    if ref_ids:
        yield f"data: {json.dumps({'type': 'refs', 'ids': ref_ids}, ensure_ascii=False)}\n\n"
    yield f"data: {json.dumps({'type': 'done'}, ensure_ascii=False)}\n\n"
