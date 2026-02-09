import { apiClient } from '@shared/api';
import { API_ENDPOINTS } from '@shared/constants/apiEndpoints';
import type { LoginRequest, LoginResponse, CurrentUser } from './auth.dto';

/**
 * API методы для модуля Auth
 */
export const authApi = {
    /**
     * Авторизация пользователя
     */
    async login(credentials: LoginRequest): Promise<LoginResponse> {
        const response = await apiClient.post<LoginResponse>(
            API_ENDPOINTS.AUTH.LOGIN,
            credentials,
            { _isLogin: true } as Parameters<typeof apiClient.post>[2]
        );
        return response.data;
    },

    /**
     * Получение текущего пользователя
     */
    async getCurrentUser(): Promise<CurrentUser> {
        const response = await apiClient.get<CurrentUser>(API_ENDPOINTS.AUTH.PROFILE);
        return response.data;
    },

    /**
     * Получение прав текущего пользователя
     */
    async getPermissions(): Promise<string[]> {
        const response = await apiClient.get<{ permissions: string[] }>(
            API_ENDPOINTS.AUTH.PERMISSIONS
        );
        return response.data.permissions;
    },

    /**
     * Выход из системы
     */
    async logout(): Promise<void> {
        await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
    },
};
