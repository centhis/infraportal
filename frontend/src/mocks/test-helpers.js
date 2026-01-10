import { vi } from 'vitest';

// Этот файл предназначен для общих тестовых утилит и хелперов.

/**
 * Создает мок для window.localStorage или window.sessionStorage.
 * @returns {object} Мок-объект Storage с методами vi.fn().
 */
export const createStorageMock = () => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: vi.fn(key => {
            delete store[key];
        }),
        clear: vi.fn(() => {
            store = {};
        }),
        // Вспомогательная функция для отладки
        getStore: () => store, 
    };
};

/**
 * Создает мок для window.location.
 * @returns {object} Мок-объект Location с методами vi.fn().
 */
export const createLocationMock = () => {
    let location = {
        href: 'https://www.example.com',
        pathname: '/',
        assign: vi.fn(),
        replace: vi.fn(),
    };

    // Метод для сброса мока
    Object.defineProperty(location, 'reset', {
        value: () => {
            location.href = 'https://www.example.com';
            location.pathname = '/';
            location.assign.mockClear();
            location.replace.mockClear();
        },
        enumerable: false,
    });

    return location;
};