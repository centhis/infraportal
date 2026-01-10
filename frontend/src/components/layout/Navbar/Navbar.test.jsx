import { render, screen, fireEvent } from '../../../mocks/test-utils';
import { vi } from 'vitest';
import Navbar from './Navbar';
import { ROUTES } from '../../../shared/constants/routes';

// Mock dependencies
vi.mock('../../../features/auth/hooks/useAuth'); // Mock the useAuth hook
vi.mock('./UserMenu', () => ({
    __esModule: true,
    default: vi.fn(({ user, onLogout }) => (
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

    it('should render correct title when user has permission', async () => {
        render(
            <Navbar />,
            {
                authHookValue: { user: { name: 'test' }, permissions: ['users:view'], logout: vi.fn(), loading: false },
                initialEntries: [ROUTES.USER_MANAGEMENT]
            }
        );
        expect(screen.getByRole('heading', { name: 'Users' })).toBeInTheDocument();
    });

    it('should render navigation items if user has permission', () => {
        render(
            <Navbar />,
            { authHookValue: { user: { name: 'test' }, permissions: ['users:view'], logout: vi.fn(), loading: false } }
        );
        expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    });

    it('should not render user management link if user lacks permission', () => {
        render(
            <Navbar />,
            { authHookValue: { user: { name: 'test' }, permissions: [], logout: vi.fn(), loading: false } } // User lacks 'users:view'
        );
        expect(screen.getByRole('link', { name: 'Home' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'About' })).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'Users' })).not.toBeInTheDocument();
    });

    it('should pass user and logout to UserMenu when authenticated', () => {
        const mockUser = { name: 'Test User' };
        const mockLogout = vi.fn();
        render(
            <Navbar />,
            { authHookValue: { user: mockUser, permissions: ['users:view'], logout: mockLogout, loading: false } } // User has permissions
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
        // Assert that specific content within the mock-user-menu is not present
        expect(screen.queryByTestId('user-name')).not.toBeInTheDocument();
        expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
    });

    it('should render nothing when loading', () => {
        render(
            <Navbar />,
            { authHookValue: { user: null, permissions: [], logout: vi.fn(), loading: true } }
        );
        expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
        expect(screen.queryByTestId('mock-user-menu')).not.toBeInTheDocument();
        expect(screen.queryByRole('heading', { name: 'Users' })).not.toBeInTheDocument();
    });

    it('should render user management link if user has users:view permission', () => {
        render(
            <Navbar />,
            { authHookValue: { user: { name: 'test' }, permissions: ['users:view'], logout: vi.fn(), loading: false } }
        );
        expect(screen.getByRole('link', { name: 'Users' })).toBeInTheDocument();
    });
});