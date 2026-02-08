import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../../../mocks/test-utils';
import { LdapSettingsPage } from './LdapSettingsPage';
import {
    useLdapSettings,
    useLdapEnabled,
    useUpdateLdapSetting,
    useUpdateLdapSettingsBulk,
    useTestLdapConnection
} from '../hooks/useLdapSettings';
import type { LdapSettings } from '../../api/settings.dto';

// Mocks
vi.mock('../hooks/useLdapSettings');
vi.mock('@core/providers/ToastProvider', () => ({
    useToast: vi.fn(() => ({
        showSuccess: vi.fn(),
        showError: vi.fn(),
    })),
    ToastProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('LdapSettingsPage Validation', () => {
    const createMockSettings = (): LdapSettings => ({
        LDAP_URI: { key: 'LDAP_URI', value: 'ldap://localhost', type: 'string' },
        LDAP_ENABLED: { key: 'LDAP_ENABLED', value: 'true', type: 'boolean' },
        LDAP_SYNC_SCHEDULE: { key: 'LDAP_SYNC_SCHEDULE', value: '0 0 * * *', type: 'string' },
    });

    const createDefaultHookValue = (overrides = {}) => ({
        data: undefined,
        isLoading: false,
        error: null,
        isSuccess: true,
        ...overrides,
    });

    const updateMutationMock = { mutateAsync: vi.fn() };
    const bulkUpdateMutationMock = { mutateAsync: vi.fn() };
    const testMutationMock = {
        mutateAsync: vi.fn(),
        isPending: false,
        isSuccess: false,
        isError: false,
        data: null,
        reset: vi.fn(),
    };

    beforeEach(() => {
        vi.resetAllMocks();
        vi.mocked(useUpdateLdapSetting).mockReturnValue(updateMutationMock as unknown as ReturnType<typeof useUpdateLdapSetting>);
        vi.mocked(useUpdateLdapSettingsBulk).mockReturnValue(bulkUpdateMutationMock as unknown as ReturnType<typeof useUpdateLdapSettingsBulk>);
        vi.mocked(useTestLdapConnection).mockReturnValue(testMutationMock as unknown as ReturnType<typeof useTestLdapConnection>);
        vi.mocked(useLdapEnabled).mockReturnValue(createDefaultHookValue({ data: true }) as unknown as ReturnType<typeof useLdapEnabled>);
    });

    it('should validate LDAP_SYNC_SCHEDULE', async () => {
        vi.mocked(useLdapSettings).mockReturnValue(createDefaultHookValue({ data: createMockSettings() }) as unknown as ReturnType<typeof useLdapSettings>);

        render(<LdapSettingsPage />, { authHookValue: { permissions: ['settings:update'] } });

        // Find the schedule input (it might be labeled via translation keys, assume label text contains key or we find by value)
        // Find the schedule text and click to edit
        const scheduleText = screen.getByText('0 0 * * *');
        fireEvent.click(scheduleText);

        // Now the input should be visible
        const input = await screen.findByDisplayValue('0 0 * * *');

        // 1. Enter invalid CRON
        fireEvent.change(input, { target: { value: 'invalid-cron' } });

        // Save icon appears when dirty
        const saveBtn = screen.getByTestId('SaveIcon').closest('button');
        expect(saveBtn).toBeInTheDocument();

        if (saveBtn) {
            fireEvent.click(saveBtn);
        }

        // 2. Expect validation error
        // The error text depends on translation, we used 'Invalid CRON expression' as fallback
        expect(await screen.findByText(/Invalid CRON expression/i)).toBeInTheDocument();

        // Ensure mutation was NOT called
        expect(updateMutationMock.mutateAsync).not.toHaveBeenCalled();

        // 3. Enter valid CRON
        fireEvent.change(input, { target: { value: '*/5 * * * *' } }); // Every 5 mins

        // Click save again
        if (saveBtn) {
            fireEvent.click(saveBtn);
        }

        // 4. Expect mutation called
        await waitFor(() => {
            expect(updateMutationMock.mutateAsync).toHaveBeenCalledWith({
                key: 'LDAP_SYNC_SCHEDULE',
                value: '*/5 * * * *'
            });
        });
    });
});
