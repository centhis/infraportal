import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import {
    useLdapSettings,
    useLdapEnabled,
    useUpdateLdapSetting,
    useUpdateLdapSettingsBulk,
    useTestLdapConnection
} from './useLdapSettings';
import { settingsApi } from '../../api/settings.api';
import { AllTheProviders } from '../../../../mocks/test-utils';
import { useAuth } from '../../../auth/ui/hooks/useAuth';
import type { LdapSettings, LdapTestResponse } from '../../api/settings.dto';

// Мокаем API
vi.mock('../../api/settings.api', () => ({
    settingsApi: {
        getLdapSettings: vi.fn(),
        isLdapEnabled: vi.fn(),
        updateLdapSetting: vi.fn(),
        updateLdapSettingsBulk: vi.fn(),
        testLdapConnection: vi.fn(),
    },
}));

// Мокаем useAuth
vi.mock('../../../auth/ui/hooks/useAuth');

describe('useLdapSettings Hooks', () => {
    const mockLdapSettings: LdapSettings = {
        LDAP_ENABLED: { key: 'LDAP_ENABLED', value: 'true', type: 'boolean' },
        LDAP_URI: { key: 'LDAP_URI', value: 'ldap://localhost', type: 'string' },
    };

    beforeEach(() => {
        vi.resetAllMocks();
        (useAuth as Mock).mockReturnValue({
            user: { permissions: [] },
            loading: false,
            login: vi.fn(),
            logout: vi.fn(),
        });
    });

    describe('useLdapSettings', () => {
        it('should fetch and return ldap settings', async () => {
            vi.mocked(settingsApi.getLdapSettings).mockResolvedValue(mockLdapSettings);

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toEqual(mockLdapSettings);
        });

        it('should handle fetch error', async () => {
            vi.mocked(settingsApi.getLdapSettings).mockRejectedValue(new Error('Fetch error'));

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isError).toBe(true));
            expect(result.current.error).toBeDefined();
        });
    });

    describe('useLdapEnabled', () => {
        it('should fetch ldap enabled status', async () => {
            vi.mocked(settingsApi.isLdapEnabled).mockResolvedValue(true);

            const { result } = renderHook(() => useLdapEnabled(), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));
            expect(result.current.data).toBe(true);
        });
    });

    describe('useUpdateLdapSetting', () => {
        it('should call update API', async () => {
            const updateVariables = { key: 'LDAP_URI', value: 'ldaps://secure' };
            vi.mocked(settingsApi.updateLdapSetting).mockResolvedValue({
                LDAP_ENABLED: { key: 'LDAP_ENABLED', value: 'true', type: 'boolean' },
                LDAP_URI: { key: 'LDAP_URI', value: 'ldaps://secure', type: 'string' },
            });

            const { result } = renderHook(() => useUpdateLdapSetting(), { wrapper: AllTheProviders });

            await result.current.mutateAsync(updateVariables);

            expect(settingsApi.updateLdapSetting).toHaveBeenCalledWith('LDAP_URI', 'ldaps://secure');
        });
    });

    describe('useUpdateLdapSettingsBulk', () => {
        it('should call bulk update API', async () => {
            const bulkUpdateVariables = [
                { key: 'LDAP_URI', value: 'ldaps://secure' },
                { key: 'LDAP_ENABLED', value: 'false' }
            ];
            vi.mocked(settingsApi.updateLdapSettingsBulk).mockResolvedValue(mockLdapSettings);

            const { result } = renderHook(() => useUpdateLdapSettingsBulk(), { wrapper: AllTheProviders });

            await result.current.mutateAsync(bulkUpdateVariables);

            expect(settingsApi.updateLdapSettingsBulk).toHaveBeenCalledWith(bulkUpdateVariables);
        });
    });

    describe('useTestLdapConnection', () => {
        it('should call test connection API', async () => {
            const testResponse: LdapTestResponse = { success: true, message: 'OK' };
            vi.mocked(settingsApi.testLdapConnection).mockResolvedValue(testResponse);

            const { result } = renderHook(() => useTestLdapConnection(), { wrapper: AllTheProviders });

            const connectionResult = await result.current.mutateAsync(mockLdapSettings);

            // Ожидаем { settings: mockLdapSettings }, потому что хук оборачивает это?
            // Проверяем реализацию хука:
            // реализация mutationFn: (settings) => settingsApi.testLdapConnection({ settings })
            expect(settingsApi.testLdapConnection).toHaveBeenCalledWith({ settings: mockLdapSettings });
            expect(connectionResult).toEqual(testResponse);
        });
    });
});
