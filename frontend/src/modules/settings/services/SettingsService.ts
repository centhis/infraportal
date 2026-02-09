import { settingsApi } from '../api/settings.api';
import type { LdapTestResponse, LdapSettings, SettingValueType } from '../api/settings.dto';

/**
 * Сервис для работы с настройками.
 * Содержит бизнес-логику валидации и тестирования.
 */
export class SettingsService {
    /**
     * Тестировать LDAP подключение с текущими настройками
     */
    static async testLdapConnectionWithSettings(
        settings: LdapSettings
    ): Promise<LdapTestResponse> {
        return settingsApi.testLdapConnection({ settings });
    }

    /**
     * Проверить, включен ли LDAP
     */
    static async checkLdapEnabled(): Promise<boolean> {
        return settingsApi.isLdapEnabled();
    }

    /**
     * Обновить несколько настроек LDAP
     */
    static async updateMultipleLdapSettings(
        updates: Array<{ key: string; value: SettingValueType }>
    ): Promise<LdapSettings> {
        return settingsApi.updateLdapSettingsBulk(updates);
    }
}

// Экспорт удобных функций
export const testLdapConnection = SettingsService.testLdapConnectionWithSettings;
export const checkLdapEnabled = SettingsService.checkLdapEnabled;
