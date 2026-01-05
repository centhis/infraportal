import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';
import GroupTable from './GroupTable';

// Mock dependencies
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));
vi.mock('../../hooks/usePersistentState', () => ({
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
    
    const renderComponent = () => render(
        <GroupTable 
            groups={mockGroups}
            onEdit={mockOnEdit}
            onDelete={mockOnDelete}
            rowCount={mockGroups.length}
            paginationModel={{ page: 0, pageSize: 5 }}
            onPaginationModelChange={vi.fn()}
        />
    );

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render group names and descriptions', async () => {
        renderComponent();
        expect(await screen.findByText('Admins')).toBeInTheDocument();
        expect(screen.getByText('Developers')).toBeInTheDocument();
        expect(screen.getByText('Admin group')).toBeInTheDocument();
    });
    
    it('should call onEdit when a row is clicked', async () => {
        renderComponent();
        fireEvent.click(await screen.findByRole('row', { name: /Admins/i }));
        expect(mockOnEdit).toHaveBeenCalledTimes(1);
        expect(mockOnEdit).toHaveBeenCalledWith(mockGroups[0]);
    });

    it('should call onDelete when delete icon is clicked', async () => {
        renderComponent();
        const developerRow = (await screen.findByText('Developers')).closest('.MuiDataGrid-row');
        const deleteButton = within(developerRow).getByRole('button', { name: /delete/i });
        fireEvent.click(deleteButton);
        
        expect(mockOnDelete).toHaveBeenCalledTimes(1);
        expect(mockOnDelete).toHaveBeenCalledWith(mockGroups[1].id);
        expect(mockOnEdit).not.toHaveBeenCalled();
    });

    it('should have a disabled delete button for a built-in group', async () => {
        renderComponent();
        const adminRow = (await screen.findByText('Admins')).closest('.MuiDataGrid-row');
        const deleteButton = within(adminRow).getByRole('button', { name: /delete/i });
        expect(deleteButton).toBeDisabled();
    });
});
