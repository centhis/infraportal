from app.settings.resolver import register_setting_getter

from .services import get_core_setting_value

# Регистрируем геттер core настроек
# Core настройки являются fallback, поэтому их лучше регистрировать первыми (чтобы они оказались в конце списка, если используем insert(0))
# Но постойте, если мы используем insert(0), то последний зарегистрированный будет первым.
# Значит core должен быть зарегистрирован ПЕРВЫМ, чтобы LDAP (зарегистрированный позже) стал перед ним.
register_setting_getter(get_core_setting_value)
