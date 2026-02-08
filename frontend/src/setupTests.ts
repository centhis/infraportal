// Файл настройки тестов
import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { onlineManager, focusManager } from '@tanstack/react-query';
import { server } from './mocks/server';
import { resetUsers, resetRoles, resetPermissions } from './mocks/handlers';

// Устанавливаем мокинг API перед всеми тестами.
beforeAll(() => {
    // Мок location - используем дефолтный JSDOM, но гарантируем шпионы при необходимости
    // ПРИМЕЧАНИЕ: Мы НЕ перезаписываем window.location здесь, так как это ломает react-router.
    // JSDOM предоставляет валидный location на http://localhost:3000
    // Если нам нужно шпионить за replace, мы можем сделать это в конкретных тестах.
    
    // Отключаем фичи react-query, которые используют браузерные API
    onlineManager.setOnline(true);
    focusManager.setFocused(true);

    server.listen();
});

// Сбрасываем любые обработчики запросов, которые могли быть добавлены во время тестов,
// и очищаем localStorage, чтобы предотвратить утечку состояния.
afterEach(() => {
    server.resetHandlers();
    resetUsers();
    resetRoles();
    resetPermissions();
    // Используем замоканный метод clear
    window.localStorage.clear();
    // Очищаем все моки на всякий случай
    vi.clearAllMocks();
});

// Очистка после завершения тестов.
afterAll(() => server.close());
