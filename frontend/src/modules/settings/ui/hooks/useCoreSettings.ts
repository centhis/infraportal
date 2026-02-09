import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { settingsApi } from '../../api/settings.api';
import type { SettingValueType } from '../../api/settings.dto';

const CORE_SETTINGS_QUERY_KEY = 'core-settings';

/**
 * Хук для получения Core настроек
 */
export function useCoreSettings() {
    return useQuery({
        queryKey: [CORE_SETTINGS_QUERY_KEY],
        queryFn: () => settingsApi.getCoreSettings(),
    });
}

/**
 * Хук для обновления Core настройки
 */
export function useUpdateCoreSetting() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ key, value }: { key: string; value: SettingValueType }) =>
            settingsApi.updateCoreSetting(key, value),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CORE_SETTINGS_QUERY_KEY] });
        },
    });
}

export { CORE_SETTINGS_QUERY_KEY };
