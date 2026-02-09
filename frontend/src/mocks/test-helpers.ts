import { vi, type Mock } from 'vitest';

// Этот файл предназначен для общих тестовых утилит и хелперов.

export interface StorageMock {
    getItem: Mock<(key: string) => string | null>;
    setItem: Mock<(key: string, value: string) => void>;
    removeItem: Mock<(key: string) => void>;
    clear: Mock<() => void>;
    getStore: () => Record<string, string>;
    length: number;
    key: Mock<(index: number) => string | null>;
}

/**
 * Создает мок для window.localStorage или window.sessionStorage.
 * @returns {object} Мок-объект Storage с методами vi.fn().
 */
export const createStorageMock = (): StorageMock => {
    let store: Record<string, string> = {};
    return {
        getItem: vi.fn((key: string) => store[key] || null),
        setItem: vi.fn((key: string, value: string) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn((key: string) => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        // Вспомогательная функция для отладки
        getStore: () => store,
        // Мокаем length и key для совместимости интерфейсов (приблизительно)
        length: 0,
        key: vi.fn((index: number) => Object.keys(store)[index] || null),
    };
};

export interface LocationMock {
    href: string;
    pathname: string;
    assign: Mock;
    replace: Mock;
    reset: () => void;
}

/**
 * Создает мок для window.location.
 * @returns {object} Мок-объект Location с методами vi.fn().
 */
export const createLocationMock = (): LocationMock => {
    const location = {
        href: 'https://www.example.com',
        pathname: '/',
        assign: vi.fn(),
        replace: vi.fn(),
    } as Omit<LocationMock, 'reset'>;

    // Метод для сброса мока
    Object.defineProperty(location, 'reset', {
        value: () => {
            location.href = 'https://www.example.com';
            location.pathname = '/';
            (location.assign as Mock).mockClear();
            (location.replace as Mock).mockClear();
        },
        enumerable: false,
    });

    return location as LocationMock;
};
