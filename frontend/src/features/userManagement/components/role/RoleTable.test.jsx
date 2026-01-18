import { render, screen, fireEvent, within } from '../../../../mocks/test-utils';
import { vi } from 'vitest';
import RoleTable from './RoleTable';

// Mock the persistent state hook
vi.mock('../../../../shared/hooks/usePersistentState', () => ({
    __esModule: true,
    default: vi.fn((key, initialValue) => [initialValue, vi.fn()]),
}));

describe('RoleTable Unit Test', () => {
    const mockRoles = [
        { id: 1, name: 'Admin', description: 'Admin role', built_in: true, created_at: '2025-01-01', permissions: [{}, {}] },
        { id: 2, name: 'Viewer', description: 'Viewer role', built_in: false, created_at: '2025-01-02', permissions: [{}] },
    ];

    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render role names and descriptions', async () => {
        render(
            <RoleTable
                roles={mockRoles}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockRoles.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true} // Pass canDelete as true
            />
        );
        expect(await screen.findByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Viewer')).toBeInTheDocument();
        expect(screen.getByText('Admin role')).toBeInTheDocument();
    });

    it('should call onEdit when a row is clicked', async () => {
        render(
            <RoleTable
                roles={mockRoles}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockRoles.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true} // Pass canDelete as true
            />
        );
        // The row is identified by its role and name attribute
        fireEvent.click(await screen.findByRole('row', { name: /Admin/i }));
        expect(mockOnEdit).toHaveBeenCalledTimes(1);
        expect(mockOnEdit).toHaveBeenCalledWith(mockRoles[0]);
    });

    it('should call onDelete and stop propagation when delete icon is clicked', async () => {
        render(
            <RoleTable
                roles={mockRoles}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockRoles.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true} // Pass canDelete as true
            />
        );

        // Find the row for the non-built-in role
        const viewerRow = (await screen.findByText('Viewer')).closest('.MuiDataGrid-row');

        // Find the delete button within that row and click it
        const deleteButton = within(viewerRow).getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        expect(mockOnDelete).toHaveBeenCalledWith(mockRoles[1].id);

        // Verify that the onRowClick (which triggers onEdit) was NOT called
        expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('should have a disabled delete button for a built-in role', async () => {
        render(
            <RoleTable
                roles={mockRoles}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockRoles.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true} // Pass canDelete as true, still expect built-in to be disabled
            />
        );

        // Find the row for the built-in role
        const adminRow = (await screen.findByText('Admin')).closest('.MuiDataGrid-row');

        // Find the delete button within that row and assert it's disabled
        const deleteButton = within(adminRow).getByRole('button', { name: /delete/i });
        expect(deleteButton).toBeDisabled();
    });

    it('should display "Built-in" for a built-in role', async () => {
        render(
            <RoleTable
                roles={mockRoles}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockRoles.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true}
            />
        );

        const adminRow = (await screen.findByText('Admin')).closest('.MuiDataGrid-row');
        expect(within(adminRow).getByText('Built-in')).toBeInTheDocument();
    });

    it('should display "Custom" for a custom role', async () => {
        render(
            <RoleTable
                roles={mockRoles}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockRoles.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true}
            />
        );

        const viewerRow = (await screen.findByText('Viewer')).closest('.MuiDataGrid-row');
        expect(within(viewerRow).getByText('Custom')).toBeInTheDocument();
    });
});
