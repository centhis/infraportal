import { create, type StateCreator } from 'zustand';
import { devtools, persist, type PersistOptions } from 'zustand/middleware';

/**
 * Типизированный шаблон для создания Zustand сторов.
 * Поддерживает DevTools и опциональную персистентность.
 *
 * @example
 * // Без персистентности
 * const useCounterStore = createStore<CounterState>(
 *   (set) => ({
 *     count: 0,
 *     increment: () => set((state) => ({ count: state.count + 1 })),
 *   }),
 *   'counter'
 * );
 *
 * @example
 * // С персистентностью в localStorage
 * const useSettingsStore = createStore<SettingsState>(
 *   (set) => ({
 *     theme: 'dark',
 *     setTheme: (theme) => set({ theme }),
 *   }),
 *   'settings',
 *   { persist: true }
 * );
 */

interface CreateStoreOptions {
    /** Включить персистентность в localStorage */
    persist?: boolean;
    /** Кастомные опции для persist middleware */
    persistOptions?: Partial<PersistOptions<unknown>>;
}

export function createStore<T extends object>(
    initializer: StateCreator<T, [['zustand/devtools', never]], []>,
    name: string,
    options: CreateStoreOptions = {}
) {
    const { persist: enablePersist = false, persistOptions = {} } = options;

    if (enablePersist) {
        return create<T>()(
            devtools(
                persist(initializer as StateCreator<T, [], []>, {
                    name: `infraportal-${name}`,
                    ...persistOptions,
                } as PersistOptions<T>),
                { name, enabled: import.meta.env.DEV }
            )
        );
    }

    return create<T>()(
        devtools(initializer, { name, enabled: import.meta.env.DEV })
    );
}

/**
 * Упрощённый шаблон для сторов без middleware.
 * Используется для простых локальных состояний.
 */
export function createSimpleStore<T extends object>(
    initializer: StateCreator<T>
) {
    return create<T>()(initializer);
}
