import { render, screen, fireEvent } from '../../../mocks/test-utils';
import { vi } from 'vitest';
import Navbar from './Navbar';
import { ROUTES } from '../../../shared/constants/routes';

// Мокаем зависимости
// Примечание: test-utils уже мокает реализацию useAuth хука, но мы мокаем модуль здесь на случай,
// если test-utils не покрывает все случаи или если нужен прямой импорт.
// Однако test-utils делает: vi.mock('../modules/auth/ui/hooks/useAuth');
// Поэтому мы полагаемся на test-utils для состояния авторизации через `authHookValue`.

interface UserMenuProps {
    user: { name: string } | null;
    onLogout: () => void;
}

// Мокаем UserMenu для проверки передачи пропсов
vi.mock('./UserMenu', () => ({
    __esModule: true,
    default: vi.fn(({ user, onLogout }: UserMenuProps) => (
        <div data-testid="mock-user-menu">
            {user && <span data-testid="user-name">{user.name}</span>}
            {user && <button onClick={onLogout} data-testid="logout-button">Logout</button>}
        </div>
    )),
}));

describe('Navbar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render correct title when user has permission', () => {
        render(
            <Navbar />,
            {
                authHookValue: { user: { name: 'test', permissions: ['users:view'] }, permissions: ['users:view'], logout: vi.fn(), loading: false },
                initialEntries: [ROUTES.USER_MANAGEMENT]
            }
        );
        // "Users" — заголовок для маршрута USER_MANAGEMENT в Navbar
        expect(screen.getByRole('heading', { name: /Users/i })).toBeInTheDocument();
    });

    // Примечание: legacy-тест ожидал 'Users', но реальный код использует t('nav_items.user_management').
    // test-utils мокает i18n с ресурсами. Ключ 'user_management' вероятно возвращает 'Users' в реальном приложении,
    // но в тестовом окружении с простым моком или ресурсами проверяем, что возвращает t.
    // В test-utils:
    // ... layout: layoutTranslations ... (используем переводы)
    // layout.json вероятно содержит "nav_items": { "user_management": "Users" }
    // Если точное совпадение не сработает, нужно проверить файлы переводов или скорректировать ожидание.
    // Пока предполагаем, что перевод возвращает ключ или значение. Предполагаем 'Users' или ключ.
    // Обновление: В Navbar.tsx:
    // { text: t('nav_items.user_management'), ... } (код в Navbar.tsx)
    // Если i18n правильно загружен, должно быть значение.

    it('should render navigation items if user has permission', () => {
        render(
            <Navbar />,
            { authHookValue: { user: { name: 'test', permissions: ['users:view'] }, permissions: ['users:view'], logout: vi.fn(), loading: false } }
        );
        // Ключи переводов из Navbar.tsx:
        // nav_items.home -> Home (Домой)
        // nav_items.about -> About (О нас)
        // nav_items.user_management -> Users (Пользователи)
        // Корректируем ожидания к вероятным переведённым значениям или ключам при использовании CIMode
        // (но test-utils использует en ресурс).

        // Предполагаем стандартные EN переводы: "Home", "About", "Users".
        // Используем regex или частичное совпадение при неуверенности, или проверяем ключ.
        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
        // Требуется право доступа для этого пункта
        expect(screen.getByRole('link', { name: /Users/i })).toBeInTheDocument();
    });

    it('should render user management link if user has users:view permission', () => {
        render(
            <Navbar />,
            { authHookValue: { user: { name: 'test', permissions: ['users:view'] }, permissions: ['users:view'], logout: vi.fn(), loading: false } }
        );
        expect(screen.getByRole('link', { name: /Users/i })).toBeInTheDocument();
    });

    it('should not render user management link if user lacks permission', () => {
        render(
            <Navbar />,
            { authHookValue: { user: { name: 'test', permissions: [] }, permissions: [], logout: vi.fn(), loading: false } }
        );
        expect(screen.getByRole('link', { name: /home/i })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /about/i })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: /Users/i })).not.toBeInTheDocument();
    });

    it('should pass user and logout to UserMenu when authenticated', () => {
        const mockUser = { name: 'Test User', permissions: ['users:view'] };
        const mockLogout = vi.fn();
        render(
            <Navbar />,
            { authHookValue: { user: mockUser, permissions: ['users:view'], logout: mockLogout, loading: false } }
        );

        expect(screen.getByTestId('mock-user-menu')).toBeInTheDocument();
        expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
        expect(screen.getByTestId('logout-button')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('logout-button'));
        expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should not render UserMenu content when not authenticated', () => {
        render(
            <Navbar />,
            { authHookValue: { user: null, permissions: [], logout: vi.fn(), loading: false } }
        );
        // В зависимости от реализации Navbar, если !user, может рендериться UserMenu с null user,
        // или UserMenu может не рендериться вообще.
        // В Navbar.tsx: <UserMenu user={user} onLogout={logout} />
        // UserMenu.tsx: if (!user) return null; (условие в компоненте)
        // Мок должен вызываться с null user и возвращать что-то или проверять поведение.
        // Наш мок выше: default: vi.fn(({ user...
        // Если user равен null, мок рендерит <div data-testid="mock-user-menu">...</div>,
        // но условия внутри скрывают name/logout.

        expect(screen.queryByTestId('user-name')).not.toBeInTheDocument();
        expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
    });

    it('should render nothing when loading', () => {
        render(
            <Navbar />,
            { authHookValue: { user: null, permissions: [], logout: vi.fn(), loading: true } }
        );
        // В Navbar.tsx: if (loading) return null;
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-user-menu')).not.toBeInTheDocument();
    });
});
