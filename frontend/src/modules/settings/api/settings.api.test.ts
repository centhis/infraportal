import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { apiClient } from '@shared/api';
import { settingsApi } from './settings.api';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';

// Мокаем apiClient
vi.mock('@shared/api', () => ({
    apiClient: {
        get: vi.fn(),
        put: vi.fn(),
        patch: vi.fn(),
        post: vi.fn(),
    },
}));

describe('settingsApi', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    // ===== Основные настройки =====
    describe('Core Settings', () => {
        const mockCoreSettings = [
            { key: 'APP_NAME', value: 'InfraPortal', type: 'string' },
            { key: 'DEBUG_MODE', value: 'false', type: 'boolean' },
        ];

        it('getCoreSettings should fetch and return core settings', async () => {
            (apiClient.get as Mock).mockResolvedValue({ data: mockCoreSettings });

            const result = await settingsApi.getCoreSettings();

            expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SETTINGS.CORE);
            expect(result).toEqual(mockCoreSettings);
        });

        it('updateCoreSetting should update a single core setting', async () => {
            const updatedSetting = { key: 'APP_NAME', value: 'NewName', type: 'string' };
            (apiClient.put as Mock).mockResolvedValue({ data: updatedSetting });

            const result = await settingsApi.updateCoreSetting('APP_NAME', 'NewName');

            expect(apiClient.put).toHaveBeenCalledWith(
                `${API_ENDPOINTS.SETTINGS.CORE}/APP_NAME`,
                { value: 'NewName' }
            );
            expect(result).toEqual(updatedSetting);
        });
    });

    // ===== LDAP настройки =====
    describe('LDAP Settings', () => {
        const mockLdapSettings = {
            LDAP_URI: { key: 'LDAP_URI', value: 'ldap://localhost', type: 'string' },
            LDAP_ENABLED: { key: 'LDAP_ENABLED', value: 'true', type: 'boolean' },
        };

        it('getLdapSettings should fetch and return LDAP settings', async () => {
            (apiClient.get as Mock).mockResolvedValue({ data: Object.values(mockLdapSettings) });

            const result = await settingsApi.getLdapSettings();

            expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SETTINGS.LDAP);
            expect(result).toEqual(mockLdapSettings);
        });

        it('updateLdapSetting should update a single LDAP setting', async () => {
            const updatedResponse = { ...mockLdapSettings };
            (apiClient.put as Mock).mockResolvedValue({ data: updatedResponse });

            const result = await settingsApi.updateLdapSetting('LDAP_URI', 'ldaps://secure');

            expect(apiClient.put).toHaveBeenCalledWith(
                `${API_ENDPOINTS.SETTINGS.LDAP}/LDAP_URI`,
                { value: 'ldaps://secure' }
            );
            expect(result).toEqual(updatedResponse);
        });

        it('updateLdapSettingsBulk should update multiple LDAP settings', async () => {
            const bulkUpdates = [
                { key: 'LDAP_URI', value: 'ldaps://new' },
                { key: 'LDAP_ENABLED', value: 'false' }
            ];
            const updatedResponse = { ...mockLdapSettings };
            (apiClient.patch as Mock).mockResolvedValue({ data: updatedResponse });

            const result = await settingsApi.updateLdapSettingsBulk(bulkUpdates);

            expect(apiClient.patch).toHaveBeenCalledWith(
                API_ENDPOINTS.SETTINGS.LDAP,
                { settings: bulkUpdates }
            );
            expect(result).toEqual(updatedResponse);
        });

        it('testLdapConnection should send test request with settings', async () => {
            const testRequest = {
                settings: {
                    LDAP_URI: { key: 'LDAP_URI', value: 'ldap://test', type: 'string' as const },
                    LDAP_BIND_DN: { key: 'LDAP_BIND_DN', value: 'cn=admin', type: 'string' as const }
                }
            };
            const testResult = { success: true, message: 'Connection successful' };
            (apiClient.post as Mock).mockResolvedValue({ data: testResult });

            const result = await settingsApi.testLdapConnection(testRequest);

            expect(apiClient.post).toHaveBeenCalledWith(
                API_ENDPOINTS.SETTINGS.LDAP_TEST,
                {
                    settings: {
                        LDAP_URI: 'ldap://test',
                        LDAP_BIND_DN: 'cn=admin'
                    }
                }
            );
            expect(result).toEqual(testResult);
        });

        it('isLdapEnabled should return LDAP enabled status', async () => {
            (apiClient.get as Mock).mockResolvedValue({ data: { enabled: true } });

            const result = await settingsApi.isLdapEnabled();

            expect(apiClient.get).toHaveBeenCalledWith(API_ENDPOINTS.SETTINGS.LDAP_IS_ENABLED);
            expect(result).toEqual(true);
        });
    });
});
