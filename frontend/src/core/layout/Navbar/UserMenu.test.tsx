import { render, screen, fireEvent, waitFor } from '../../../mocks/test-utils';
import { vi } from 'vitest';
import UserMenu from './UserMenu';
import type { CurrentUser } from '../../../modules/auth/api/auth.dto';

// Мокаем зависимости
vi.mock('./UserAvatar', () => ({
    __esModule: true,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    default: vi.fn(({ user }: any) => <div data-testid="mock-user-avatar">{user.name}</div>),
}));

describe('UserMenu', () => {
    // Приводим к CurrentUser для типобезопасности в пропсах, хотя здесь нужно только name
    const mockUser = { name: 'Test User', permissions: [] } as unknown as CurrentUser;
    const mockOnLogout = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render nothing if user is null', () => {
        const { container } = render(<UserMenu user={null} onLogout={mockOnLogout} />);
        expect(container).toBeEmptyDOMElement();
    });

    it('should render UserAvatar and open menu on click', async () => {
        render(<UserMenu user={mockUser} onLogout={mockOnLogout} />);

        expect(screen.getByTestId('mock-user-avatar')).toBeInTheDocument();
        expect(screen.getByText('Test User')).toBeInTheDocument();

        // Кликаем на IconButton (триггер для меню)
        // MUI IconButton является button
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            // Проверяем пункты меню. Предполагаем EN переводы по умолчанию: "Profile" и "Exit"
            // Если i18n правильно замокан в test-utils, ключи могут отличаться или используются реальные значения.
            // Согласно layout.json, ключи: "user_menu.profile" -> "Profile", "user_menu.logout" -> "Exit"
            // Используем regex для гибкости или точный текст при уверенности.
            expect(screen.getByText(/Profile/i)).toBeInTheDocument();
            expect(screen.getByText(/Exit/i)).toBeInTheDocument();
        });
    });

    it('should call onLogout when Logout option is clicked', async () => {
        render(<UserMenu user={mockUser} onLogout={mockOnLogout} />);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            fireEvent.click(screen.getByText(/Exit/i));
        });

        expect(mockOnLogout).toHaveBeenCalledTimes(1);

        // Ждём закрытия меню
        await waitFor(() => {
            expect(screen.queryByText(/Exit/i)).not.toBeInTheDocument();
        });
    });

    it('should close menu when Profile option is clicked', async () => {
        render(<UserMenu user={mockUser} onLogout={mockOnLogout} />);

        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            const profileLink = screen.getByText(/Profile/i);
            expect(profileLink).toBeInTheDocument();
            fireEvent.click(profileLink);
        });

        // Ждём закрытия меню
        await waitFor(() => {
            expect(screen.queryByText(/Profile/i)).not.toBeInTheDocument();
        });
    });
});
