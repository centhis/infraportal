import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useLdapSettings from './useLdapSettings';
import { settingsService } from '../services/settingsService';
import { AllTheProviders } from '../../../mocks/test-utils';

// Mock dependencies
vi.mock('../services/settingsService');

describe('useLdapSettings', () => {
    // ===== Test Data Factory (DRY) =====
    const createMockSettings = (overrides = {}) => [
        { key: 'LDAP_ENABLED', value: 'true', type: 'boolean', ...overrides },
        { key: 'LDAP_URI', value: 'ldap://localhost:389', type: 'string' },
        { key: 'LDAP_BIND_DN', value: 'cn=admin,dc=example,dc=org', type: 'string' },
    ];

    beforeEach(() => {
        vi.resetAllMocks();
    });

    // ===== Initial State =====
    describe('Initial State', () => {
        it('should have correct initial state', () => {
            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            expect(result.current.ldapSettings).toEqual([]);
            expect(result.current.ldapEnabled).toBeNull();
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    // ===== Fetch Operations =====
    describe('Fetch Operations', () => {
        it('fetchLdapSettings should populate ldapSettings', async () => {
            const mockSettings = createMockSettings();
            vi.mocked(settingsService.getLdapSettings).mockResolvedValue(mockSettings);

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            await act(async () => {
                await result.current.fetchLdapSettings();
            });

            expect(settingsService.getLdapSettings).toHaveBeenCalledTimes(1);
            expect(result.current.ldapSettings).toEqual(mockSettings);
            expect(result.current.loading).toBe(false);
        });

        it('fetchLdapEnabled should set ldapEnabled state', async () => {
            vi.mocked(settingsService.isLdapEnabled).mockResolvedValue({ enabled: true });

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            await act(async () => {
                await result.current.fetchLdapEnabled();
            });

            expect(settingsService.isLdapEnabled).toHaveBeenCalledTimes(1);
            expect(result.current.ldapEnabled).toBe(true);
        });

        it('fetchLdapSettings should set error on failure', async () => {
            vi.mocked(settingsService.getLdapSettings).mockRejectedValue(new Error('Network error'));

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            await act(async () => {
                await result.current.fetchLdapSettings();
            });

            expect(result.current.error).toBe('Network error');
            expect(result.current.ldapSettings).toEqual([]);
        });
    });

    // ===== Update Operations =====
    describe('Update Operations', () => {
        it('updateLdapSetting should update a single setting', async () => {
            const mockSettings = createMockSettings();
            const updatedSetting = { key: 'LDAP_URI', value: 'ldaps://secure:636', type: 'string' };

            vi.mocked(settingsService.getLdapSettings).mockResolvedValue(mockSettings);
            vi.mocked(settingsService.updateLdapSetting).mockResolvedValue(updatedSetting);

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            // First fetch settings
            await act(async () => {
                await result.current.fetchLdapSettings();
            });

            // Then update
            await act(async () => {
                await result.current.updateLdapSetting('LDAP_URI', 'ldaps://secure:636');
            });

            expect(settingsService.updateLdapSetting).toHaveBeenCalledWith('LDAP_URI', 'ldaps://secure:636');
            expect(result.current.ldapSettings.find(s => s.key === 'LDAP_URI')).toEqual(updatedSetting);
        });

        it('updateLdapSetting with LDAP_ENABLED should update ldapEnabled state', async () => {
            const updatedSetting = { key: 'LDAP_ENABLED', value: 'false', type: 'boolean' };
            vi.mocked(settingsService.updateLdapSetting).mockResolvedValue(updatedSetting);

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            await act(async () => {
                await result.current.updateLdapSetting('LDAP_ENABLED', 'false');
            });

            expect(result.current.ldapEnabled).toBe(false);
        });

        it('updateLdapSettingsBulk should update multiple settings', async () => {
            const initialSettings = createMockSettings();
            const bulkUpdatePayload = { LDAP_ENABLED: 'false', LDAP_URI: 'ldaps://new' };
            const apiResponse = [
                { key: 'LDAP_ENABLED', value: 'false', type: 'boolean' },
                { key: 'LDAP_URI', value: 'ldaps://new', type: 'string' },
            ];

            // Mock the services
            vi.mocked(settingsService.getLdapSettings).mockResolvedValue(initialSettings);
            vi.mocked(settingsService.updateLdapSettingsBulk).mockResolvedValue(apiResponse);

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            // 1. Load initial state
            await act(async () => {
                await result.current.fetchLdapSettings();
            });
            expect(result.current.ldapSettings).toEqual(initialSettings);

            // 2. Perform bulk update
            await act(async () => {
                await result.current.updateLdapSettingsBulk(bulkUpdatePayload);
            });

            // 3. Verify the results
            expect(settingsService.updateLdapSettingsBulk).toHaveBeenCalledWith(bulkUpdatePayload);
            
            // Check that the state was correctly merged
            const finalSettings = result.current.ldapSettings;
            expect(finalSettings.find(s => s.key === 'LDAP_ENABLED').value).toBe('false');
            expect(finalSettings.find(s => s.key === 'LDAP_URI').value).toBe('ldaps://new');
            // Check that the setting not in the bulk update is still present
            expect(finalSettings.find(s => s.key === 'LDAP_BIND_DN').value).toBe('cn=admin,dc=example,dc=org');
            
            // Check that the separate ldapEnabled state was also updated
            expect(result.current.ldapEnabled).toBe(false);
        });
    });

    // ===== Test Connection =====
    describe('Test Connection', () => {
        it('testLdapConnection should return connection result', async () => {
            const testResult = { success: true, message: 'Connected successfully' };
            vi.mocked(settingsService.testLdapConnection).mockResolvedValue(testResult);

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            const testData = { LDAP_URI: 'ldap://test', LDAP_BIND_DN: 'cn=admin' };
            let connectionResult;

            await act(async () => {
                connectionResult = await result.current.testLdapConnection(testData);
            });

            expect(settingsService.testLdapConnection).toHaveBeenCalledWith(testData);
            expect(connectionResult).toEqual(testResult);
        });

        it('testLdapConnection should set error on failure', async () => {
            vi.mocked(settingsService.testLdapConnection).mockRejectedValue(new Error('Connection refused'));

            const { result } = renderHook(() => useLdapSettings(), { wrapper: AllTheProviders });

            await act(async () => {
                try {
                    await result.current.testLdapConnection({});
                } catch (_e) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBe('Connection refused');
        });
    });
});
