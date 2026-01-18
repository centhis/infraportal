import { describe, it, expect, vi, beforeEach } from 'vitest';
import AxiosInstance from '../../../shared/api/AxiosInstance';
import { settingsApi } from './settingsApi';
import { API_ENDPOINTS } from '../../../shared/constants/apiEndpoints';

// Mock AxiosInstance
vi.mock('../../../shared/api/AxiosInstance');

describe('settingsApi', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    // ===== Core Settings =====
    describe('Core Settings', () => {
        const mockCoreSettings = [
            { key: 'APP_NAME', value: 'InfraPortal', type: 'string' },
            { key: 'DEBUG_MODE', value: 'false', type: 'boolean' },
        ];

        it('getCoreSettings should fetch and return core settings', async () => {
            vi.mocked(AxiosInstance.get).mockResolvedValue({ data: mockCoreSettings });

            const result = await settingsApi.getCoreSettings();

            expect(AxiosInstance.get).toHaveBeenCalledWith(API_ENDPOINTS.SETTINGS.CORE);
            expect(result).toEqual(mockCoreSettings);
        });

        it('updateCoreSetting should update a single core setting', async () => {
            const updatedSetting = { key: 'APP_NAME', value: 'NewName', type: 'string' };
            vi.mocked(AxiosInstance.put).mockResolvedValue({ data: updatedSetting });

            const result = await settingsApi.updateCoreSetting('APP_NAME', 'NewName');

            expect(AxiosInstance.put).toHaveBeenCalledWith(
                `${API_ENDPOINTS.SETTINGS.CORE}/APP_NAME`,
                { value: 'NewName' }
            );
            expect(result).toEqual(updatedSetting);
        });
    });

    // ===== LDAP Settings =====
    describe('LDAP Settings', () => {
        const mockLdapSettings = [
            { key: 'LDAP_URI', value: 'ldap://localhost', type: 'string' },
            { key: 'LDAP_ENABLED', value: 'true', type: 'boolean' },
        ];

        it('getLdapSettings should fetch and return LDAP settings', async () => {
            vi.mocked(AxiosInstance.get).mockResolvedValue({ data: mockLdapSettings });

            const result = await settingsApi.getLdapSettings();

            expect(AxiosInstance.get).toHaveBeenCalledWith(API_ENDPOINTS.SETTINGS.LDAP);
            expect(result).toEqual(mockLdapSettings);
        });

        it('updateLdapSetting should update a single LDAP setting', async () => {
            const updatedSetting = { key: 'LDAP_URI', value: 'ldaps://secure', type: 'string' };
            vi.mocked(AxiosInstance.put).mockResolvedValue({ data: updatedSetting });

            const result = await settingsApi.updateLdapSetting('LDAP_URI', 'ldaps://secure');

            expect(AxiosInstance.put).toHaveBeenCalledWith(
                `${API_ENDPOINTS.SETTINGS.LDAP}/LDAP_URI`,
                { value: 'ldaps://secure' }
            );
            expect(result).toEqual(updatedSetting);
        });

        it('updateLdapSettingsBulk should update multiple LDAP settings', async () => {
            const bulkSettings = { LDAP_URI: 'ldaps://new', LDAP_ENABLED: 'false' };
            vi.mocked(AxiosInstance.patch).mockResolvedValue({ data: mockLdapSettings });

            const result = await settingsApi.updateLdapSettingsBulk(bulkSettings);

            expect(AxiosInstance.patch).toHaveBeenCalledWith(
                API_ENDPOINTS.SETTINGS.LDAP,
                { settings: bulkSettings }
            );
            expect(result).toEqual(mockLdapSettings);
        });

        it('testLdapConnection should send test request with settings', async () => {
            const testSettings = { LDAP_URI: 'ldap://test', LDAP_BIND_DN: 'cn=admin' };
            const testResult = { success: true, message: 'Connection successful' };
            vi.mocked(AxiosInstance.post).mockResolvedValue({ data: testResult });

            const result = await settingsApi.testLdapConnection(testSettings);

            expect(AxiosInstance.post).toHaveBeenCalledWith(
                API_ENDPOINTS.SETTINGS.LDAP_TEST,
                { settings: testSettings }
            );
            expect(result).toEqual(testResult);
        });

        it('isLdapEnabled should return LDAP enabled status', async () => {
            vi.mocked(AxiosInstance.get).mockResolvedValue({ data: { enabled: true } });

            const result = await settingsApi.isLdapEnabled();

            expect(AxiosInstance.get).toHaveBeenCalledWith(API_ENDPOINTS.SETTINGS.LDAP_IS_ENABLED);
            expect(result).toEqual({ enabled: true });
        });
    });
});
