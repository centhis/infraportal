from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

class CreateRoleSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: str = Field(None, max_length=255)

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

    model_config = ConfigDict(from_attributes=True)

class PaginatedRoleResponse(BaseModel):
    total: int
    roles: List[RoleResponseSchema]