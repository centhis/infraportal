from typing import Annotated

from fastapi import Depends
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker

from app.core.config import settings
from app.db.orm_base import Base  # noqa: F401

engine = create_engine(settings.DATABASE_URL, echo=True)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()  # Явно фиксируем здесь, если нет исключений
    except:
        db.rollback()  # Откат, если произошло какое-либо исключение
        raise
    finally:
        db.close()


db_dependency = Annotated[Session, Depends(get_db)]
