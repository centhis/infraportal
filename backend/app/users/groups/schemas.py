from pydantic import BaseModel, Field, ConfigDict
from typing import List
from datetime import datetime
from app.users.local.schemas import UserResponseSchema
from app.users.roles.schemas import RoleResponseSchema

class CreateGroupSchema(BaseModel):
    name: str = Field(..., min_length=3, max_length=50)
    description: str = Field(None, max_length=255)
    roles: List[int] = Field(default_factory=list)
    users: List[int] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)

class UpdateGroupSchema(BaseModel):
    name: str | None = None
    description: str | None = None
    roles: List[int] | None = None
    users: List[int] | None = None

    model_config = ConfigDict(from_attributes=True)

class GroupResponseSchema(BaseModel):
    id: int
    name: str
    description: str
    built_in: bool
    created_at: datetime
    roles: List[RoleResponseSchema] = [] # Use original RoleResponseSchema
    users: List[UserResponseSchema] = [] # Use original UserResponseSchema
    built_in_role_ids: List[int] = Field(default_factory=list) # New field
    built_in_user_ids: List[int] = Field(default_factory=list) # New field

    model_config = ConfigDict(from_attributes=True)

class PaginatedGroupResponse(BaseModel):
    total: int
    groups: List[GroupResponseSchema]