import { apiClient } from '@shared/api';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type {
    User,
    UserCreate,
    UserUpdate,
    UsersPaginatedResponse,
    UsersListParams,
    PermissionsReport,
} from './users.dto';

/**
 * API методы для Users
 */
export const usersApi = {
    /**
     * Получить список пользователей
     */
    async list(params?: UsersListParams): Promise<UsersPaginatedResponse> {
        // Преобразуем page/size в skip/limit для бэкенда
        const apiParams = params ? {
            skip: ((params.page ?? 1) - 1) * (params.size ?? 10),
            limit: params.size ?? 10,
            search: params.search,
            sort_by: params.sort_by,
            sort_order: params.sort_order,
            // Фильтры
            login: params.login,
            name: params.name,
            type: params.type,
            is_active: params.is_active,
            created_at_from: params.created_at_from,
            created_at_to: params.created_at_to,
        } : undefined;

        const response = await apiClient.get<UsersPaginatedResponse>(
            API_ENDPOINTS.USER_MANAGEMENT.USERS,
            { params: apiParams }
        );
        return response.data;
    },

    /**
     * Получить пользователя по ID
     */
    async get(userId: number): Promise<User> {
        const response = await apiClient.get<User>(
            `${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${userId}`
        );
        return response.data;
    },

    /**
     * Создать пользователя
     */
    async create(data: UserCreate): Promise<User> {
        const response = await apiClient.post<User>(
            `${API_ENDPOINTS.USER_MANAGEMENT.USERS}/`,
            data
        );
        return response.data;
    },

    /**
     * Обновить пользователя
     */
    async update(userId: number, data: UserUpdate): Promise<User> {
        // Преобразуем groups в group_ids если нужно
        const payload = { ...data };
        if ('groups' in payload) {
            (payload as UserUpdate & { group_ids?: number[] }).group_ids = (payload as unknown as { groups: number[] }).groups;
            delete (payload as unknown as { groups?: number[] }).groups;
        }

        const response = await apiClient.put<User>(
            `${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${userId}`,
            payload
        );
        return response.data;
    },

    /**
     * Удалить пользователя
     */
    async remove(userId: number): Promise<void> {
        await apiClient.delete(`${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${userId}`);
    },

    /**
     * Получить отчет о правах пользователя
     */
    async getPermissionsReport(userId: number): Promise<PermissionsReport> {
        const response = await apiClient.get<PermissionsReport>(
            `${API_ENDPOINTS.USER_MANAGEMENT.USERS}/${userId}/permissions_report`
        );
        return response.data;
    },
};
