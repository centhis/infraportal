from fastapi import APIRouter, Depends
from typing import List

from app.users.local.services import UserService
from app.users.local.schemas import UserResponseSchema, CreateUserSchema, UpdateUserSchema, PaginatedUserResponse
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/users", tags=['Users'])

@router.get("/", response_model=PaginatedUserResponse)
def list_users(service: UserService = Depends(), skip: int = 0, limit: int = 100, current_user = Depends(get_current_user)):
    return service.list_users(skip=skip, limit=limit)

@router.get("/{user_id}", response_model=UserResponseSchema)
def get_user_by_id(
    user_id: int, 
    service: UserService = Depends(),
    current_user = Depends(get_current_user)
    ):
    return service.get_user_by_id(user_id)

@router.get("/by-login/{login}", response_model=UserResponseSchema)
def get_user_by_login(login: str, service: UserService = Depends(), current_user = Depends(get_current_user)):
    return service.get_user_by_login(login)

@router.post("/", response_model=UserResponseSchema)
def create_user(data: CreateUserSchema, service: UserService = Depends(), current_user = Depends(get_current_user)):
    return service.create_user(data)

@router.put("/{user_id}", response_model=UserResponseSchema)
def update_user(user_id: int, data: UpdateUserSchema, service: UserService = Depends(), current_user = Depends(get_current_user)):
    return service.update_user(user_id, data)

@router.delete("/{user_id}")
def delete_user(user_id: int, service: UserService = Depends(), current_user = Depends(get_current_user)):
    return service.delete_user(user_id)