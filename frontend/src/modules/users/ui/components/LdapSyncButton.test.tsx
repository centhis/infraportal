import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, Mock } from 'vitest';
import { LdapSyncButton } from './LdapSyncButton';
import { usePermissions } from '@core/auth';
import { useToast } from '@core/providers/ToastProvider';
import { useLdapEnabled } from '../../../../modules/settings/ui/hooks/useLdapSettings';
import { tasksApi } from '../../../tasks/api/tasks.api';

// Mock dependecies
vi.mock('@core/auth', () => ({
    usePermissions: vi.fn(),
}));

vi.mock('@core/providers/ToastProvider', () => ({
    useToast: vi.fn(),
}));

vi.mock('../../../../modules/settings/ui/hooks/useLdapSettings', () => ({
    useLdapEnabled: vi.fn(),
}));

vi.mock('../../../tasks/api/tasks.api', () => ({
    tasksApi: {
        runTask: vi.fn(),
    },
}));

vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key: string, defaultValue: string) => defaultValue,
    }),
}));

describe('LdapSyncButton', () => {
    const mockShowSuccess = vi.fn();
    const mockShowError = vi.fn();
    const mockCan = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (useToast as Mock).mockReturnValue({
            showSuccess: mockShowSuccess,
            showError: mockShowError,
        });
        (usePermissions as Mock).mockReturnValue({
            can: mockCan,
        });
    });

    it('should not render if checking LDAP status is loading', () => {
        (useLdapEnabled as Mock).mockReturnValue({
            data: undefined,
            isLoading: true,
        });

        const { container } = render(<LdapSyncButton />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should not render if LDAP is disabled', () => {
        (useLdapEnabled as Mock).mockReturnValue({
            data: false,
            isLoading: false,
        });

        const { container } = render(<LdapSyncButton />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render button if LDAP is enabled', () => {
        (useLdapEnabled as Mock).mockReturnValue({
            data: true,
            isLoading: false,
        });
        mockCan.mockReturnValue(true);

        render(<LdapSyncButton />);
        expect(screen.getByText('Sync LDAP')).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('should be disabled if user has no permission', () => {
        (useLdapEnabled as Mock).mockReturnValue({
            data: true,
            isLoading: false,
        });
        mockCan.mockReturnValue(false);

        render(<LdapSyncButton />);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('should check for users:update permission', () => {
        (useLdapEnabled as Mock).mockReturnValue({
            data: true,
            isLoading: false,
        });

        render(<LdapSyncButton />);
        expect(mockCan).toHaveBeenCalledWith('users:update');
    });

    it('should call api and show success toast on click', async () => {
        (useLdapEnabled as Mock).mockReturnValue({
            data: true,
            isLoading: false,
        });
        mockCan.mockReturnValue(true);
        (tasksApi.runTask as Mock).mockResolvedValue({ message: 'OK', execution_id: '123' });

        render(<LdapSyncButton />);

        const button = screen.getByRole('button');
        fireEvent.click(button);

        expect(tasksApi.runTask).toHaveBeenCalledWith('users:sync_ldap', {});

        // Should show loading state
        await waitFor(() => {
            expect(screen.getByText('Syncing...')).toBeInTheDocument();
            expect(button).toBeDisabled();
        });

        await waitFor(() => {
            expect(mockShowSuccess).toHaveBeenCalledWith('LDAP synchronization started');
            expect(screen.getByText('Sync LDAP')).toBeInTheDocument();
            expect(button).not.toBeDisabled();
        });
    });

    it('should show error toast on api failure', async () => {
        (useLdapEnabled as Mock).mockReturnValue({
            data: true,
            isLoading: false,
        });
        mockCan.mockReturnValue(true);
        (tasksApi.runTask as Mock).mockRejectedValue(new Error('Failed'));

        render(<LdapSyncButton />);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(mockShowError).toHaveBeenCalledWith('Failed to start LDAP synchronization');
        });
    });
});
