from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class CreateUserSchema(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=3)
    name: str = Field(..., min_length=1)
    is_active: bool = True
    type: str = "local"
    group_ids: Optional[list[int]] = None

    model_config = ConfigDict(from_attributes=True)

class UpdateUserSchema(BaseModel):
    login: str | None = None
    password: str | None = None
    name: str | None = None
    is_active: bool | None = None
    type: str | None = None
    group_ids: Optional[list[int]] = None

    model_config = ConfigDict(from_attributes=True)

class GroupBasicResponseSchema(BaseModel):
    id: int
    name: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)

class UserResponseSchema(BaseModel):
    id: int
    login: str
    name: str
    is_active: bool = True
    type: str
    created_at: datetime
    groups: List[GroupBasicResponseSchema] = []

    model_config = ConfigDict(from_attributes=True)

class PaginatedUserResponse(BaseModel):
    total: int
    users: List[UserResponseSchema]