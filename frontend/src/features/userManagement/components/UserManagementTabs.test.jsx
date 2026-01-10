import { screen, fireEvent } from '@testing-library/react';
import { useLocation } from 'react-router-dom';
import UserManagementTabs from './UserManagementTabs';
import usePersistentState from '../hooks/usePersistentState'; // The actual hook
import { render } from '../../../mocks/test-utils'; // Import render from test-utils


// Mock the child components/pages
vi.mock('../pages/UserTabPage', () => ({ default: () => <div data-testid="user-tab-page">User Tab Content</div> }));
vi.mock('../pages/RoleTabPage', () => ({ default: () => <div data-testid="role-tab-page">Role Tab Content</div> }));
vi.mock('../pages/GroupTabPage', () => ({ default: () => <div data-testid="group-tab-page">Group Tab Content</div> }));

// Mock useLocation from react-router-dom
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useLocation: vi.fn(),
    };
});

// Mock usePersistentState hook
vi.mock('../hooks/usePersistentState', () => ({ default: vi.fn() }));

const mockSetState = vi.fn();

describe('UserManagementTabs', () => {
    beforeEach(() => {
        // Mock usePersistentState to control its value
        usePersistentState.mockReturnValue([0, mockSetState]);
        
        // Mock useLocation with default empty state
        useLocation.mockReturnValue({ state: {} });
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    it('renders the tabs and initially displays the Users tab content', () => {
        render(<UserManagementTabs />); // Use render from test-utils

        expect(screen.getByRole('tab', { name: 'Users' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Groups' })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: 'Roles' })).toBeInTheDocument();

        expect(screen.getByTestId('user-tab-page')).toBeInTheDocument();
        expect(screen.queryByTestId('group-tab-page')).not.toBeInTheDocument();
        expect(screen.queryByTestId('role-tab-page')).not.toBeInTheDocument();
    });

    it('switches to Groups tab content when Groups tab is clicked', () => {
        usePersistentState.mockReturnValue([0, mockSetState]); // Initial state
        const { rerender } = render(<UserManagementTabs />);
        
        const groupsTab = screen.getByRole('tab', { name: 'Groups' });
        fireEvent.click(groupsTab);
        
        // Simulate state change after click
        usePersistentState.mockReturnValue([1, mockSetState]); 
        rerender(<UserManagementTabs />);

        expect(mockSetState).toHaveBeenCalledWith(1); // Check that setValue was called
    });

    it('switches to Roles tab content when Roles tab is clicked', () => {
        usePersistentState.mockReturnValue([0, mockSetState]); // Initial state
        const { rerender } = render(<UserManagementTabs />);
        
        const rolesTab = screen.getByRole('tab', { name: 'Roles' });
        fireEvent.click(rolesTab);
        
        // Simulate state change after click
        usePersistentState.mockReturnValue([2, mockSetState]); 
        rerender(<UserManagementTabs />);

        expect(mockSetState).toHaveBeenCalledWith(2); // Check that setValue was called
    });

    it('resets to the first tab (Users) if location state has resetTab', () => {
        usePersistentState.mockReturnValue([1, mockSetState]); // Start on a different tab
        useLocation.mockReturnValue({ state: { resetTab: true } });
        
        render(<UserManagementTabs />);
        
        expect(mockSetState).toHaveBeenCalledWith(0); // Should reset to 0
    });
});
