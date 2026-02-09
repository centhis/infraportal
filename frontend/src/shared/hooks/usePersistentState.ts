import { useState, useEffect, type Dispatch, type SetStateAction } from 'react';

/**
 * Хук для сохранения состояния в localStorage.
 * @param key Ключ для localStorage
 * @param initialValue Начальное значение
 */
export function usePersistentState<T>(
    key: string,
    initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
    const [state, setState] = useState<T>(() => {
        try {
            const storedValue = window.localStorage.getItem(key);
            return storedValue ? (JSON.parse(storedValue) as T) : initialValue;
        } catch (error) {
            console.error('Error reading from localStorage', error);
            return initialValue;
        }
    });

    useEffect(() => {
        try {
            window.localStorage.setItem(key, JSON.stringify(state));
        } catch (error) {
            console.error('Error writing to localStorage', error);
        }
    }, [key, state]);

    return [state, setState];
}

export default usePersistentState;
