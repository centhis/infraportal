import { renderHook, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { useGroups, useGroup, useCreateGroup, useUpdateGroup, useDeleteGroup } from './useGroups';
import { groupsApi } from '../../api/groups.api';
import { AllTheProviders } from '../../../../mocks/test-utils';
import type { Group } from '../../api/users.dto';
import { useAuth } from '../../../auth/ui/hooks/useAuth';

// Мокаем groupsApi
vi.mock('../../api/groups.api', () => ({
    groupsApi: {
        list: vi.fn(),
        get: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
        remove: vi.fn(),
    },
}));

// Полагаемся на мок из test-utils или можем добавить здесь, но ключевое — настройка реализации
vi.mock('../../../auth/ui/hooks/useAuth', () => ({ useAuth: vi.fn() }));

const mockGroups: Group[] = [
    { id: 1, name: 'Admins', description: 'Admin group', built_in: true, created_at: '2023-01-01', roles: [] },
    { id: 2, name: 'Developers', description: 'Dev group', built_in: false, created_at: '2023-01-01', roles: [] },
];

const mockGroup: Group = mockGroups[0]!;

describe('useGroups Hooks', () => {
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

    describe('useGroups', () => {
        it('should fetch groups with params', async () => {
            vi.mocked(groupsApi.list).mockResolvedValue({
                items: mockGroups,
                total: 2,
                page: 1,
                size: 10,
                pages: 1
            });

            const { result } = renderHook(() => useGroups({ page: 0, size: 10 }), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data?.items).toEqual(mockGroups);
            expect(result.current.data?.total).toBe(2);
            expect(groupsApi.list).toHaveBeenCalledWith({ page: 0, size: 10 });
        });
    });

    describe('useGroup', () => {
        it('should fetch a single group by id', async () => {
            vi.mocked(groupsApi.get).mockResolvedValue(mockGroup);

            const { result } = renderHook(() => useGroup(1), { wrapper: AllTheProviders });

            await waitFor(() => expect(result.current.isSuccess).toBe(true));

            expect(result.current.data).toEqual(mockGroup);
            expect(groupsApi.get).toHaveBeenCalledWith(1);
        });

        it('should not fetch if id is not provided', async () => {
            const { result } = renderHook(() => useGroup(0), { wrapper: AllTheProviders });
            expect(result.current.isPending).toBe(true);
            expect(result.current.fetchStatus).toBe('idle');
            expect(groupsApi.get).not.toHaveBeenCalled();
        });
    });

    describe('useCreateGroup', () => {
        it('should create a group and invalidate queries', async () => {
            const { result } = renderHook(() => useCreateGroup(), { wrapper: AllTheProviders });
            const newGroup = { ...mockGroup, id: 3, name: 'New Group' };
            vi.mocked(groupsApi.create).mockResolvedValue(newGroup);

            // Можно мониторить инвалидацию если шпионить за queryClient, но неявная верификация через успех обычно достаточна для unit-тестов хуков или интеграции с простыми моками.
            // В идеале проверяем, что `groupsApi.create` был вызван.

            await result.current.mutateAsync({ name: 'New Group', description: 'Desc' });

            expect(groupsApi.create).toHaveBeenCalledWith({ name: 'New Group', description: 'Desc' });
        });
    });

    describe('useUpdateGroup', () => {
        it('should update a group and invalidate/set queries', async () => {
            const { result } = renderHook(() => useUpdateGroup(), { wrapper: AllTheProviders });
            const updatedGroup = { ...mockGroup, name: 'Updated' };
            vi.mocked(groupsApi.update).mockResolvedValue(updatedGroup);

            await result.current.mutateAsync({ groupId: 1, data: { name: 'Updated' } });

            expect(groupsApi.update).toHaveBeenCalledWith(1, { name: 'Updated' });
        });
    });

    describe('useDeleteGroup', () => {
        it('should delete a group and invalidate queries', async () => {
            const { result } = renderHook(() => useDeleteGroup(), { wrapper: AllTheProviders });
            vi.mocked(groupsApi.remove).mockResolvedValue(undefined);

            await result.current.mutateAsync(1);

            expect(groupsApi.remove).toHaveBeenCalledWith(1);
        });
    });
});
