import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '../../api/users.api';
import type { User, UserCreate, UserUpdate, UsersListParams } from '../../api/users.dto';

const USERS_QUERY_KEY = 'users';

/**
 * Хук для получения списка пользователей
 */
export function useUsers(params?: UsersListParams) {
    return useQuery({
        queryKey: [USERS_QUERY_KEY, params],
        queryFn: () => usersApi.list(params),
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Хук для получения пользователя по ID
 */
export function useUser(userId: number) {
    return useQuery({
        queryKey: [USERS_QUERY_KEY, userId],
        queryFn: () => usersApi.get(userId),
        enabled: !!userId,
    });
}

/**
 * Хук для создания пользователя
 */
export function useCreateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: UserCreate) => usersApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });
}

/**
 * Хук для обновления пользователя
 */
export function useUpdateUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ userId, data }: { userId: number; data: UserUpdate }) =>
            usersApi.update(userId, data),
        onSuccess: (updatedUser: User) => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
            queryClient.setQueryData([USERS_QUERY_KEY, updatedUser.id], updatedUser);
        },
    });
}

/**
 * Хук для удаления пользователя
 */
export function useDeleteUser() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (userId: number) => usersApi.remove(userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });
}

/**
 * Хук для получения отчета о правах пользователя
 */
export function usePermissionsReport(userId: number | null, enabled: boolean = true) {
    return useQuery({
        queryKey: [USERS_QUERY_KEY, userId, 'permissions_report'],
        queryFn: () => usersApi.getPermissionsReport(userId!),
        enabled: !!userId && enabled,
    });
}

export { USERS_QUERY_KEY };
