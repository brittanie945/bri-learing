from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
from routers.auth import router as auth_router
from routers.diary import router as diary_router
from routers.drift import router as drift_router
from routers.chat import router as chat_router
from routers.coins import router as coins_router
from routers.seeds import router as seeds_router
from routers.quotes import router as quotes_router
from services.quote_service import svc_seed_and_maybe_generate
from database import get_db as _get_db


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    # 初始化金句词库（若为空则写入预置数据，不足 30 条则 AI 补充）
    async for db in _get_db():
        await svc_seed_and_maybe_generate(db)
        break
    yield


app = FastAPI(title="树洞 — Treehouse API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "http://localhost:3002",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(diary_router)
app.include_router(drift_router)
app.include_router(chat_router)
app.include_router(coins_router)
app.include_router(seeds_router)
app.include_router(quotes_router)


@app.get("/health")
async def health():
    return {"status": "ok"}
