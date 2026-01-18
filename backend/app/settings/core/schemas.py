from typing import Any, Optional
from pydantic import BaseModel, ConfigDict, model_validator

class CoreSettingBase(BaseModel):
    key: str
    value: Optional[str]
    type: str
    is_sensitive: bool

class CoreSettingCreate(CoreSettingBase):
    pass

class CoreSettingUpdate(BaseModel):
    value: Optional[str]

class CoreSettingSchema(CoreSettingBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def mask_sensitive_value(self):
        if self.is_sensitive:
            self.value = "***"
        return self