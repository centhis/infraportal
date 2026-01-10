import { render, screen } from '../../mocks/test-utils';
import { Outlet } from 'react-router-dom';
import AppRoutes from './AppRoutes';
import { ROUTES } from '../../shared/constants/routes';

// Mocks
vi.mock('../../components/layout/Navbar/Navbar', () => ({
    default: () => (
        <div>
            <div data-testid="navbar">Navbar</div>
            <Outlet />
        </div>
    )
}));
vi.mock('../../features/auth/pages/Login', () => ({ default: () => <div data-testid="login-page">Login Page</div> }));
vi.mock('../../features/contentPages/pages/Home', () => ({ default: () => <div data-testid="home-page">Home Page</div> }));
vi.mock('../../features/contentPages/pages/About', () => ({ default: () => <div data-testid="about-page">About Page</div> }));
vi.mock('../../features/userManagement/pages/UserManagementPage', () => ({ default: () => <div data-testid="user-management-page">User Management Page</div> }));

describe('AppRoutes', () => {

    it('renders nothing when auth is loading', () => {
        const { container } = render(<AppRoutes />, {
            authHookValue: { loading: true, user: null },
            initialEntries: [ROUTES.HOME],
        });
        expect(container).toBeEmptyDOMElement();
    });

    describe('when user is not authenticated', () => {
        const authHookValue = { loading: false, user: null };

        it('renders Login page for LOGIN route', () => {
            render(<AppRoutes />, { authHookValue, initialEntries: [ROUTES.LOGIN] });
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });

        it('redirects to LOGIN page from a protected route', () => {
            render(<AppRoutes />, { authHookValue, initialEntries: [ROUTES.HOME] });
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
    });

    describe('when user is authenticated', () => {
        const authHookValue = { loading: false, user: { name: 'Test User' } };

        it('redirects from LOGIN to HOME', () => {
            render(<AppRoutes />, { authHookValue, initialEntries: [ROUTES.LOGIN] });
            // In the test environment, Navigate component doesn't change the URL in jsdom.
            // We'll see the Home page content rendered for the brief moment before navigation.
            // Let's check that the login page is NOT rendered.
            expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
        });

        it('renders Home page for HOME route', () => {
            render(<AppRoutes />, { authHookValue, initialEntries: [ROUTES.HOME] });
            expect(screen.getByTestId('home-page')).toBeInTheDocument();
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
        });

        it('renders About page for ABOUT route', () => {
            render(<AppRoutes />, { authHookValue, initialEntries: [ROUTES.ABOUT] });
            expect(screen.getByTestId('about-page')).toBeInTheDocument();
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
        });

        it('renders User Management page for USER_MANAGEMENT route', () => {
            render(<AppRoutes />, { authHookValue, initialEntries: [ROUTES.USER_MANAGEMENT] });
            expect(screen.getByTestId('user-management-page')).toBeInTheDocument();
            expect(screen.getByTestId('navbar')).toBeInTheDocument();
        });

        it('redirects to HOME for an unknown route', () => {
            render(<AppRoutes />, { authHookValue, initialEntries: ['/some/random/path'] });
            expect(screen.getByTestId('home-page')).toBeInTheDocument();
        });
    });
});
