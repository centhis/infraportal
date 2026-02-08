from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.users.permissions.schemas import PermissionResponseSchema


class CreateRoleSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: str = Field(None, max_length=255)
    permissions: list[int] = Field(default_factory=list)  # Добавить поле permissions
    model_config = ConfigDict(from_attributes=True)


class UpdateRoleSchema(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: list[int] | None = None

    model_config = ConfigDict(from_attributes=True)


class RoleResponseSchema(BaseModel):
    id: int
    name: str
    description: str
    built_in: bool
    created_at: datetime
    permissions: list[PermissionResponseSchema]
    built_in_permission_ids: list[int] = Field(default_factory=list)  # Новое поле

    model_config = ConfigDict(from_attributes=True)


class PaginatedRoleResponse(BaseModel):
    total: int
    items: list[RoleResponseSchema]
