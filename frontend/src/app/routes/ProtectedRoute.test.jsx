import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import { useAuthContext } from '../providers/AuthProvider';
import { ROUTES } from '../../shared/constants/routes';

// Mock the useAuthContext hook
vi.mock('../providers/AuthProvider', () => ({
    useAuthContext: vi.fn(),
}));

// Mock the Login component for redirection tests
vi.mock('../../features/auth/pages/Login', () => ({
    __esModule: true,
    default: () => <div data-testid="login-page">Login Page</div>,
}));

const MockProtectedComponent = () => <div data-testid="protected-content">Protected Content</div>;

const renderWithRouter = (authContextValue, initialEntries = ['/protected']) => {
    useAuthContext.mockReturnValue(authContextValue);

    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <Routes>
                <Route path="/protected" element={<ProtectedRoute />}>
                    <Route index element={<MockProtectedComponent />} />
                </Route>
                <Route path={ROUTES.LOGIN} element={<div data-testid="login-page">Login Page</div>} />
            </Routes>
        </MemoryRouter>
    );
};

describe('ProtectedRoute', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render children when authenticated and not loading', async () => {
        renderWithRouter({ user: { id: 1 }, loading: false });

        await waitFor(() => {
            expect(screen.getByTestId('protected-content')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
    });

    it('should redirect to login when not authenticated and not loading', async () => {
        renderWithRouter({ user: null, loading: false });

        await waitFor(() => {
            expect(screen.getByTestId('login-page')).toBeInTheDocument();
        });
        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    });

    it('should render nothing when loading', () => {
        renderWithRouter({ user: null, loading: true });

        expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
        expect(screen.queryByTestId('login-page')).not.toBeInTheDocument();
        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        expect(screen.queryByText('Login Page')).not.toBeInTheDocument();
    });
});
