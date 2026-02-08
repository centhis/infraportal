import { useEffect, useState } from 'react';

/**
 * Хук для отложенного обновления значения.
 * @param value Значение для откладывания
 * @param delay Задержка в мс
 */
export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState<T>(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]);

    return debouncedValue;
}
