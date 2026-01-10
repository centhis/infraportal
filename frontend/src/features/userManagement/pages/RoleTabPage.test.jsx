import { render, screen } from '../../../mocks/test-utils';
import { vi } from 'vitest';
import RoleTabPage from './RoleTabPage';
import useRoles from '../hooks/useRoles';

// Mock the custom hook useRoles
vi.mock('../hooks/useRoles');

describe('RoleTabPage', () => {
    it('should show a loading spinner when loading', () => {
        // Arrange
        useRoles.mockReturnValue({
            loading: true,
            roles: [],
        });

        // Act
        render(<RoleTabPage />);

        // Assert
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render the role table when not loading', async () => {
        // Arrange
        useRoles.mockReturnValue({
            loading: false,
            roles: [
                { id: 1, name: 'Admin', built_in: true, permissions: [] },
            ],
            // Mock other return values of the hook as needed by the component
            paginationModel: { page: 0, pageSize: 10 },
            setPaginationModel: vi.fn(),
            rowCount: 1,
            refetchRoles: vi.fn(),
            createRole: vi.fn(),
            updateRole: vi.fn(),
            deleteRole: vi.fn(),
        });

        // Act
        render(<RoleTabPage />);

        // Assert
        expect(await screen.findByText('Admin')).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
});