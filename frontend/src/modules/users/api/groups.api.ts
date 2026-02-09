import { apiClient } from '@shared/api';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type {
    Group,
    GroupCreate,
    GroupUpdate,
    GroupsPaginatedResponse,
    GroupsListParams,
} from './users.dto';

/**
 * API методы для Groups
 */
export const groupsApi = {
    /**
     * Получить список групп
     */
    async list(params?: GroupsListParams): Promise<GroupsPaginatedResponse> {
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

        const response = await apiClient.get<GroupsPaginatedResponse>(
            API_ENDPOINTS.USER_MANAGEMENT.GROUPS,
            { params: apiParams }
        );
        return response.data;
    },

    /**
     * Получить группу по ID
     */
    async get(groupId: number): Promise<Group> {
        const response = await apiClient.get<Group>(
            `${API_ENDPOINTS.USER_MANAGEMENT.GROUPS}/${groupId}`
        );
        return response.data;
    },

    /**
     * Создать группу
     */
    async create(data: GroupCreate): Promise<Group> {
        const response = await apiClient.post<Group>(
            API_ENDPOINTS.USER_MANAGEMENT.GROUPS,
            data
        );
        return response.data;
    },

    /**
     * Обновить группу
     */
    async update(groupId: number, data: GroupUpdate): Promise<Group> {
        const response = await apiClient.put<Group>(
            `${API_ENDPOINTS.USER_MANAGEMENT.GROUPS}/${groupId}`,
            data
        );
        return response.data;
    },

    /**
     * Удалить группу
     */
    async remove(groupId: number): Promise<void> {
        await apiClient.delete(`${API_ENDPOINTS.USER_MANAGEMENT.GROUPS}/${groupId}`);
    },
};
