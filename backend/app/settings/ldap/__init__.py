from app.settings.resolver import register_setting_getter

from .services import get_ldap_setting_value

# Регистрируем геттер LDAP настроек
register_setting_getter(get_ldap_setting_value)
