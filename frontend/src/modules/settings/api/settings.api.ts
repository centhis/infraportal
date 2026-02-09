import { apiClient } from '@shared/api';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type {
    CoreSetting,
    CoreSettingsMap,
    SettingValueType,
    LdapSettings,
    LdapSetting,
    LdapTestRequest,
    LdapTestResponse,
    LdapEnabledResponse,
} from './settings.dto';

/**
 * API методы для Settings
 */
export const settingsApi = {
    // =========================================================================
    // Основные настройки
    // =========================================================================

    /**
     * Получить все Core настройки
     */
    async getCoreSettings(): Promise<CoreSettingsMap> {
        const response = await apiClient.get<CoreSettingsMap>(API_ENDPOINTS.SETTINGS.CORE);
        return response.data;
    },

    /**
     * Обновить Core настройку
     */
    async updateCoreSetting(key: string, value: SettingValueType): Promise<CoreSetting> {
        const response = await apiClient.put<CoreSetting>(
            `${API_ENDPOINTS.SETTINGS.CORE}/${key}`,
            { value }
        );
        return response.data;
    },

    // =========================================================================
    // LDAP настройки
    // =========================================================================

    /**
     * Получить все LDAP настройки
     */
    async getLdapSettings(): Promise<LdapSettings> {
        const response = await apiClient.get<LdapSetting[]>(API_ENDPOINTS.SETTINGS.LDAP);
        // Преобразуем массив в объект (Map) по ключу, так как типы ожидают LdapSettings
        return response.data.reduce((acc, item) => {
            acc[item.key] = item;
            return acc;
        }, {} as LdapSettings);
    },

    /**
     * Обновить одну LDAP настройку
     */
    async updateLdapSetting(key: string, value: SettingValueType): Promise<LdapSettings> {
        const response = await apiClient.put<LdapSettings>(
            `${API_ENDPOINTS.SETTINGS.LDAP}/${key}`,
            { value }
        );
        return response.data;
    },

    /**
     * Обновить несколько LDAP настроек
     */
    async updateLdapSettingsBulk(
        settings: Array<{ key: string; value: SettingValueType }>
    ): Promise<LdapSettings> {
        // Преобразуем массив обновлений в объект { KEY: VALUE }, как ожидает бэкенд
        const flatSettings = settings.reduce((acc, item) => {
            acc[item.key] = item.value;
            return acc;
        }, {} as Record<string, SettingValueType>);

        const response = await apiClient.patch<LdapSettings>(
            API_ENDPOINTS.SETTINGS.LDAP,
            { settings: flatSettings }
        );
        return response.data;
    },

    /**
     * Тестировать LDAP подключение
     */
    async testLdapConnection(request: LdapTestRequest): Promise<LdapTestResponse> {
        // Преобразуем объект настроек из { KEY: { value: ... } } в { KEY: value, ... }
        const flatSettings = Object.entries(request.settings).reduce((acc, [key, item]) => {
            acc[key] = item.value;
            return acc;
        }, {} as Record<string, SettingValueType>);

        const response = await apiClient.post<LdapTestResponse>(
            API_ENDPOINTS.SETTINGS.LDAP_TEST,
            { settings: flatSettings }
        );
        return response.data;
    },

    /**
     * Проверить, включен ли LDAP
     */
    async isLdapEnabled(): Promise<boolean> {
        const response = await apiClient.get<LdapEnabledResponse>(
            API_ENDPOINTS.SETTINGS.LDAP_IS_ENABLED
        );
        return response.data.enabled;
    },
};
