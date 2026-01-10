import { screen, fireEvent } from '@testing-library/react';
import { vi as _vi } from 'vitest';
import { Routes, Route } from 'react-router-dom';
import Login from './Login';
import { ROUTES } from '../../../shared/constants/routes';
import { MOCK_API_MESSAGES } from '../../../mocks/mockData';
import { render } from '../../../mocks/test-utils'; // Import render from test-utils

// A mock Home component to test navigation
const HomeComponent = () => <div>Welcome Home</div>;

describe('Login Page Integration Test', () => {
    it('should successfully log in and redirect to home', async () => {
        render(
            <Routes>
                <Route path={ROUTES.LOGIN} element={<Login />} />
                <Route path={ROUTES.HOME} element={<HomeComponent />} />
            </Routes>,
            { initialEntries: [ROUTES.LOGIN] }
        );

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/login_page.login/i), { target: { value: 'testuser' } });
        fireEvent.change(screen.getByLabelText(/login_page.password/i), { target: { value: 'password' } });

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /login_page.submit/i }));

        // Wait for redirection and check for home page content
        expect(await screen.findByText('Welcome Home')).toBeInTheDocument();
    });

    it('should show an error message on failed login', async () => {
        render(
            <Routes>
                <Route path={ROUTES.LOGIN} element={<Login />} />
                <Route path={ROUTES.HOME} element={<HomeComponent />} />
            </Routes>,
            { initialEntries: [ROUTES.LOGIN] }
        );

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
