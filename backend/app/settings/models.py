
from sqlalchemy import Column, String, Integer, UniqueConstraint
from app.db.database import Base

class TaskSecretMapping(Base):
    __tablename__ = "task_secret_mappings"

    id = Column(Integer, primary_key=True, index=True)
    task_type = Column(String, index=True, nullable=False)
    setting_key = Column(String, nullable=False)

    __table_args__ = (
        UniqueConstraint('task_type', 'setting_key', name='unique_task_setting_mapping'),
    )
