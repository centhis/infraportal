import { apiClient } from '@shared/api';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type { Permission, PermissionsPaginatedResponse } from './users.dto';

/**
 * API методы для Permissions
 */
export const permissionsApi = {
    /**
     * Получить список permissions
     */
    async list(): Promise<PermissionsPaginatedResponse> {
        const response = await apiClient.get<Permission[]>(
            API_ENDPOINTS.USER_MANAGEMENT.PERMISSIONS
        );
        return {
            items: response.data,
            total: response.data.length,
            page: 1,
            size: response.data.length,
            pages: 1,
        };
    },

    /**
     * Получить permission по ID
     */
    async get(permissionId: number): Promise<Permission> {
        const response = await apiClient.get<Permission>(
            `${API_ENDPOINTS.USER_MANAGEMENT.PERMISSIONS}/${permissionId}`
        );
        return response.data;
    },
};
