import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { groupsApi } from '../../api/groups.api';
import type { Group, GroupCreate, GroupUpdate, GroupsListParams } from '../../api/users.dto';

const GROUPS_QUERY_KEY = 'groups';

/**
 * Хук для получения списка групп
 */
export function useGroups(params?: GroupsListParams) {
    return useQuery({
        queryKey: [GROUPS_QUERY_KEY, params],
        queryFn: () => groupsApi.list(params),
        placeholderData: (previousData) => previousData,
    });
}

/**
 * Хук для получения группы по ID
 */
export function useGroup(groupId: number) {
    return useQuery({
        queryKey: [GROUPS_QUERY_KEY, groupId],
        queryFn: () => groupsApi.get(groupId),
        enabled: !!groupId,
    });
}

/**
 * Хук для создания группы
 */
export function useCreateGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: GroupCreate) => groupsApi.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [GROUPS_QUERY_KEY] });
        },
    });
}

/**
 * Хук для обновления группы
 */
export function useUpdateGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ groupId, data }: { groupId: number; data: GroupUpdate }) =>
            groupsApi.update(groupId, data),
        onSuccess: (updatedGroup: Group) => {
            queryClient.invalidateQueries({ queryKey: [GROUPS_QUERY_KEY] });
            queryClient.setQueryData([GROUPS_QUERY_KEY, updatedGroup.id], updatedGroup);
        },
    });
}

/**
 * Хук для удаления группы
 */
export function useDeleteGroup() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (groupId: number) => groupsApi.remove(groupId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [GROUPS_QUERY_KEY] });
        },
    });
}

export { GROUPS_QUERY_KEY };
