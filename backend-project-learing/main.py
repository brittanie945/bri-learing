from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from core.response import ApiResponse, MessageKey
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
    # 在独立连接中尝试启用 pgvector 扩展（失败不影响主流程）
    try:
        async with engine.begin() as pg_conn:
            from sqlalchemy import text
            await pg_conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
    except Exception:
        pass

    # 创建所有表（独立事务）
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # 初始化金句词库（后台执行，不阻塞启动）
    import asyncio
    async def _seed():
        async for db in _get_db():
            try:
                await svc_seed_and_maybe_generate(db)
            except Exception:
                pass
            break
    asyncio.ensure_future(_seed())
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


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    resp = ApiResponse.error(code=exc.status_code, message_key=exc.detail)
    return JSONResponse(status_code=exc.status_code, content=resp.to_json_content())


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    resp = ApiResponse.error(code=422, message_key=MessageKey.COMMON_VALIDATION_ERROR)
    return JSONResponse(status_code=422, content=resp.to_json_content())


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    resp = ApiResponse.error(code=500, message_key=MessageKey.COMMON_INTERNAL_ERROR)
    return JSONResponse(status_code=500, content=resp.to_json_content())


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
