from typing import Any, List, Optional
import json

from sqlalchemy.orm import Session

from app.settings.core.models import CoreSetting

def _convert_value_to_type(value: str, type_str: str) -> Any:
    """
    Преобразует строковое значение в соответствующий Python-тип.
    """
    if type_str == "bool":
        return value.lower() == "true"
    elif type_str == "int":
        return int(value)
    elif type_str == "float":
        return float(value)
    elif type_str == "json":
        return json.loads(value)
    return value

def get_core_setting_by_key(db: Session, key: str) -> Optional[CoreSetting]:
    """
    Получает объект Core Setting из БД по ее уникальному ключу.
    """
    return db.query(CoreSetting).filter(CoreSetting.key == key).first()

def get_all_core_settings(db: Session) -> List[CoreSetting]:
    """
    Получает список всех Core Settings из БД.
    """
    return db.query(CoreSetting).all()

def update_core_setting(db: Session, key: str, value: Any) -> CoreSetting:
    """
    Обновляет значение существующей Core Setting по ее ключу.
    """
    db_setting = db.query(CoreSetting).filter(CoreSetting.key == key).first()
    if not db_setting:
        # TODO: Implement error handling or raise an exception
        return None
    
    # Convert value to string for storage
    if isinstance(value, (dict, list)):
        db_setting.value = json.dumps(value)
    else:
        db_setting.value = str(value)

    db.add(db_setting)
    db.commit()
    db.refresh(db_setting)
    return db_setting

def get_core_setting_value(db: Session, key: str) -> Any:
    """
    Вспомогательная функция для получения значения Core Setting по ключу с приведением типа.
    """
    db_setting = get_core_setting_by_key(db, key)
    if db_setting:
        return _convert_value_to_type(db_setting.value, db_setting.type)
    return None
