from pydantic import BaseModel, ConfigDict

class Token(BaseModel):
    access_token: str
    token_type: str

class UserBaseSchema(BaseModel):
    name: str
    login: str

class LoginUserSchema(BaseModel):
    login: str
    password: str

class CurrenUserSchema(BaseModel):
    id: int
    login: str
    name: str
    is_admin: bool

    model_config = ConfigDict(from_attributes=True)