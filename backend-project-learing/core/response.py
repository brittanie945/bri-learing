"""统一 API 响应模型"""
from enum import Enum
from typing import Any, Dict, Generic, Optional, TypeVar, Union

from fastapi.encoders import jsonable_encoder
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field

T = TypeVar("T")

MessageKeyType = Union[str, "MessageKey"]


class CodeEnum(int, Enum):
    """标准业务状态码"""
    SUCCESS = 200
    CREATED = 201
    BAD_REQUEST = 400
    UNAUTHORIZED = 401
    FORBIDDEN = 403
    NOT_FOUND = 404
    UNPROCESSABLE = 422
    INTERNAL_ERROR = 500


class MessageKey(str, Enum):
    """响应消息键（供 i18n 扩展使用）"""
    COMMON_SUCCESS = "common.success"
    COMMON_CREATED = "common.created"
    COMMON_DELETED = "common.deleted"
    COMMON_UPDATED = "common.updated"
    COMMON_INTERNAL_ERROR = "common.internal_error"
    COMMON_NOT_FOUND = "common.not_found"
    COMMON_UNAUTHORIZED = "common.unauthorized"
    COMMON_FORBIDDEN = "common.forbidden"
    COMMON_BAD_REQUEST = "common.bad_request"
    COMMON_VALIDATION_ERROR = "common.validation_error"


def ensure_message_key(key: MessageKeyType) -> str:
    """将 MessageKey 枚举或字符串统一转为字符串"""
    if isinstance(key, MessageKey):
        return key.value
    return str(key)


class ApiResponse(BaseModel, Generic[T]):
    """统一成功响应模型"""

    code: int = Field(default=200, description="状态码，200 表示成功")
    message: str = Field(description="响应消息，描述操作结果")
    data: Optional[T] = Field(default=None, description="响应数据")
    message_params: Optional[Dict[str, Any]] = Field(
        default=None,
        description="消息格式化参数（i18n 插值用，响应返回前可由中间件移除）",
        repr=False,
    )

    def to_json_content(self) -> dict:
        """序列化为 JSON 内容，自动剔除 message_params 字段"""
        content = self.model_dump()
        content.pop("message_params", None)
        return jsonable_encoder(content)

    @staticmethod
    def success(
        data: Any = None,
        message_key: Optional[MessageKeyType] = None,
        message_params: Optional[Dict[str, Any]] = None,
    ) -> "ApiResponse":
        """
        创建成功响应

        Args:
            data: 响应数据
            message_key: 国际化消息键（枚举或字符串），默认 MessageKey.COMMON_SUCCESS
            message_params: 消息格式化参数
        """
        if message_key is None:
            message_key = MessageKey.COMMON_SUCCESS
        return ApiResponse(
            code=CodeEnum.SUCCESS.value,
            message=ensure_message_key(message_key),
            data=data,
            message_params=message_params,
        )

    @staticmethod
    def error(
        code: int = 500,
        message_key: Optional[MessageKeyType] = None,
        data: Optional[Any] = None,
        message_params: Optional[Dict[str, Any]] = None,
    ) -> "ApiResponse":
        """
        创建错误响应

        Args:
            code: 错误码
            message_key: 国际化消息键（枚举或字符串），默认 MessageKey.COMMON_INTERNAL_ERROR
            data: 附加错误数据
            message_params: 消息格式化参数
        """
        if message_key is None:
            message_key = MessageKey.COMMON_INTERNAL_ERROR
        return ApiResponse(
            code=code,
            message=ensure_message_key(message_key),
            data=data,
            message_params=message_params,
        )


# ────── 快捷响应函数（供路由层直接调用）──────

def ok(data: Any = None, message_key: Optional[MessageKeyType] = None) -> JSONResponse:
    """HTTP 200 成功响应"""
    resp = ApiResponse.success(data, message_key)
    return JSONResponse(content=resp.to_json_content(), status_code=200)


def created(data: Any = None, message_key: Optional[MessageKeyType] = None) -> JSONResponse:
    """HTTP 201 创建成功响应"""
    resp = ApiResponse(
        code=CodeEnum.CREATED.value,
        message=ensure_message_key(message_key or MessageKey.COMMON_CREATED),
        data=data,
    )
    return JSONResponse(content=resp.to_json_content(), status_code=201)
