from pydantic import BaseModel, Field, ConfigDict
from typing import List
from datetime import datetime
from app.users.permissions.schemas import PermissionResponseSchema

class CreateRoleSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: str = Field(None, max_length=255)
    permissions: List[int] = Field(default_factory=list) # Add permissions field

    model_config = ConfigDict(from_attributes=True)

class UpdateRoleSchema(BaseModel):
    name: str | None = None
    description: str | None = None
    permissions: List[int] | None = None

    model_config = ConfigDict(from_attributes=True)

class RoleResponseSchema(BaseModel):
    id: int
    name: str
    description: str
    built_in: bool
    created_at: datetime
    permissions: List[PermissionResponseSchema]
    built_in_permission_ids: List[int] = Field(default_factory=list) # New field

    model_config = ConfigDict(from_attributes=True)

class PaginatedRoleResponse(BaseModel):
    total: int
    roles: List[RoleResponseSchema]