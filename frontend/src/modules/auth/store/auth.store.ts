import { createStore } from '@shared/lib';
import { usePermissionsStore } from '@core/auth';
import type { CurrentUser } from '../api/auth.dto';

export interface AuthState {
    /** Текущий пользователь */
    user: CurrentUser | null;
    /** Загрузка состояния авторизации */
    loading: boolean;
    /** Ошибка авторизации */
    error: string | null;
    /** Проверка авторизации выполнена */
    initialized: boolean;
}

export interface AuthActions {
    /** Установить пользователя */
    setUser: (user: CurrentUser | null) => void;
    /** Установить статус загрузки */
    setLoading: (loading: boolean) => void;
    /** Установить ошибку */
    setError: (error: string | null) => void;
    /** Очистить ошибку */
    clearError: () => void;
    /** Пометить как инициализированный */
    setInitialized: (initialized: boolean) => void;
    /** Сброс состояния (logout) */
    reset: () => void;
}

export type AuthStore = AuthState & AuthActions;

const initialState: AuthState = {
    user: null,
    loading: true,
    error: null,
    initialized: false,
};

/**
 * Zustand store для состояния авторизации.
 */
export const useAuthStore = createStore<AuthStore>(
    (set) => ({
        ...initialState,

        setUser: (user) => {
            set({ user, loading: false, error: null });
            // Синхронизация с permissions store
            if (user?.permissions) {
                usePermissionsStore.getState().setPermissions(user.permissions);
            }
        },

        setLoading: (loading) => set({ loading }),

        setError: (error) => set({ error, loading: false }),

        clearError: () => set({ error: null }),

        setInitialized: (initialized) => set({ initialized }),

        reset: () => {
            set(initialState);
            set({ loading: false, initialized: true });
            // Очистка permissions
            usePermissionsStore.getState().clear();
        },
    }),
    'auth'
);

/**
 * Получение состояния стора вне React
 */
export const getAuthState = (): AuthState => useAuthStore.getState();

/**
 * Проверка авторизации
 */
export const isAuthenticated = (): boolean => !!getAuthState().user;
