from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.users.permissions.schemas import PermissionResponseSchema

class CreateUserSchema(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=3)
    name: str = Field(..., min_length=1)
    is_active: bool = True
    type: str = "local"
    group_ids: Optional[list[int]] = None

    model_config = ConfigDict(from_attributes=True)

class UpdateUserSchema(BaseModel):
    login: Optional[str] = Field(None, min_length=3, max_length=50)
    password: Optional[str] = Field(None, min_length=3)
    name: Optional[str] = Field(None, min_length=1)
    is_active: Optional[bool] = None
    type: Optional[str] = None
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
    built_in_group_ids: List[int] = Field(default_factory=list) # New field

    model_config = ConfigDict(from_attributes=True)

class PaginatedUserResponse(BaseModel):
    total: int
    users: List[UserResponseSchema]

class RoleWithPermissionsSchema(BaseModel):
    id: int
    name: str
    built_in: bool
    permissions: List[PermissionResponseSchema] # Используем PermissionResponseSchema как Detail

    model_config = ConfigDict(from_attributes=True)

class GroupWithRolesAndPermissionsSchema(BaseModel):
    id: int
    name: str
    built_in: bool
    roles: List[RoleWithPermissionsSchema]

    model_config = ConfigDict(from_attributes=True)

class UserPermissionsReportSchema(BaseModel):
    user_id: int
    username: str
    all_unique_permissions: List[PermissionResponseSchema]
    groups_with_roles_and_permissions: List[GroupWithRolesAndPermissionsSchema]

    model_config = ConfigDict(from_attributes=True)