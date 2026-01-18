from typing import Any, Optional, Dict
from pydantic import BaseModel, ConfigDict, model_validator

class LdapSettingBase(BaseModel):
    key: str
    value: Optional[str]
    type: str
    is_sensitive: bool

class LdapSettingCreate(LdapSettingBase):
    pass

class LdapSettingUpdate(BaseModel):
    value: Optional[str]

class LdapBulkUpdateSchema(BaseModel):
    settings: Dict[str, Any]

class LdapSettingSchema(LdapSettingBase):
    id: int

    model_config = ConfigDict(from_attributes=True)

    @model_validator(mode='after')
    def mask_sensitive_value(self) -> 'LdapSettingSchema':
        if self.is_sensitive:
            self.value = "********"
        return self

class LdapTestSettingsSchema(BaseModel):
    settings: Dict[str, Any]

class LdapTestResultSchema(BaseModel):
    success: bool
    message: str
