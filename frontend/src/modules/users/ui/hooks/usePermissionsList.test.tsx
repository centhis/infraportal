import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { usePermissionsList } from './usePermissionsList';
import { permissionsApi } from '../../api/permissions.api';
import { AllTheProviders } from '../../../../mocks/test-utils';
import type { Permission } from '../../api/users.dto';

// Мокаем permissionsApi
vi.mock('../../api/permissions.api', () => ({
    permissionsApi: {
        list: vi.fn(),
    },
}));

// Мокаем useAuth для AllTheProviders
vi.mock('../../../auth/ui/hooks/useAuth', () => ({ useAuth: vi.fn() }));
import { useAuth } from '../../../auth/ui/hooks/useAuth';

const mockPermissions: Permission[] = [
    { id: 1, name: 'users:view', description: 'View Users', built_in: true, created_at: '2023-01-01' },
    { id: 2, name: 'users:create', description: 'Create Users', built_in: false, created_at: '2023-01-01' },
];

describe('usePermissionsList Hook', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Настраиваем мок useAuth для AllTheProviders
        (useAuth as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
            user: { name: 'Test User' },
            loading: false,
            login: vi.fn(),
            logout: vi.fn(),
        });
    });

    it('should fetch permissions list', async () => {
        vi.mocked(permissionsApi.list).mockResolvedValue({ items: mockPermissions, total: 2, page: 1, size: 100, pages: 1 });

        const { result } = renderHook(() => usePermissionsList(), { wrapper: AllTheProviders });

        await waitFor(() => expect(result.current.isSuccess).toBe(true));

        expect(result.current.data?.items).toEqual(mockPermissions);
        expect(permissionsApi.list).toHaveBeenCalled();
    });
});
