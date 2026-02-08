import datetime
import logging

from celery_sqlalchemy_scheduler import models
from sqlalchemy import select

logger = logging.getLogger(__name__)


def apply_patches():
    """
    Патчит celery-sqlalchemy-scheduler для работы с SQLAlchemy 2.0.
    """
    try:
        # Проверяем, можем ли мы пропатчить метод класса модели?
        if hasattr(models.PeriodicTaskChanged, "update_changed"):
            # Использовать обычную функцию вместо @classmethod внутри замыкания
            def patched_update_changed(mapper, connection, target):
                """
                Пропатченная версия update_changed, использующая синтаксис select из SA 2.0.
                """

                # Используем текущее время UTC для last_update, соответствующее поведению оригинальной логики (упрощено)
                # Оригинальная библиотека использовала dt.datetime.now()
                now = datetime.datetime.now(datetime.UTC)

                # Упрощенная логика, совместимая с SA 2.0:
                # 1. Проверить, существует ли строка.
                # 2. Обновить ее.
                # 3. Если не существует, вставить ее.

                stmt = select(models.PeriodicTaskChanged).limit(1)
                result = connection.execute(stmt).first()

                if not result:
                    # Вставка
                    connection.execute(
                        models.PeriodicTaskChanged.__table__.insert().values(id=1, last_update=now)
                    )
                else:
                    # Обновление
                    connection.execute(
                        models.PeriodicTaskChanged.__table__.update()
                        .where(models.PeriodicTaskChanged.id == 1)
                        .values(last_update=now)
                    )

            # --- Критический шаг: Отвязка и перепривязка событий ---
            from celery_sqlalchemy_scheduler.models import (
                CrontabSchedule,
                IntervalSchedule,
                PeriodicTask,
                SolarSchedule,
            )
            from sqlalchemy import event

            # Список моделей и событий, где зарегистрирован update_changed
            targets = [
                (PeriodicTask, "after_insert"),
                (PeriodicTask, "after_delete"),
                (IntervalSchedule, "after_insert"),
                (IntervalSchedule, "after_delete"),
                (IntervalSchedule, "after_update"),
                (CrontabSchedule, "after_insert"),
                (CrontabSchedule, "after_delete"),
                (CrontabSchedule, "after_update"),
                (SolarSchedule, "after_insert"),
                (SolarSchedule, "after_delete"),
                (SolarSchedule, "after_update"),
            ]

            original_method = models.PeriodicTaskChanged.update_changed

            for model_cls, event_name in targets:
                if event.contains(model_cls, event_name, original_method):
                    event.remove(model_cls, event_name, original_method)
                    event.listen(model_cls, event_name, patched_update_changed)
                    logger.debug(f"Replaced listener for {model_cls.__name__}.{event_name}")

            # Также заменить метод класса в PeriodicTaskChanged
            # Использовать staticmethod, чтобы избежать внедрения аргумента 'cls' при вызове через cls.update_changed
            models.PeriodicTaskChanged.update_changed = staticmethod(patched_update_changed)

            logger.info(
                "Successfully patched celery-sqlalchemy-scheduler events for SQLAlchemy 2.0 compatibility."
            )

    except Exception as e:
        logger.error(f"Failed to patch celery-sqlalchemy-scheduler: {e}", exc_info=True)
