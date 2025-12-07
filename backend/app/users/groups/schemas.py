from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime

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

    model_config = ConfigDict(from_attributes=True)

class PaginatedGroupResponse(BaseModel):
    total: int
    groups: List[GroupResponseSchema]