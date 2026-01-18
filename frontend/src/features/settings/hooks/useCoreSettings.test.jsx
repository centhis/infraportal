import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import useCoreSettings from './useCoreSettings';
import { settingsService } from '../services/settingsService';
import { AllTheProviders } from '../../../mocks/test-utils';

// Mock dependencies
vi.mock('../services/settingsService');

describe('useCoreSettings', () => {
    // ===== Test Data Factory (DRY) =====
    const createMockSettings = () => [
        { key: 'APP_NAME', value: 'InfraPortal', type: 'string' },
        { key: 'DEBUG_MODE', value: 'false', type: 'boolean' },
    ];

    beforeEach(() => {
        vi.resetAllMocks();
    });

    // ===== Initial State =====
    describe('Initial State', () => {
        it('should have correct initial state', () => {
            const { result } = renderHook(() => useCoreSettings(), { wrapper: AllTheProviders });

            expect(result.current.coreSettings).toEqual([]);
            expect(result.current.loading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    // ===== Fetch Operations =====
    describe('Fetch Operations', () => {
        it('fetchCoreSettings should populate coreSettings', async () => {
            const mockSettings = createMockSettings();
            vi.mocked(settingsService.getCoreSettings).mockResolvedValue(mockSettings);

            const { result } = renderHook(() => useCoreSettings(), { wrapper: AllTheProviders });

            await act(async () => {
                await result.current.fetchCoreSettings();
            });

            expect(settingsService.getCoreSettings).toHaveBeenCalledTimes(1);
            expect(result.current.coreSettings).toEqual(mockSettings);
            expect(result.current.loading).toBe(false);
        });

        it('fetchCoreSettings should set error on failure', async () => {
            vi.mocked(settingsService.getCoreSettings).mockRejectedValue(new Error('API error'));

            const { result } = renderHook(() => useCoreSettings(), { wrapper: AllTheProviders });

            await act(async () => {
                await result.current.fetchCoreSettings();
            });

            expect(result.current.error).toBe('API error');
            expect(result.current.coreSettings).toEqual([]);
        });
    });

    // ===== Update Operations =====
    describe('Update Operations', () => {
        it('updateCoreSetting should update a single setting in state', async () => {
            const mockSettings = createMockSettings();
            const updatedSetting = { key: 'APP_NAME', value: 'NewPortal', type: 'string' };

            vi.mocked(settingsService.getCoreSettings).mockResolvedValue(mockSettings);
            vi.mocked(settingsService.updateCoreSetting).mockResolvedValue(updatedSetting);

            const { result } = renderHook(() => useCoreSettings(), { wrapper: AllTheProviders });

            // First fetch
            await act(async () => {
                await result.current.fetchCoreSettings();
            });

            // Then update
            await act(async () => {
                await result.current.updateCoreSetting('APP_NAME', 'NewPortal');
            });

            expect(settingsService.updateCoreSetting).toHaveBeenCalledWith('APP_NAME', 'NewPortal');
            expect(result.current.coreSettings.find(s => s.key === 'APP_NAME')).toEqual(updatedSetting);
        });

        it('updateCoreSetting should throw error on failure', async () => {
            vi.mocked(settingsService.updateCoreSetting).mockRejectedValue(new Error('Update failed'));

            const { result } = renderHook(() => useCoreSettings(), { wrapper: AllTheProviders });

            await act(async () => {
                try {
                    await result.current.updateCoreSetting('APP_NAME', 'NewValue');
                } catch (_e) {
                    // Expected to throw
                }
            });

            expect(result.current.error).toBe('Update failed');
        });
    });
});
