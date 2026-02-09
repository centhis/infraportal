import { useCallback } from 'react';
import { useAuthStore } from '../../store/auth.store';
import { AuthService } from '../../services/AuthService';
import type { LoginRequest } from '../../api/auth.dto';

/**
 * Хук для работы с авторизацией в React-компонентах.
 */
export function useAuth() {
    const { user, loading, error, initialized, clearError, setError } = useAuthStore();

    const login = useCallback(async (credentials: LoginRequest): Promise<boolean> => {
        return AuthService.login(credentials);
    }, []);

    const logout = useCallback(async (): Promise<void> => {
        return AuthService.logout();
    }, []);

    return {
        /** Текущий пользователь */
        user,
        /** Загрузка */
        loading,
        /** Ошибка */
        error,
        /** Инициализация выполнена */
        initialized,
        /** Авторизован ли пользователь */
        isAuthenticated: !!user,
        /** Авторизация */
        login,
        /** Выход */
        logout,
        /** Очистка ошибки */
        clearError,
        /** Установка ошибки */
        setError,
    };
}
