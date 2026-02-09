from app.core.settings_resolver import register_resolver

# Импортируем подмодули, чтобы они успели зарегистрировать свои геттеры
# Порядок важен: если core импортируется первым, он попадает в хвост списка (из-за insert(0) логики? Нет, проверим логику)
# Логика resolver.py: _setting_getters.insert(0, getter)
# Значит:
# 1. Импорт core -> регистрация core -> [core]
# 2. Импорт ldap -> регистрация ldap -> [ldap, core]
# Итог: ищем сначала в ldap, потом в core. Это то, что нужно.
from . import core as core
from . import ldap as ldap
from .resolver import settings_resolver

# Регистрируем главный резолвер настроек в ядре
register_resolver(settings_resolver)
