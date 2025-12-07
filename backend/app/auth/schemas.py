from pydantic import BaseModel, ConfigDict
from typing import List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    permissions: List[str]

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

    model_config = ConfigDict(from_attributes=True)

class SessionResponseSchema(BaseModel):
    id: int
    user_agent: str | None
    ip_address: str | None
    created_at: datetime
    last_used_at: datetime

    model_config = ConfigDict(from_attributes=True)