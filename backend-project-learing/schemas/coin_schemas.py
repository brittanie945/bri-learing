from pydantic import BaseModel
from datetime import datetime
from typing import Optional, List
from uuid import UUID
from enum import Enum


class VoucherType(str, Enum):
    TIME_ACCELERATE = "TIME_ACCELERATE"   # 光加速券：胶囊提前 7 天开启
    TIME_FREEZE = "TIME_FREEZE"           # 时光冻结券：胶囊延期 30 天


VOUCHER_COST = {
    VoucherType.TIME_ACCELERATE: 30,
    VoucherType.TIME_FREEZE: 20,
}


class CoinBalanceResponse(BaseModel):
    balance: int
    total_earned: int
    total_spent: int


class CoinTransactionItem(BaseModel):
    id: UUID
    amount: int
    type: str
    reason: str
    related_id: Optional[str]
    created_at: datetime

    model_config = {"from_attributes": True}


class UseVoucherRequest(BaseModel):
    voucher_type: VoucherType
    target_id: str  # DiaryEntry.id


class UseVoucherResponse(BaseModel):
    success: bool
    new_balance: int
    message: str


class CheckinResult(BaseModel):
    coins_earned: int
    streak_days: int
    already_checked_in: bool


class BuyVoucherRequest(BaseModel):
    voucher_type: VoucherType


class BuyVoucherResponse(BaseModel):
    success: bool
    new_balance: int
    voucher_type: VoucherType
    quantity: int   # 购买后该券的持有数量
    message: str


class VoucherInventoryItem(BaseModel):
    voucher_type: VoucherType
    quantity: int

    model_config = {"from_attributes": True}
