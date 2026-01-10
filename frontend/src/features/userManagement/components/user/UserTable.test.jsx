import { render, screen, fireEvent, within } from '../../../../mocks/test-utils';
import { vi } from 'vitest';

import UserTable from './UserTable';

const mockUsers = [
    { id: 1, login: 'admin', name: 'Admin User', type: 'built_in', created_at: '2025-01-01', is_active: true },
    { id: 2, login: 'viewer', name: 'Viewer User', type: 'local', created_at: '2025-01-02', is_active: false },
    { id: 3, login: 'ldap_user', name: 'LDAP User', type: 'ldap', created_at: '2025-01-03', is_active: true },
];

describe('UserTable', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    beforeEach(() => {
        // Сбрасываем моки перед каждым тестом
        vi.clearAllMocks();
    });

    // Мокаем usePersistentState, чтобы он не мешал.
    vi.mock('../../hooks/usePersistentState', () => ({
        __esModule: true,
        default: vi.fn(() => [{}, vi.fn()]),
    }));

    describe('Поведение', () => {
        it('should call onEdit when clicking on a row', async () => {
            render(
                <UserTable 
                    users={mockUsers}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                    rowCount={mockUsers.length}
                    paginationModel={{ page: 0, pageSize: 5 }}
                    onPaginationModelChange={() => {}}
                    canDelete={true} // Pass canDelete as true
                />
            );
    
            const viewerRow = await screen.findByText('viewer');
            fireEvent.click(viewerRow.closest('.MuiDataGrid-row'));
    
            expect(mockOnEdit).toHaveBeenCalledTimes(1);
            expect(mockOnEdit).toHaveBeenCalledWith(mockUsers[1]);
            expect(mockOnDelete).not.toHaveBeenCalled();
        });
    
        it('should call onDelete when clicking the delete icon', async () => {
            render(
                <UserTable 
                    users={mockUsers}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                    rowCount={mockUsers.length}
                    paginationModel={{ page: 0, pageSize: 5 }}
                    onPaginationModelChange={() => {}}
                    canDelete={true} // Pass canDelete as true
                />
            );
    
            const viewerRow = (await screen.findByText('viewer')).closest('.MuiDataGrid-row');
            const deleteButton = within(viewerRow).getByRole('button', { name: /delete/i });
            fireEvent.click(deleteButton);
    
            expect(mockOnDelete).toHaveBeenCalledTimes(1);
            expect(mockOnDelete).toHaveBeenCalledWith(mockUsers[1].id);
            expect(mockOnEdit).not.toHaveBeenCalled();
        });

        it('delete button should be disabled for a built_in user', async () => {
            render(
                <UserTable
                    users={mockUsers}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                    rowCount={mockUsers.length}
                    paginationModel={{ page: 0, pageSize: 5 }}
                    onPaginationModelChange={() => {}}
                    canDelete={true} // Pass canDelete as true, still expect built-in to be disabled
                />
            );

            const adminRow = (await screen.findByText('admin')).closest('.MuiDataGrid-row');
            const deleteButton = within(adminRow).getByRole('button', { name: /delete/i });
            expect(deleteButton).toBeDisabled();
        });
    });

    describe('Display', () => {
        beforeEach(() => {
            render(
                <UserTable 
                    users={mockUsers}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    rowCount={mockUsers.length}
                    paginationModel={{ page: 0, pageSize: 5 }}
                    onPaginationModelChange={() => {}}
                    canDelete={true}
                />
            );
        });

        it('should display "Built-in" for built_in user', async () => {
            const adminRow = (await screen.findByText('admin')).closest('.MuiDataGrid-row');
            const chip = within(adminRow).getByText('Built-in');
            expect(chip).toBeInTheDocument();
        });

        it('should display "Local" for local user', async () => {
            const viewerRow = (await screen.findByText('viewer')).closest('.MuiDataGrid-row');
            const chip = within(viewerRow).getByText('Local');
            expect(chip).toBeInTheDocument();
        });

        it('should display "LDAP" for ldap user', async () => {
            const ldapRow = (await screen.findByText('ldap_user')).closest('.MuiDataGrid-row');
            const chip = within(ldapRow).getByText('LDAP');
            expect(chip).toBeInTheDocument();
        });
    });
});