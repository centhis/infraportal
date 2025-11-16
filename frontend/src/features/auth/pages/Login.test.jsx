import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import Login from './Login';
import { AuthProvider } from '../../../app/providers/AuthProvider';
import { ROUTES } from '../../../shared/constants/routes';
import { MOCK_API_MESSAGES } from '../../../mocks/mockData';

// Mock dependencies
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
    I18nextProvider: ({ children }) => children,
}));
vi.mock('../../../app/providers/I18nProvider', () => ({
    useI18n: () => ({
        currentLanguage: 'en',
        changeLanguage: vi.fn(),
    }),
    I18nProvider: ({ children }) => children,
}));

// A mock Home component to test navigation
const HomeComponent = () => <div>Welcome Home</div>;

const renderWithProviders = (initialEntries = [ROUTES.LOGIN]) => {
    return render(
        <MemoryRouter initialEntries={initialEntries}>
            <AuthProvider>
                <Routes>
                    <Route path={ROUTES.LOGIN} element={<Login />} />
                    <Route path={ROUTES.HOME} element={<HomeComponent />} />
                </Routes>
            </AuthProvider>
        </MemoryRouter>
    );
};

describe('Login Page Integration Test', () => {
    it('should successfully log in and redirect to home', async () => {
        renderWithProviders();

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/login_page.login/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/login_page.password/i), { target: { value: 'password' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /login_page.submit/i }));

        // Wait for redirection and check for home page content
        expect(await screen.findByText('Welcome Home')).toBeInTheDocument();
    });

    it('should show an error message on failed login', async () => {
        renderWithProviders();

        // Fill out the form with wrong credentials
        fireEvent.change(screen.getByLabelText(/login_page.login/i), { target: { value: 'wronguser' } });
        fireEvent.change(screen.getByLabelText(/login_page.password/i), { target: { value: 'wrongpassword' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /login_page.submit/i }));

        // Wait for the error message to appear
        expect(await screen.findByText(MOCK_API_MESSAGES.LOGIN_ERROR)).toBeInTheDocument();

        // Check that we are still on the login page
        expect(screen.queryByText('Welcome Home')).not.toBeInTheDocument();
    });
});
