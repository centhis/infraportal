import { authApi } from '../api/auth.api';
import { useAuthStore, getAuthState, isAuthenticated } from '../store/auth.store';
import { usePermissionsStore } from '@core/auth';
import { TOKEN_KEY } from '@shared/constants/keys';
import { ROUTES } from '@shared/constants/routes';
import type { LoginRequest, CurrentUser } from '../api/auth.dto';
import { getErrorMessage } from '@shared/api';

/**
 * Сервис авторизации.
 * Содержит бизнес-логику аутентификации.
 */
export class AuthService {
    /**
     * Авторизация пользователя
     */
    static async login(credentials: LoginRequest): Promise<boolean> {
        const store = useAuthStore.getState();
        const permissionsStore = usePermissionsStore.getState();

        try {
            store.setLoading(true);
            store.clearError();

            // Выполняем login
            const loginData = await authApi.login(credentials);
            localStorage.setItem(TOKEN_KEY, loginData.access_token);

            // Устанавливаем permissions из ответа login
            permissionsStore.setPermissions(loginData.permissions);

            // Получаем полные данные пользователя
            const user = await authApi.getCurrentUser();
            store.setUser(user);

            return true;
        } catch (error) {
            const message = getErrorMessage(error);

            // Очистка при ошибке
            localStorage.removeItem(TOKEN_KEY);
            store.reset();

            store.setError(message);

            return false;
        }
    }

    /**
     * Выход из системы
     */
    static async logout(): Promise<void> {
        const store = useAuthStore.getState();

        try {
            await authApi.logout();
        } catch {
            // Игнорируем ошибки logout
        } finally {
            localStorage.removeItem(TOKEN_KEY);
            store.reset();
            window.location.href = ROUTES.LOGIN;
        }
    }

    /**
     * Инициализация авторизации (проверка токена)
     */
    static async initialize(): Promise<void> {
        const store = useAuthStore.getState();
        const token = localStorage.getItem(TOKEN_KEY);

        if (!token) {
            store.setLoading(false);
            store.setInitialized(true);
            return;
        }

        try {
            store.setLoading(true);
            const user = await authApi.getCurrentUser();
            store.setUser(user);
        } catch {
            // Токен невалиден
            localStorage.removeItem(TOKEN_KEY);
            store.reset();
        } finally {
            store.setInitialized(true);
        }
    }

    /**
     * Получить текущего пользователя
     */
    static getCurrentUser(): CurrentUser | null {
        return getAuthState().user;
    }

    /**
     * Проверка авторизации
     */
    static isAuthenticated(): boolean {
        return isAuthenticated();
    }
}

// Экспорт удобных функций
export const login = AuthService.login;
export const logout = AuthService.logout;
export const initializeAuth = AuthService.initialize;
