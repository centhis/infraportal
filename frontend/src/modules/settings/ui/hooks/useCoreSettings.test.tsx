import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { renderHook, waitFor, cleanup } from '@testing-library/react';
import { useCoreSettings, useUpdateCoreSetting } from './useCoreSettings';
import { settingsApi } from '../../api/settings.api';
import { AllTheProviders } from '../../../../mocks/test-utils';
import { useAuth } from '../../../auth/ui/hooks/useAuth';
import type { CoreSettingsMap, CoreSetting } from '../../api/settings.dto';

// Мокаем API
vi.mock('../../api/settings.api', () => ({
    settingsApi: {
        getCoreSettings: vi.fn(),
        updateCoreSetting: vi.fn(),
    },
}));

// Мокаем useAuth (полагаемся на test-utils для мокирования, или настраиваем мок здесь)
// Поскольку test-utils мокает его, здесь просто настраиваем реализацию.
// Убеждаемся, что мок работает в этом контексте, если мок из test-utils не распространяется (он должен при импорте)
vi.mock('../../../auth/ui/hooks/useAuth');

describe('useCoreSettings Hooks', () => {
    const mockSettings: CoreSettingsMap = {
        APP_NAME: { key: 'APP_NAME', value: 'InfraPortal', type: 'string' },
        DEBUG_MODE: { key: 'DEBUG_MODE', value: 'false', type: 'boolean' },
    };

    beforeEach(() => {
        vi.resetAllMocks();
        // Настраиваем дефолтный мок auth
        (useAuth as Mock).mockReturnValue({
            user: { permissions: [] },
            loading: false,
            login: vi.fn(),
            logout: vi.fn(),
        });
    });

    afterEach(() => {
        // Очищаем после каждого теста для предотвращения утечек
        cleanup();
    });

    describe('useCoreSettings', () => {
        it('should fetch and return core settings', async () => {
            vi.mocked(settingsApi.getCoreSettings).mockResolvedValue(mockSettings);
            // Убеждаемся, что мок установлен (он установлен в beforeEach, но для уверенности)

            const { result } = renderHook(() => useCoreSettings(), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toEqual(mockSettings);
            expect(settingsApi.getCoreSettings).toHaveBeenCalledTimes(1);
        });

        it('should handle error', async () => {
            vi.mocked(settingsApi.getCoreSettings).mockRejectedValue(new Error('API Error'));

            const { result } = renderHook(() => useCoreSettings(), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isError).toBe(true));

            expect(result.current.error).toBeDefined();
        });
    });

    describe('useUpdateCoreSetting', () => {
        it('should call update API', async () => {
            const updateVariables = { key: 'APP_NAME', value: 'NewName' };
            const updatedSetting: CoreSetting = { key: 'APP_NAME', value: 'NewName', type: 'string' };

            vi.mocked(settingsApi.updateCoreSetting).mockResolvedValue(updatedSetting);

            const { result } = renderHook(() => useUpdateCoreSetting(), { wrapper: AllTheProviders });

            await result.current.mutateAsync(updateVariables);

            expect(settingsApi.updateCoreSetting).toHaveBeenCalledWith('APP_NAME', 'NewName');
        });
    });
});
