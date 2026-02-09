from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.users.permissions.schemas import PermissionResponseSchema


class CreateUserSchema(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=3)
    name: str = Field(..., min_length=1)
    is_active: bool = True
    type: str = "local"
    group_ids: list[int] | None = None

    model_config = ConfigDict(from_attributes=True)


class UpdateUserSchema(BaseModel):
    login: str | None = Field(None, min_length=3, max_length=50)
    password: str | None = Field(None, min_length=3)
    name: str | None = Field(None, min_length=1)
    is_active: bool | None = None
    type: str | None = None
    group_ids: list[int] | None = None

    model_config = ConfigDict(from_attributes=True)


class GroupBasicResponseSchema(BaseModel):
    id: int
    name: str
    description: str | None = None

    model_config = ConfigDict(from_attributes=True)


class UserResponseSchema(BaseModel):
    id: int
    login: str
    name: str
    is_active: bool = True
    type: str
    created_at: datetime
    groups: list[GroupBasicResponseSchema] = []
    built_in_group_ids: list[int] = Field(default_factory=list)  # Новое поле

    model_config = ConfigDict(from_attributes=True)


class PaginatedUserResponse(BaseModel):
    total: int
    items: list[UserResponseSchema]


class RoleWithPermissionsSchema(BaseModel):
    id: int
    name: str
    built_in: bool
    permissions: list[PermissionResponseSchema]  # Используем PermissionResponseSchema как Detail

    model_config = ConfigDict(from_attributes=True)


class GroupWithRolesAndPermissionsSchema(BaseModel):
    id: int
    name: str
    built_in: bool
    roles: list[RoleWithPermissionsSchema]

    model_config = ConfigDict(from_attributes=True)


class UserPermissionsReportSchema(BaseModel):
    user_id: int
    username: str
    all_unique_permissions: list[PermissionResponseSchema]
    groups_with_roles_and_permissions: list[GroupWithRolesAndPermissionsSchema]

    model_config = ConfigDict(from_attributes=True)
