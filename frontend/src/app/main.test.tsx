import { vi } from 'vitest';
import { createRoot } from 'react-dom/client';

// Мок react-dom/client
vi.mock('react-dom/client', () => ({
    createRoot: vi.fn(() => ({
        render: vi.fn(),
    })),
}));

// Мок компонента App, чтобы избежать рендеринга всего приложения
vi.mock('./App', () => ({
    default: () => <div>Mocked App</div>,
}));

// Мок css для предотвращения ошибок парсинга
vi.mock('../index.css', () => ({}));

describe('main.tsx', () => {
    it('renders App into root element', async () => {
        // Создаем корневой элемент
        const root = document.createElement('div');
        root.id = 'root';
        document.body.appendChild(root);

        // Импортируем главный модуль для выполнения
        await import('./main');

        // Проверяем, что createRoot был вызван с правильным элементом
        expect(createRoot).toHaveBeenCalledWith(root);

        // Проверяем, что render был вызван
        // Нам нужно получить доступ к моку, возвращенному createRoot
        const mockResults = (createRoot as unknown as ReturnType<typeof vi.fn>).mock.results[0];
        expect(mockResults).toBeDefined();
        expect(mockResults?.value?.render).toHaveBeenCalled();

        // Очистка
        document.body.removeChild(root);
    });
});
