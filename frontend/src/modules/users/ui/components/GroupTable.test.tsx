import { render, screen, fireEvent, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GroupTable } from './GroupTable';
import type { Group } from '../../api/users.dto';

// Мок зависимостей
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

describe('GroupTable', () => {
    const mockGroups: Group[] = [
        {
            id: 1,
            name: 'Admins',
            description: 'Admin group',
            built_in: true,
            created_at: '2025-01-01',
            roles: [
                { id: 1, name: 'admin_role', description: 'Admin Role', permissions: [], built_in: false, created_at: '2023-01-01' },
                { id: 2, name: 'viewer_role', description: 'Viewer Role', permissions: [], built_in: false, created_at: '2023-01-01' }
            ]
        },
        {
            id: 2,
            name: 'Developers',
            description: 'Developer group',
            built_in: false,
            created_at: '2025-01-02',
            roles: [
                { id: 3, name: 'dev_role', description: 'Dev Role', permissions: [], built_in: false, created_at: '2023-01-01' }
            ]
        },
    ];

    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();

    const defaultProps = {
        groups: mockGroups,
        onEdit: mockOnEdit,
        onDelete: mockOnDelete,
        rowCount: mockGroups.length,
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

    it('should render group names and descriptions', async () => {
        render(<GroupTable {...defaultProps} />);
        expect(await screen.findByText('Admins')).toBeInTheDocument();
        expect(screen.getByText('Developers')).toBeInTheDocument();
        expect(screen.getByText('Admin group')).toBeInTheDocument();
    });

    it('should call onEdit when a row is clicked', async () => {
        render(<GroupTable {...defaultProps} />);
        fireEvent.click(await screen.findByRole('row', { name: /Admins/i }));
        expect(mockOnEdit).toHaveBeenCalledTimes(1);
        expect(mockOnEdit).toHaveBeenCalledWith(mockGroups[0]);
    });

    it('should call onDelete when delete icon is clicked', async () => {
        render(<GroupTable {...defaultProps} />);
        // Убеждаемся, что строка отрендерена
        const developerRow = (await screen.findByText('Developers')).closest('.MuiDataGrid-row');
        expect(developerRow).not.toBeNull();

        if (developerRow) {
            const deleteButton = within(developerRow as HTMLElement).getByRole('button', { name: /delete/i });
            fireEvent.click(deleteButton);

            expect(mockOnDelete).toHaveBeenCalledTimes(1);
            expect(mockOnDelete).toHaveBeenCalledWith(mockGroups[1]?.id);
            expect(mockOnEdit).not.toHaveBeenCalled();
        }
    });

    it('should have a disabled delete button for a built-in group', async () => {
        render(<GroupTable {...defaultProps} />);
        const adminRow = (await screen.findByText('Admins')).closest('.MuiDataGrid-row');
        expect(adminRow).not.toBeNull();

        if (adminRow) {
            const deleteButton = within(adminRow as HTMLElement).getByRole('button', { name: /delete/i });
            expect(deleteButton).toBeDisabled();
        }
    });

    it('should display "Built-in" key for a built-in group', async () => {
        render(<GroupTable {...defaultProps} />);
        const adminRow = (await screen.findByText('Admins')).closest('.MuiDataGrid-row');
        // Ключ перевода: user_management.groups.table.type_built_in
        expect(within(adminRow as HTMLElement).getByText('user_management.groups.table.type_built_in')).toBeInTheDocument();
    });

    it('should display "Custom" key for a custom group', async () => {
        render(<GroupTable {...defaultProps} />);
        const developerRow = (await screen.findByText('Developers')).closest('.MuiDataGrid-row');
        // Ключ перевода: user_management.groups.table.type_custom
        expect(within(developerRow as HTMLElement).getByText('user_management.groups.table.type_custom')).toBeInTheDocument();
    });
});
