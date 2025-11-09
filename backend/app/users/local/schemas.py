from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List
from datetime import datetime


class CreateUserSchema(BaseModel):
    login: str = Field(..., min_length=3, max_length=50)
    password: str = Field(..., min_length=3)
    name: str = Field(..., min_length=1)
    is_admin: bool = False
    is_active: bool = True
    is_ldap: bool = False

    model_config = ConfigDict(from_attributes=True)

class UpdateUserSchema(BaseModel):
    password: str | None = None
    name: str | None = None
    is_admin: bool | None = None
    is_active: bool | None = None

    model_config = ConfigDict(from_attributes=True)

class UserResponseSchema(BaseModel):
    id: int
    login: str
    name: str
    is_admin: bool = False
    is_active: bool = True
    is_ldap: bool = False
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PaginatedUserResponse(BaseModel):
    total: int
    users: List[UserResponseSchema]