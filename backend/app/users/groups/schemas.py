from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.users.local.schemas import UserResponseSchema
from app.users.roles.schemas import RoleResponseSchema


class CreateGroupSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: str = Field(None, max_length=255)
    roles: list[int] = Field(default_factory=list)
    users: list[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class UpdateGroupSchema(BaseModel):
    name: str | None = None
    description: str | None = None
    roles: list[int] | None = None
    users: list[int] | None = None

    model_config = ConfigDict(from_attributes=True)


class GroupResponseSchema(BaseModel):
    id: int
    name: str
    description: str
    built_in: bool
    created_at: datetime
    roles: list[RoleResponseSchema] = []  # Использовать оригинальную RoleResponseSchema
    users: list[UserResponseSchema] = []  # Использовать оригинальную UserResponseSchema
    built_in_role_ids: list[int] = Field(default_factory=list)  # Новое поле
    built_in_user_ids: list[int] = Field(default_factory=list)  # Новое поле

    model_config = ConfigDict(from_attributes=True)


class PaginatedGroupResponse(BaseModel):
    total: int
    items: list[GroupResponseSchema]
