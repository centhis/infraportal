import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import UserMenu from './UserMenu';

// Mock dependencies
vi.mock('react-router-dom', () => ({
    Link: vi.fn(({ to, children, onClick }) => <a href={to} onClick={onClick}>{children}</a>),
}));
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));
vi.mock('./UserAvatar', () => ({
    __esModule: true,
    default: vi.fn(({ user }) => <div data-testid="mock-user-avatar">{user.name}</div>),
}));

describe('UserMenu', () => {
    const mockUser = { name: 'Test User' };
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

        // Click the IconButton to open the menu
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(screen.getByText('user_menu.profile')).toBeInTheDocument();
            expect(screen.getByText('user_menu.logout')).toBeInTheDocument();
        });
    });

    it('should call onLogout when Logout option is clicked', async () => {
        render(<UserMenu user={mockUser} onLogout={mockOnLogout} />);

        // Open the menu
        fireEvent.click(screen.getByRole('button'));

        // Click the Logout menu item
        await waitFor(() => {
            fireEvent.click(screen.getByText('user_menu.logout'));
        });

        expect(mockOnLogout).toHaveBeenCalledTimes(1);
        await waitFor(() => { // Wait for the menu to close
            expect(screen.queryByText('user_menu.logout')).not.toBeInTheDocument();
        });
    });

    it('should close menu when Profile option is clicked', async () => {
        render(<UserMenu user={mockUser} onLogout={mockOnLogout} />);

        // Open the menu
        fireEvent.click(screen.getByRole('button'));

        // Click the Profile menu item
        await waitFor(() => {
            expect(screen.getByText('user_menu.profile')).toBeInTheDocument();
            fireEvent.click(screen.getByText('user_menu.profile'));
        });

        await waitFor(() => { // Wait for the menu to close
            expect(screen.queryByText('user_menu.profile')).not.toBeInTheDocument();
        });
    });
});
