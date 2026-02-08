import { useQuery } from '@tanstack/react-query';
import { permissionsApi } from '../../api/permissions.api';

const PERMISSIONS_QUERY_KEY = 'permissions';

/**
 * Хук для получения списка permissions
 */
export function usePermissionsList() {
    return useQuery({
        queryKey: [PERMISSIONS_QUERY_KEY],
        queryFn: () => permissionsApi.list(),
        staleTime: 10 * 60 * 1000, // 10 минут — permissions редко меняются
    });
}

export { PERMISSIONS_QUERY_KEY };
