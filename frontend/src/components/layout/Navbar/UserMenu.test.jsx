import { render, screen, fireEvent, waitFor } from '../../../mocks/test-utils';
import { vi } from 'vitest';
import UserMenu from './UserMenu';

// Mock dependencies
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
            expect(screen.getByText('Profile')).toBeInTheDocument();
            expect(screen.getByText('Exit')).toBeInTheDocument();
        });
    });

    it('should call onLogout when Logout option is clicked', async () => {
        render(<UserMenu user={mockUser} onLogout={mockOnLogout} />);

        // Open the menu
        fireEvent.click(screen.getByRole('button'));

        // Click the Logout menu item
        await waitFor(() => {
            fireEvent.click(screen.getByText('Exit'));
        });

        expect(mockOnLogout).toHaveBeenCalledTimes(1);
        await waitFor(() => { // Wait for the menu to close
            expect(screen.queryByText('Exit')).not.toBeInTheDocument();
        });
    });

    it('should close menu when Profile option is clicked', async () => {
        render(<UserMenu user={mockUser} onLogout={mockOnLogout} />);

        // Open the menu
        fireEvent.click(screen.getByRole('button'));

        // Click the Profile menu item
        await waitFor(() => {
            expect(screen.getByText('Profile')).toBeInTheDocument();
            fireEvent.click(screen.getByText('Profile'));
        });

        await waitFor(() => { // Wait for the menu to close
            expect(screen.queryByText('Profile')).not.toBeInTheDocument();
        });
    });
});
