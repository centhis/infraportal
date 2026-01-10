import { screen } from '@testing-library/react';
import UserManagementPage from './UserManagementPage';
import { render } from '../../../mocks/test-utils'; // Import render from test-utils


// Mock the child component
vi.mock('../components/UserManagementTabs', () => ({ default: () => <div data-testid="user-management-tabs">User Management Tabs</div> }));

describe('UserManagementPage', () => {
    it('renders the UserManagementTabs component', () => {
        render(<UserManagementPage />);
        expect(screen.getByTestId('user-management-tabs')).toBeInTheDocument();
    });
});
