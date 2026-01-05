from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime
from app.users.local.schemas import UserResponseSchema
from app.users.roles.schemas import RoleResponseSchema

class CreateGroupSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: str = Field(None, max_length=255)

    model_config = ConfigDict(from_attributes=True)

class UpdateGroupSchema(BaseModel):
    name: str | None = None
    description: str | None = None
    roles: List[int] | None = None

    model_config = ConfigDict(from_attributes=True)

class GroupResponseSchema(BaseModel):
    id: int
    name: str
    description: str
    built_in: bool
    created_at: datetime
    roles: List[RoleResponseSchema] = []
    users: List[UserResponseSchema] = []

    model_config = ConfigDict(from_attributes=True)

class PaginatedGroupResponse(BaseModel):
    total: int
    groups: List[GroupResponseSchema]