import { render, screen, fireEvent, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RoleTable } from './RoleTable';
import type { Role } from '../../api/users.dto';

// Мокируем хук персистентного состояния
vi.mock('../../../../shared/hooks/usePersistentState', () => ({
    usePersistentState: vi.fn((_key, initialValue) => [initialValue, vi.fn()]),
}));

// Мокаем переводы для возврата ключей
vi.mock('react-i18next', async () => {
    const original = await vi.importActual('react-i18next');
    return {
        ...original,
        useTranslation: () => ({
            t: (key: string) => key,
        }),
    };
});

describe('RoleTable', () => {
    const mockRoles: Role[] = [
        {
            id: 1,
            name: 'Admin',
            description: 'Admin role',
            built_in: true,
            created_at: '2025-01-01',
            permissions: [
                { id: 1, name: 'p1', description: 'd1', built_in: true, created_at: '2023-01-01' },
                { id: 2, name: 'p2', description: 'd2', built_in: true, created_at: '2023-01-01' }
            ]
        },
        {
            id: 2,
            name: 'Viewer',
            description: 'Viewer role',
            built_in: false,
            created_at: '2025-01-02',
            permissions: [
                { id: 3, name: 'p3', description: 'd3', built_in: false, created_at: '2023-01-01' }
            ]
        },
    ];

    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    const defaultProps = {
        roles: mockRoles,
        onEdit: mockOnEdit,
        onDelete: mockOnDelete,
        rowCount: mockRoles.length,
        paginationModel: { page: 0, pageSize: 5 },
        onPaginationModelChange: vi.fn(),
        canDelete: true,
        filters: {},
        onFiltersChange: vi.fn(),
        columnVisibilityModel: {},
        onColumnVisibilityModelChange: vi.fn(),
        sortModel: [],
        onSortModelChange: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render role names and descriptions', async () => {
        render(<RoleTable {...defaultProps} />);
        expect(await screen.findByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Viewer')).toBeInTheDocument();
        expect(screen.getByText('Admin role')).toBeInTheDocument();
    });

    it('should call onEdit when a row is clicked', async () => {
        render(<RoleTable {...defaultProps} />);
        // Строка идентифицируется по роли и атрибуту name
        fireEvent.click(await screen.findByRole('row', { name: /Admin/i }));
        expect(mockOnEdit).toHaveBeenCalledTimes(1);
        expect(mockOnEdit).toHaveBeenCalledWith(mockRoles[0]);
    });

    it('should call onDelete and stop propagation when delete icon is clicked', async () => {
        render(<RoleTable {...defaultProps} />);

        // Находим строку для не встроенной роли
        const viewerRow = (await screen.findByText('Viewer')).closest('.MuiDataGrid-row');
        expect(viewerRow).not.toBeNull();

        if (viewerRow) {
            // Находим кнопку удаления внутри строки и кликаем
            const deleteButton = within(viewerRow as HTMLElement).getByRole('button', { name: /delete/i });
            fireEvent.click(deleteButton);

            expect(mockOnDelete).toHaveBeenCalledTimes(1);
            expect(mockOnDelete).toHaveBeenCalledWith(mockRoles[1]?.id);

            // Проверяем, что onRowClick (который триггерит onEdit) НЕ был вызван
            expect(mockOnEdit).not.toHaveBeenCalled();
        }
    });

    it('should have a disabled delete button for a built-in role', async () => {
        render(<RoleTable {...defaultProps} />);

        // Находим строку для встроенной роли
        const adminRow = (await screen.findByText('Admin')).closest('.MuiDataGrid-row');
        expect(adminRow).not.toBeNull();

        if (adminRow) {
            // Находим кнопку удаления внутри строки и проверяем, что она отключена
            const deleteButton = within(adminRow as HTMLElement).getByRole('button', { name: /delete/i });
            expect(deleteButton).toBeDisabled();
        }
    });

    it('should display "Built-in" key for a built-in role', async () => {
        render(<RoleTable {...defaultProps} />);

        const adminRow = (await screen.findByText('Admin')).closest('.MuiDataGrid-row');
        // Ключ перевода: user_management.roles.table.type_built_in
        expect(within(adminRow as HTMLElement).getByText('user_management.roles.table.type_built_in')).toBeInTheDocument();
    });

    it('should display "Custom" key for a custom role', async () => {
        render(<RoleTable {...defaultProps} />);

        const viewerRow = (await screen.findByText('Viewer')).closest('.MuiDataGrid-row');
        // Ключ перевода: user_management.roles.table.type_custom
        expect(within(viewerRow as HTMLElement).getByText('user_management.roles.table.type_custom')).toBeInTheDocument();
    });
});
