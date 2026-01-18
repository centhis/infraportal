import { render, screen, fireEvent, within } from '../../../../mocks/test-utils';
import { vi } from 'vitest';
import GroupTable from './GroupTable';

// Mock dependencies
vi.mock('../../../../shared/hooks/usePersistentState', () => ({
    __esModule: true,
    default: vi.fn((key, initialValue) => [initialValue, vi.fn()]),
}));

describe('GroupTable', () => {
    const mockGroups = [
        { id: 1, name: 'Admins', description: 'Admin group', built_in: true, created_at: '2025-01-01', roles: [{}, {}] },
        { id: 2, name: 'Developers', description: 'Developer group', built_in: false, created_at: '2025-01-02', roles: [{}] },
    ];

    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render group names and descriptions', async () => {
        render(
            <GroupTable
                groups={mockGroups}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockGroups.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true} // Pass canDelete as true
            />
        );
        expect(await screen.findByText('Admins')).toBeInTheDocument();
        expect(screen.getByText('Developers')).toBeInTheDocument();
        expect(screen.getByText('Admin group')).toBeInTheDocument();
    });

    it('should call onEdit when a row is clicked', async () => {
        render(
            <GroupTable
                groups={mockGroups}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockGroups.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true} // Pass canDelete as true
            />
        );
        fireEvent.click(await screen.findByRole('row', { name: /Admins/i }));
        expect(mockOnEdit).toHaveBeenCalledTimes(1);
        expect(mockOnEdit).toHaveBeenCalledWith(mockGroups[0]);
    });

    it('should call onDelete when delete icon is clicked', async () => {
        render(
            <GroupTable
                groups={mockGroups}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockGroups.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true} // Pass canDelete as true
            />
        );
        const developerRow = (await screen.findByText('Developers')).closest('.MuiDataGrid-row');
        const deleteButton = within(developerRow).getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);

        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        expect(mockOnDelete).toHaveBeenCalledWith(mockGroups[1].id);
        expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('should have a disabled delete button for a built-in group', async () => {
        render(
            <GroupTable
                groups={mockGroups}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockGroups.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true} // Pass canDelete as true
            />
        );
        const adminRow = (await screen.findByText('Admins')).closest('.MuiDataGrid-row');
        const deleteButton = within(adminRow).getByRole('button', { name: /delete/i });
        expect(deleteButton).toBeDisabled();
    });

    it('should display "Built-in" for a built-in group', async () => {
        render(
            <GroupTable
                groups={mockGroups}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockGroups.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true}
            />
        );
        const adminRow = (await screen.findByText('Admins')).closest('.MuiDataGrid-row');
        expect(within(adminRow).getByText('Built-in')).toBeInTheDocument();
    });

    it('should display "Custom" for a custom group', async () => {
        render(
            <GroupTable
                groups={mockGroups}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockGroups.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={vi.fn()}
                canDelete={true}
            />
        );
        const developerRow = (await screen.findByText('Developers')).closest('.MuiDataGrid-row');
        expect(within(developerRow).getByText('Custom')).toBeInTheDocument();
    });
});
