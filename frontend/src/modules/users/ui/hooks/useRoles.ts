import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '../../api/roles.api';
import type { Role, RoleCreate, RoleUpdate, RolesListParams } from '../../api/users.dto';

const ROLES_QUERY_KEY = 'roles';

/**
 * Хук для получения списка ролей
 */
export function useRoles(params?: RolesListParams) {
    return useQuery({
        queryKey: [ROLES_QUERY_KEY, params],
        queryFn: () => rolesApi.list(params),
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Хук для получения роли по ID
 */
export function useRole(roleId: number) {
    return useQuery({
        queryKey: [ROLES_QUERY_KEY, roleId],
        queryFn: () => rolesApi.get(roleId),
        enabled: !!roleId,
    });
}

/**
 * Хук для создания роли
 */
export function useCreateRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: RoleCreate) => rolesApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
        },
    });
}

/**
 * Хук для обновления роли
 */
export function useUpdateRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ roleId, data }: { roleId: number; data: RoleUpdate }) =>
            rolesApi.update(roleId, data),
        onSuccess: (updatedRole: Role) => {
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
            queryClient.setQueryData([ROLES_QUERY_KEY, updatedRole.id], updatedRole);
        },
    });
}

/**
 * Хук для удаления роли
 */
export function useDeleteRole() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (roleId: number) => rolesApi.remove(roleId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [ROLES_QUERY_KEY] });
        },
    });
}

export { ROLES_QUERY_KEY };
