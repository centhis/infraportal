import { apiClient } from '@shared/api';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type {
    Role,
    RoleCreate,
    RoleUpdate,
    RolesPaginatedResponse,
    RolesListParams,
} from './users.dto';

/**
 * API методы для Roles
 */
export const rolesApi = {
    /**
     * Получить список ролей
     */
    async list(params?: RolesListParams): Promise<RolesPaginatedResponse> {
        // Преобразуем page/size в skip/limit для бэкенда
        const apiParams = params ? {
            skip: ((params.page ?? 1) - 1) * (params.size ?? 10),
            limit: params.size ?? 10,
            search: params.search,
            sort_by: params.sort_by,
            sort_order: params.sort_order,
            // Фильтры
            name: params.name,
            built_in: params.built_in,
            created_at_from: params.created_at_from,
            created_at_to: params.created_at_to,
        } : undefined;

        const response = await apiClient.get<RolesPaginatedResponse>(
            API_ENDPOINTS.USER_MANAGEMENT.ROLES,
            { params: apiParams }
        );
        return response.data;
    },

    /**
     * Получить роль по ID
     */
    async get(roleId: number): Promise<Role> {
        const response = await apiClient.get<Role>(
            `${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/${roleId}`
        );
        return response.data;
    },

    /**
     * Создать роль
     */
    async create(data: RoleCreate): Promise<Role> {
        const response = await apiClient.post<Role>(
            `${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/`,
            data
        );
        return response.data;
    },

    /**
     * Обновить роль
     */
    async update(roleId: number, data: RoleUpdate): Promise<Role> {
        const response = await apiClient.put<Role>(
            `${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/${roleId}`,
            data
        );
        return response.data;
    },

    /**
     * Удалить роль
     */
    async remove(roleId: number): Promise<void> {
        await apiClient.delete(`${API_ENDPOINTS.USER_MANAGEMENT.ROLES}/${roleId}`);
    },
};
