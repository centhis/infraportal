import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import RoleTable from './RoleTable';

// Mock the translation hook
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key,
    }),
}));

// Mock the persistent state hook
vi.mock('../../hooks/usePersistentState', () => ({
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
    
    const renderComponent = () => render(
        <RoleTable 
            roles={mockRoles}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            rowCount={mockRoles.length}
            paginationModel={{ page: 0, pageSize: 5 }}
            onPaginationModelChange={vi.fn()}
        />
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render role names and descriptions', async () => {
        renderComponent();
        expect(await screen.findByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Viewer')).toBeInTheDocument();
        expect(screen.getByText('Admin role')).toBeInTheDocument();
    });
    
    it('should call onEdit when a row is clicked', async () => {
        renderComponent();
        // The row is identified by its role and name attribute
        fireEvent.click(await screen.findByRole('row', { name: /Admin/i }));
        expect(mockOnEdit).toHaveBeenCalledTimes(1);
        expect(mockOnEdit).toHaveBeenCalledWith(mockRoles[0]);
    });

    it('should call onDelete and stop propagation when delete icon is clicked', async () => {
        renderComponent();
        
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
        renderComponent();
        
        // Find the row for the built-in role
        const adminRow = (await screen.findByText('Admin')).closest('.MuiDataGrid-row');
        
        // Find the delete button within that row and assert it's disabled
        const deleteButton = within(adminRow).getByRole('button', { name: /delete/i });
        expect(deleteButton).toBeDisabled();
    });
});
