import { z } from 'zod';

/**
 * Схемы валидации для настроек
 */

// Валидация Cron (5 частей: мин час день мес дн_нед)
export const CronSchema = z.string().regex(
    /^(\*|([0-5]?\d)) (\*|([0-1]?\d|2[0-3])) (\*|([0-2]?\d|3[01])) (\*|([0]?[1-9]|1[0-2])) (\*|([0-6]))$/,
    { message: 'Неверный формат Cron (мин час день мес дн_нед)' }
);

// Валидация LDAP URI (ldap:// или ldaps://)
export const LdapUriSchema = z.string().regex(
    /^ldaps?:\/\/.+/i,
    { message: 'URI должен начинаться с ldap:// или ldaps://' }
);

// Валидация непустого значения
export const RequiredSchema = z.string().min(1, { message: 'Обязательное поле' });

// Маппинг ключей настроек на схемы валидации
export const SettingValidationSchemas = {
    'LDAP_SYNC_SCHEDULE': CronSchema,
    'LDAP_URI': LdapUriSchema,
    'LDAP_BASE_DN': RequiredSchema,
    'LDAP_BIND_DN': RequiredSchema,
    'LDAP_BIND_PASSWORD': RequiredSchema,
};

/**
 * Валидирует значение настройки по её ключу
 * @param {string} key - Ключ настройки
 * @param {string} value - Значение для валидации
 * @returns {{ success: boolean, error?: string }}
 */
export const validateSetting = (key, value) => {
    const schema = SettingValidationSchemas[key];
    if (!schema) {
        return { success: true };
    }

    const result = schema.safeParse(value);
    if (result.success) {
        return { success: true };
    }

    return {
        success: false,
        error: result.error.errors[0]?.message || 'Ошибка валидации'
    };
};
