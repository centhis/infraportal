import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import { useAuthContext } from '../../../app/providers/AuthProvider';
import { ROUTES } from '../../../shared/constants/routes';

// Mock dependencies
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useLocation: vi.fn(),
        Link: vi.fn(({ to, children }) => <a href={to}>{children}</a>), // Mock Link to be an anchor tag
    };
});
vi.mock('../../../app/providers/AuthProvider', () => ({
    useAuthContext: vi.fn(),
}));
vi.mock('./UserMenu', () => ({
    __esModule: true,
    default: vi.fn(({ user, onLogout }) => (
        <div data-testid="mock-user-menu">
            {user && <span data-testid="user-name">{user.name}</span>}
            {user && <button onClick={onLogout} data-testid="logout-button">Logout</button>}
        </div>
    )),
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));

const renderNavbar = (authContextValue, initialPath = ROUTES.HOME) => {
    useAuthContext.mockReturnValue(authContextValue);
    useLocation.mockReturnValue({ pathname: initialPath });

    return render(
        <MemoryRouter initialEntries={[initialPath]}>
            <Routes>
                <Route path="*" element={<Navbar />} />
            </Routes>
        </MemoryRouter>
    );
};

describe('Navbar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render current title based on route', async () => {
        renderNavbar({ user: null, logout: vi.fn(), loading: false }, ROUTES.HOME);
        // Query the AppBar title specifically
        expect(screen.getByRole('heading', { name: 'nav_items.home' })).toBeInTheDocument();

        useLocation.mockReturnValue({ pathname: ROUTES.USER_MANAGEMENT });
        renderNavbar({ user: null, logout: vi.fn(), loading: false }, ROUTES.USER_MANAGEMENT);
        expect(screen.getByRole('heading', { name: 'nav_items.user_management' })).toBeInTheDocument();
    });

    it('should render navigation items', () => {
        renderNavbar({ user: null, logout: vi.fn(), loading: false });

        // Query navigation links specifically
        expect(screen.getByRole('link', { name: 'nav_items.home' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'nav_items.about' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: 'nav_items.user_management' })).toBeInTheDocument();
    });

    it('should pass user and logout to UserMenu when authenticated', () => {
        const mockUser = { name: 'Test User' };
        const mockLogout = vi.fn();
        renderNavbar({ user: mockUser, logout: mockLogout, loading: false });

        expect(screen.getByTestId('mock-user-menu')).toBeInTheDocument();
        expect(screen.getByTestId('user-name')).toHaveTextContent('Test User');
        expect(screen.getByTestId('logout-button')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('logout-button'));
        expect(mockLogout).toHaveBeenCalledTimes(1);
    });

    it('should not render user-related content or logout button when not authenticated', () => {
        renderNavbar({ user: null, logout: vi.fn(), loading: false });

        expect(screen.queryByTestId('user-name')).not.toBeInTheDocument();
        expect(screen.queryByTestId('logout-button')).not.toBeInTheDocument();
    });

    it('should render nothing when loading', () => {
        const { container } = renderNavbar({ user: null, logout: vi.fn(), loading: true });
        expect(container).toBeEmptyDOMElement();
    });
});
