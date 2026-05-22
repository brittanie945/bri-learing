"""业务逻辑层：时光种子"""
import random
from datetime import datetime, timezone
from uuid import UUID

from fastapi import HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from repositories.seed_repository import (
    get_active_seed,
    get_all_seeds,
    create_seed,
    auto_wither_if_missed,
    water_seed,
    revive_seed,
    _seed_last_watered_date,
)
from repositories.coin_repository import add_coins, consume_voucher
from schemas.seed_schemas import (
    PlantSeedRequest,
    SeedResponse,
    WaterSeedResponse,
    CurrentSeedResponse,
)

_SPROUT_ENCOURAGEMENTS = [
    "你的坚持让种子发芽了！🌸 奖励 10 时光币已到账。",
    "三天连续，时光见证了你的毅力。✨ 已获得 10 时光币！",
    "每一次浇水都是对自己的温柔呵护。🌿 +10 时光币",
    "发芽了！继续种下更多美好的时刻。🌱 奖励已送达~",
    "坚持三天，这颗种子承载着你的心意。🌺 +10 时光币",
]


async def svc_get_current(db: AsyncSession, user_id: UUID) -> CurrentSeedResponse:
    """获取当前种子状态 + 枯枝记录 + 已发芽大树历史（惰性枯萎检测在此触发）。"""
    all_seeds = await get_all_seeds(db, user_id)
    active = None
    withered = []
    sprouted = []
    for seed in all_seeds:
        if seed.status == "growing":
            withered_now = await auto_wither_if_missed(db, seed)
            if withered_now:
                withered.append(seed)
            else:
                active = seed
        elif seed.status == "withered":
            withered.append(seed)
        elif seed.status == "sprouted":
            sprouted.append(seed)
    return CurrentSeedResponse(
        active_seed=SeedResponse.model_validate(active) if active else None,
        withered_seeds=[SeedResponse.model_validate(s) for s in withered],
        sprouted_seeds=[SeedResponse.model_validate(s) for s in sprouted],
    )


async def svc_plant_seed(
    db: AsyncSession, user_id: UUID, req: PlantSeedRequest
) -> SeedResponse:
    """种下新种子（同一时间只能有一颗 growing 种子）。"""
    active = await get_active_seed(db, user_id)
    if active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="已有一颗正在生长的种子，请等待它发芽或枯萎后再种新的",
        )
    seed = await create_seed(db, user_id, req.seed_type.value, req.task_note)
    return SeedResponse.model_validate(seed)


async def svc_water_seed(db: AsyncSession, user_id: UUID) -> WaterSeedResponse:
    """每日浇水：连续3天则发芽并奖励10时光币。"""
    active = await get_active_seed(db, user_id)
    if not active:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="当前没有正在生长的种子，请先种下一颗",
        )

    # 惰性枯萎检测
    withered_now = await auto_wither_if_missed(db, active)
    if withered_now:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="种子因断签已枯萎，可以购买时光营养液复活它",
        )

    # 今日幂等检查
    today = datetime.now(timezone.utc).date()
    if _seed_last_watered_date(active) == today:
        return WaterSeedResponse(
            seed=SeedResponse.model_validate(active),
            already_watered=True,
            sprouted=False,
            coins_earned=0,
            encouragement_message="今天已经浇过水了，明天再来 🌱",
        )

    seed = await water_seed(db, active)
    sprouted = seed.status == "sprouted"
    coins_earned = 0
    if sprouted:
        await add_coins(db, user_id, 10, "SEED_SPROUT", str(seed.id))
        coins_earned = 10

    msg = (
        random.choice(_SPROUT_ENCOURAGEMENTS)
        if sprouted
        else f"第 {seed.streak_days} 天，继续加油！🌱"
    )
    return WaterSeedResponse(
        seed=SeedResponse.model_validate(seed),
        already_watered=False,
        sprouted=sprouted,
        coins_earned=coins_earned,
        encouragement_message=msg,
    )


async def svc_revive_seed(db: AsyncSession, user_id: UUID) -> SeedResponse:
    """消耗一张时光营养液复活最近一颗枯萎种子（每颗只能复活一次）。"""
    all_seeds = await get_all_seeds(db, user_id)
    withered = next(
        (s for s in all_seeds if s.status == "withered" and not s.is_revived),
        None,
    )
    if not withered:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="没有可复活的枯萎种子（每颗种子只能复活一次）",
        )
    try:
        await consume_voucher(db, user_id, "SEED_REVIVAL")
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    seed = await revive_seed(db, withered)
    return SeedResponse.model_validate(seed)
