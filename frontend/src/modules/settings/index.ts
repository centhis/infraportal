// Экспорт API
export { settingsApi } from './api/settings.api';

// DTO типы
export type {
    BaseSetting,
    SettingValueType,
    CoreSetting,
    CoreSettingsMap,
    CoreSettingsUpdate,
    LdapSetting,
    LdapSettings,
    LdapSettingsUpdate,
    LdapTestRequest,
    LdapTestResponse,
    LdapEnabledResponse,
} from './api/settings.dto';

// Сервисы
export { SettingsService, testLdapConnection, checkLdapEnabled } from './services/SettingsService';

// Хуки
export {
    useCoreSettings,
    useUpdateCoreSetting,
    CORE_SETTINGS_QUERY_KEY,
} from './ui/hooks/useCoreSettings';

export {
    useLdapSettings,
    useLdapEnabled,
    useUpdateLdapSetting,
    useUpdateLdapSettingsBulk,
    useTestLdapConnection,
    LDAP_SETTINGS_QUERY_KEY,
    LDAP_ENABLED_QUERY_KEY,
} from './ui/hooks/useLdapSettings';

// Страницы
export { SettingsPage } from './ui/pages/SettingsPage';
export { CoreSettingsPage } from './ui/pages/CoreSettingsPage';
export { LdapSettingsPage } from './ui/pages/LdapSettingsPage';

// Маршруты
export { settingsRoutes } from './routes';

