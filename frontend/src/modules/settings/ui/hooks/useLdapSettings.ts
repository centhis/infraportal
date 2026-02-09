import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/settings.api';
import type { LdapSettings, SettingValueType, LdapTestResponse } from '../../api/settings.dto';

const LDAP_SETTINGS_QUERY_KEY = 'ldap-settings';
const LDAP_ENABLED_QUERY_KEY = 'ldap-enabled';

/**
 * Хук для получения LDAP настроек
 */
export function useLdapSettings() {
    return useQuery({
        queryKey: [LDAP_SETTINGS_QUERY_KEY],
        queryFn: () => settingsApi.getLdapSettings(),
    });
}

/**
 * Хук для проверки включённости LDAP
 */
export function useLdapEnabled() {
    return useQuery({
        queryKey: [LDAP_ENABLED_QUERY_KEY],
        queryFn: () => settingsApi.isLdapEnabled(),
        staleTime: 5 * 60 * 1000, // 5 минут
    });
}

/**
 * Хук для обновления одной LDAP настройки
 */
export function useUpdateLdapSetting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ key, value }: { key: string; value: SettingValueType }) =>
            settingsApi.updateLdapSetting(key, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [LDAP_SETTINGS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [LDAP_ENABLED_QUERY_KEY] });
        },
    });
}

/**
 * Хук для массового обновления LDAP настроек
 */
export function useUpdateLdapSettingsBulk() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (settings: Array<{ key: string; value: SettingValueType }>) =>
            settingsApi.updateLdapSettingsBulk(settings),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [LDAP_SETTINGS_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: [LDAP_ENABLED_QUERY_KEY] });
        },
    });
}

/**
 * Хук для тестирования LDAP подключения
 */
export function useTestLdapConnection() {
    return useMutation({
        mutationFn: (settings: LdapSettings): Promise<LdapTestResponse> =>
            settingsApi.testLdapConnection({ settings }),
    });
}

export { LDAP_SETTINGS_QUERY_KEY, LDAP_ENABLED_QUERY_KEY };
