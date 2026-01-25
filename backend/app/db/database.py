from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from typing import Annotated
from fastapi import Depends

from app.core.config import settings
from app.db.orm_base import Base  # noqa: F401

engine = create_engine(
    settings.DATABASE_URL,
    echo=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
        db.commit()  # Explicitly commit here if no exception
    except:
        db.rollback() # Rollback if any exception occurred
        raise
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]

