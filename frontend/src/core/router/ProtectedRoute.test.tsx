import { render, screen, waitFor } from '../../mocks/test-utils';
import { Routes, Route } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';
import { ROUTES } from '../../shared/constants/routes';

// Моковые компоненты
const MockLoginPage = () => <div data-testid="login-page">Login Page</div>;
const MockProtectedComponent = () => <div data-testid="protected-content">Protected Content</div>;

// Хелпер для рендера маршрутов с состоянием аутентификации
const renderProtectedRoutes = (authHookValue: { user: unknown; loading: boolean }, initialEntries = ['/protected']) => {
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

    it('should render children when authenticated and not loading', async () => {
        renderProtectedRoutes({ user: { id: 1 }, loading: false });

        await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('should redirect to login when not authenticated and not loading', async () => {
        renderProtectedRoutes({ user: null, loading: false });

        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render nothing when loading', () => {
        renderProtectedRoutes({ user: null, loading: true });

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });
});
