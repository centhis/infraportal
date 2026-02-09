import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import {
    useUsers,
    useUser,
    useCreateUser,
    useUpdateUser,
    useDeleteUser,
    usePermissionsReport
} from './useUsers';
import { usersApi } from '../../api/users.api';
import { AllTheProviders } from '../../../../mocks/test-utils';
import type { User, PermissionsReport } from '../../api/users.dto';
import { useAuth } from '../../../auth/ui/hooks/useAuth';

// Мокаем usersApi
vi.mock('../../api/users.api', () => ({
    usersApi: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
        getPermissionsReport: vi.fn(),
    },
}));

// Мокаем useAuth
vi.mock('../../../auth/ui/hooks/useAuth', () => ({ useAuth: vi.fn() }));

const mockUsers: User[] = [
    {
        id: 1,
        login: 'admin',
        name: 'Admin User',
        type: 'built_in',
        is_active: true,
        created_at: '2023-01-01',
        ldap_id: null,
        ldap_dn: null,
        groups: []
    },
    {
        id: 2,
        login: 'viewer',
        name: 'Viewer User',
        type: 'local',
        is_active: false,
        created_at: '2023-01-01',
        ldap_id: null,
        ldap_dn: null,
        groups: []
    },
];

const mockUser: User = mockUsers[0]!;

const mockPermissionsReport: PermissionsReport = {
    user_id: 1,
    username: 'admin',
    all_unique_permissions: [],
    groups_with_roles_and_permissions: []
};

describe('useUsers Hooks', () => {
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

    describe('useUsers', () => {
        it('should fetch users with params', async () => {
            vi.mocked(usersApi.list).mockResolvedValue({
                items: mockUsers,
                total: 2,
                page: 1,
                size: 10,
                pages: 1
            });

            const { result } = renderHook(() => useUsers({ page: 0, size: 10 }), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data?.items).toEqual(mockUsers);
            expect(result.current.data?.total).toBe(2);
            expect(usersApi.list).toHaveBeenCalledWith({ page: 0, size: 10 });
        });
    });

    describe('useUser', () => {
        it('should fetch a single user by id', async () => {
            vi.mocked(usersApi.get).mockResolvedValue(mockUser);

            const { result } = renderHook(() => useUser(1), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toEqual(mockUser);
            expect(usersApi.get).toHaveBeenCalledWith(1);
        });

        it('should not fetch if id is not provided', async () => {
            const { result } = renderHook(() => useUser(0), { wrapper: AllTheProviders });
            expect(result.current.isPending).toBe(true);
            expect(result.current.fetchStatus).toBe('idle');
            expect(usersApi.get).not.toHaveBeenCalled();
        });
    });

    describe('useCreateUser', () => {
        it('should create a user and invalidate queries', async () => {
            const { result } = renderHook(() => useCreateUser(), { wrapper: AllTheProviders });
            const newUser = { ...mockUser, id: 3, login: 'newuser', name: 'New User' };
            vi.mocked(usersApi.create).mockResolvedValue(newUser);

            await result.current.mutateAsync({ login: 'newuser', password: 'password', name: 'New User' });

            expect(usersApi.create).toHaveBeenCalledWith({ login: 'newuser', password: 'password', name: 'New User' });
        });
    });

    describe('useUpdateUser', () => {
        it('should update a user and invalidate/set queries', async () => {
            const { result } = renderHook(() => useUpdateUser(), { wrapper: AllTheProviders });
            const updatedUser = { ...mockUser, name: 'Updated' };
            vi.mocked(usersApi.update).mockResolvedValue(updatedUser);

            await result.current.mutateAsync({ userId: 1, data: { name: 'Updated' } });

            expect(usersApi.update).toHaveBeenCalledWith(1, { name: 'Updated' });
        });
    });

    describe('useDeleteUser', () => {
        it('should delete a user and invalidate queries', async () => {
            const { result } = renderHook(() => useDeleteUser(), { wrapper: AllTheProviders });
            vi.mocked(usersApi.remove).mockResolvedValue(undefined);

            await result.current.mutateAsync(1);

            expect(usersApi.remove).toHaveBeenCalledWith(1);
        });
    });

    describe('usePermissionsReport', () => {
        it('should fetch permissions report', async () => {
            vi.mocked(usersApi.getPermissionsReport).mockResolvedValue(mockPermissionsReport);

            const { result } = renderHook(() => usePermissionsReport(1), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toEqual(mockPermissionsReport);
            expect(usersApi.getPermissionsReport).toHaveBeenCalledWith(1);
        });

        it('should not fetch report if id is null or enabled is false', async () => {
            const { result } = renderHook(() => usePermissionsReport(null), { wrapper: AllTheProviders });
            expect(result.current.isPending).toBe(true);
            expect(result.current.fetchStatus).toBe('idle');
            expect(usersApi.getPermissionsReport).not.toHaveBeenCalled();
        });
    });
});
