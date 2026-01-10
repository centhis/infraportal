import { render, screen, waitFor } from '../../mocks/test-utils';
import { vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { ROUTES } from '../../shared/constants/routes';

// Mock the Login page for redirection tests
const MockLoginPage = () => <div data-testid="login-page">Login Page</div>;

const MockProtectedComponent = () => <div data-testid="protected-content">Protected Content</div>;

const renderRoutes = (authHookValue, initialEntries = ['/protected']) => {
    return render(
        <Routes>
            <Route path="/protected" element={<ProtectedRoute />}>
                <Route index element={<MockProtectedComponent />} />
            </Route>
            <Route path={ROUTES.LOGIN} element={<MockLoginPage />} />
        </Routes>,
        { authHookValue, initialEntries }
    );
};

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render children when authenticated and not loading', async () => {
        renderRoutes({ user: { id: 1 }, loading: false });

        await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('should redirect to login when not authenticated and not loading', async () => {
        renderRoutes({ user: null, loading: false });

        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render nothing when loading', () => {
        renderRoutes({ user: null, loading: true });

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
});
