import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { AuthProvider, useAuthContext } from './AuthProvider';
import { useAuth } from '../../modules/auth/ui/hooks/useAuth';

// Мокаем хук useAuth
vi.mock('../../modules/auth/ui/hooks/useAuth');

// Тестовый компонент для использования контекста
const TestComponent = () => {
    const { user, loading, permissions, login, logout } = useAuthContext();

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div>
            <span data-testid="user-name">User: {user ? user.name : 'None'}</span>
            <span data-testid="permissions">Permissions: {permissions.join(', ')}</span>
            <button onClick={() => login('test', 'pass')}>Login</button>
            <button onClick={() => logout()}>Logout</button>
        </div>
    );
};

describe("AuthProvider", () => {

    // Дефолтное возвращаемое значение мока хука
    const defaultAuthHook = {
        user: null,
        loading: false,
        permissions: [],
        login: vi.fn(),
        logout: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it("should render children", () => {
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue(defaultAuthHook);

        render(
            <AuthProvider>
                <div>Child Component</div>
            </AuthProvider>
        );

        expect(screen.getByText("Child Component")).toBeInTheDocument();
    });

    it("should provide a loading state", () => {
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ ...defaultAuthHook, loading: true });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("should provide user context and permissions to children when authenticated", () => {
        const mockUser = { name: 'Test User', permissions: ['users:view'] };
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
            ...defaultAuthHook,
            user: mockUser,
            // Примечание: AuthProvider извлекает права из объекта user, если используется логика хука,
            // ИЛИ хук возвращает permissions отдельно.
            // Смотрим реализацию AuthProvider:
            // Реализация: const { user ... } = useAuth();
            // Получение прав: permissions: (user as CurrentUser)?.permissions || []
            // Если хук возвращает user с permissions, провайдер извлекает их.
            // Также нужно проверить, использует ли Provider массив 'permissions' из возврата хука?
            // "const { user, loading, login, logout } = useAuth();" -> НЕ извлекает 'permissions' из возврата хука напрямую.
            // Он получает их из 'user'.
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId("user-name")).toHaveTextContent("User: Test User");
        expect(screen.getByTestId("permissions")).toHaveTextContent("Permissions: users:view");
    });

    it("should provide null user when not authenticated", () => {
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ ...defaultAuthHook, user: null });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        expect(screen.getByTestId("user-name")).toHaveTextContent("User: None");
        expect(screen.getByTestId("permissions")).toHaveTextContent("Permissions:");
    });

    it("should delegate login and logout to the hook", async () => {
        const mockLogin = vi.fn();
        const mockLogout = vi.fn();
        (useAuth as ReturnType<typeof vi.fn>).mockReturnValue({
            ...defaultAuthHook,
            login: mockLogin,
            logout: mockLogout
        });

        render(
            <AuthProvider>
                <TestComponent />
            </AuthProvider>
        );

        fireEvent.click(screen.getByText("Login"));
        expect(mockLogin).toHaveBeenCalledWith({ login: 'test', password: 'pass' });

        fireEvent.click(screen.getByText("Logout"));
        expect(mockLogout).toHaveBeenCalled();
    });

    it("should throw an error if useAuthContext is used outside of AuthProvider", () => {
        // Подавляем console.error
        const consoleError = console.error;
        console.error = vi.fn();

        expect(() => render(<TestComponent />)).toThrow(
            "useAuthContext must be used within an AuthProvider"
        );

        console.error = consoleError;
    });
});
