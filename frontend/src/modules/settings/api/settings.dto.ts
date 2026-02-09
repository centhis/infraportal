/**
 * Settings DTO (Data Transfer Objects)
 * Зеркало Pydantic-схем backend/app/settings
 */

// ============================================================================
// Общие
// ============================================================================

export type SettingValueType = string | number | boolean | null;

export interface BaseSetting {
    key: string;
    value: SettingValueType;
    description?: string;
    type?: 'string' | 'boolean' | 'bool';
}

// ============================================================================
// Основные настройки
// ============================================================================

export interface CoreSetting extends BaseSetting {
    category?: string;
}

export interface CoreSettingsMap {
    [key: string]: CoreSetting;
}

export interface CoreSettingsUpdate {
    key: string;
    value: SettingValueType;
}

// ============================================================================
// LDAP настройки
// ============================================================================

export interface LdapSetting extends BaseSetting {
    is_secret?: boolean;
}

export interface LdapSettings {
    [key: string]: LdapSetting;
}

export interface LdapSettingsUpdate {
    settings: Array<{ key: string; value: SettingValueType }>;
}

export interface LdapTestRequest {
    settings: LdapSettings;
}

export interface LdapTestResponse {
    success: boolean;
    message: string;
    details?: Record<string, unknown>;
}

export interface LdapEnabledResponse {
    enabled: boolean;
}
