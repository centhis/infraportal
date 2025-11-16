import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import UserTable from './UserTable';

// Mock the translation hook
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key, // Returns the key itself for testing
    }),
}));

// Mock the persistent state hook
vi.mock('../hooks/usePersistentState', () => ({
    __esModule: true,
    default: vi.fn((key, initialValue) => [initialValue, vi.fn()]),
}));

// Completely mock the @mui/x-data-grid module without using importOriginal
vi.mock('@mui/x-data-grid', () => {
    const MockDataGrid = (props) => {
        // Render a simplified version of the grid for testing
        return (
            <div data-testid="mock-datagrid">
                {props.rows.map(row => (
                    <div key={row.id}>
                        <span>{row.login}</span>
                        {/* Find the actions column and render its cell for each row */}
                        {props.columns.find(c => c.field === 'actions')?.renderCell({ row })}
                    </div>
                ))}
                {/* Mock pagination control */}
                <button onClick={() => props.onPaginationModelChange({ page: 1, pageSize: 5 })}>
                    Next Page
                </button>
            </div>
        );
    };
    return {
        DataGrid: MockDataGrid,
        GridActionsCellItem: (props) => <button onClick={props.onClick}>{props.label}</button>,
        gridClasses: { // Provide mock classes to prevent errors
            columnHeader: 'mock-column-header',
            cell: 'mock-cell',
            row: 'mock-row',
        }
    };
});


describe('UserTable', () => {
    const mockUsers = [
        { id: 1, login: 'testuser1', name: 'Test User One', auth_type: 'local', created_at: '2025-01-01', is_active: true },
        { id: 2, login: 'testuser2', name: 'Test User Two', auth_type: 'ldap', created_at: '2025-01-02', is_active: false },
    ];

    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnPaginationModelChange = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render user data and action buttons in the mocked grid', () => {
        render(
            <UserTable 
                users={mockUsers}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockUsers.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={mockOnPaginationModelChange}
            />
        );

        expect(screen.getByTestId('mock-datagrid')).toBeInTheDocument();
        expect(screen.getByText('testuser1')).toBeInTheDocument();
        expect(screen.getByText('testuser2')).toBeInTheDocument();

        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
        expect(editButtons).toHaveLength(mockUsers.length);
        expect(deleteButtons).toHaveLength(mockUsers.length);
    });

    it('should call onEdit and onDelete when action buttons are clicked', () => {
        render(
            <UserTable 
                users={mockUsers}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockUsers.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={mockOnPaginationModelChange}
            />
        );

        const editButtons = screen.getAllByRole('button', { name: /edit/i });
        const deleteButtons = screen.getAllByRole('button', { name: /delete/i });

        fireEvent.click(editButtons[0]);
        expect(mockOnEdit).toHaveBeenCalledWith(mockUsers[0]);

        fireEvent.click(deleteButtons[0]);
        expect(mockOnDelete).toHaveBeenCalledWith(mockUsers[0].id);
    });

    it('should call onPaginationModelChange when pagination changes in the grid', () => {
        render(
            <UserTable 
                users={mockUsers}
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={mockUsers.length}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={mockOnPaginationModelChange}
            />
        );

        const nextPageButton = screen.getByRole('button', { name: 'Next Page' });
        fireEvent.click(nextPageButton);

        expect(mockOnPaginationModelChange).toHaveBeenCalledWith({ page: 1, pageSize: 5 });
        expect(mockOnPaginationModelChange).toHaveBeenCalledTimes(1);
    });

    it('should render correctly when no users are provided', () => {
        render(
            <UserTable 
                users={[]} // Empty array
                onEdit={mockOnEdit}
                onDelete={mockOnDelete}
                rowCount={0}
                paginationModel={{ page: 0, pageSize: 5 }}
                onPaginationModelChange={mockOnPaginationModelChange}
            />
        );

        expect(screen.getByTestId('mock-datagrid')).toBeInTheDocument();
        // Assert that no user-specific data is present
        expect(screen.queryByText('testuser1')).not.toBeInTheDocument();
        expect(screen.queryByText('Test User One')).not.toBeInTheDocument();

        // Assert that pagination controls are still present (from the mock)
        expect(screen.getByRole('button', { name: 'Next Page' })).toBeInTheDocument();
    });
});
