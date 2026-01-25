from pydantic import BaseModel, Field

class SyncLdapParams(BaseModel):
    group_dn: str = Field(description="DN группы для синхронизации")

# Просто список кортежей, который будет обнаружен автоматически
TASK_DEFINITIONS = [
    ( "users:sync_ldap", SyncLdapParams, "users:tasks:sync" )
]
