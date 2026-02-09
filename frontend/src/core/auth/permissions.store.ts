import { createStore } from '@shared/lib';

export interface PermissionsState {
    /** Список прав текущего пользователя */
    permissions: string[];
    /** Загрузка прав */
    loading: boolean;
    /** Ошибка загрузки */
    error: string | null;
}

export interface PermissionsActions {
    /** Установить права */
    setPermissions: (permissions: string[]) => void;
    /** Установить статус загрузки */
    setLoading: (loading: boolean) => void;
    /** Установить ошибку */
    setError: (error: string | null) => void;
    /** Очистить права (при logout) */
    clear: () => void;
}

export type PermissionsStore = PermissionsState & PermissionsActions;

const initialState: PermissionsState = {
    permissions: [],
    loading: false,
    error: null,
};

/**
 * Zustand store для хранения прав текущего пользователя.
 * Позволяет использовать permissions вне React-компонентов.
 */
export const usePermissionsStore = createStore<PermissionsStore>(
    (set) => ({
        ...initialState,

        setPermissions: (permissions) => set({ permissions, loading: false, error: null }),

        setLoading: (loading) => set({ loading }),

        setError: (error) => set({ error, loading: false }),

        clear: () => set(initialState),
    }),
    'permissions'
);

/**
 * Получение состояния стора вне React (для сервисов)
 */
export const getPermissionsState = (): PermissionsState => usePermissionsStore.getState();
