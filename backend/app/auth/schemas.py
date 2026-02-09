from datetime import datetime

from pydantic import BaseModel, ConfigDict


class Token(BaseModel):
    access_token: str
    token_type: str
    permissions: list[str]


class UserBaseSchema(BaseModel):
    name: str
    login: str


class LoginUserSchema(BaseModel):
    login: str
    password: str


class CurrenUserSchema(BaseModel):
    id: int
    login: str
    name: str
    permissions: list[str]

    model_config = ConfigDict(from_attributes=True)


class SessionResponseSchema(BaseModel):
    id: int
    user_agent: str | None
    ip_address: str | None
    created_at: datetime
    last_used_at: datetime

    model_config = ConfigDict(from_attributes=True)
