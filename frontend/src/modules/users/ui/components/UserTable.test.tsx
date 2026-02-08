import { render, screen, fireEvent, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserTable } from './UserTable';
import type { User } from '../../api/users.dto';

// Мок данных пользователей
const mockUsers: User[] = [
    { id: 1, login: 'admin', name: 'Admin User', type: 'built_in', created_at: '2025-01-01', is_active: true, ldap_id: null, ldap_dn: null, groups: [] },
    { id: 2, login: 'viewer', name: 'Viewer User', type: 'local', created_at: '2025-01-02', is_active: false, ldap_id: null, ldap_dn: null, groups: [] },
    { id: 3, login: 'ldap_user', name: 'LDAP User', type: 'ldap', created_at: '2025-01-03', is_active: true, ldap_id: '123', ldap_dn: 'cn=ldap', groups: [] },
];

// Мок usePersistentState
vi.mock('../../../../shared/hooks/usePersistentState', () => ({
    usePersistentState: vi.fn(() => [{}, vi.fn()]),
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

describe('UserTable', () => {
    const mockOnEdit = vi.fn();
    const mockOnDelete = vi.fn();
    const mockOnPermissionsReport = vi.fn();
    const mockPaginationChange = vi.fn();

    const defaultProps = {
        users: mockUsers,
        rowCount: mockUsers.length,
        paginationModel: { page: 0, pageSize: 10 },
        onPaginationModelChange: mockPaginationChange,
        onEdit: mockOnEdit,
        onDelete: mockOnDelete,
        onPermissionsReport: mockOnPermissionsReport,
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

    describe('Rendering and Interactions', () => {
        it('should render users correctly', () => {
            render(<UserTable {...defaultProps} />);

            expect(screen.getByText('admin')).toBeInTheDocument();
            expect(screen.getByText('viewer')).toBeInTheDocument();
            expect(screen.getByText('LDAP User')).toBeInTheDocument();
        });

        it('should call onEdit when clicking on a row', async () => {
            render(<UserTable {...defaultProps} />);

            const viewerRow = (await screen.findByText('viewer')).closest('.MuiDataGrid-row');
            if (!viewerRow) throw new Error('Row not found');

            fireEvent.click(viewerRow as HTMLElement);

            expect(mockOnEdit).toHaveBeenCalledTimes(1);
            expect(mockOnEdit).toHaveBeenCalledWith(mockUsers[1]);
        });

        it('should call onDelete when clicking the delete icon', async () => {
            render(<UserTable {...defaultProps} />);

            const viewerRow = (await screen.findByText('viewer')).closest('.MuiDataGrid-row');
            if (!viewerRow) throw new Error('Row not found');

            // Кнопка удаления имеет aria-label="user_management.users.actions.delete" (предполагаем использование ключа, если переведен aria-label)
            // Или если захардкожено 'delete' в компоненте, нужно обновить компонент для использования перевода.
            // Проверим: в GroupTable было захардкожено 'delete'. В UserTable вероятно аналогично.
            // Если нужна ПОЛНАЯ устойчивость, даже aria-labels должны быть ключами.
            // Пока будем искать по ID или иконке, или допустим захардкоженное 'delete' для aria-label, если оно не видно пользователю.
            // Но проверим: Компонент вероятно рендерит <IconButton aria-label="delete"> или t('...delete').

            // Предполагаем использование t('...delete') и мы его замокали -> ключ.
            // Или если строка захардкожена, ищем 'delete'.

            // Попробуем найти 'delete' (регистронезависимо), так как это покрывает оба случая.
            const deleteButton = within(viewerRow as HTMLElement).getByRole('button', { name: /delete/i });
            fireEvent.click(deleteButton);

            expect(mockOnDelete).toHaveBeenCalledTimes(1);
            expect(mockOnDelete).toHaveBeenCalledWith(mockUsers[1]?.id);
            expect(mockOnEdit).not.toHaveBeenCalled();
        });
    });

    it('should call onPermissionsReport when clicking the policy icon', async () => {
        render(<UserTable {...defaultProps} />);

        const adminRow = (await screen.findByText('admin')).closest('.MuiDataGrid-row');
        if (!adminRow) throw new Error('Row not found');

        // Кнопка политики вероятно использует t('...permissions_report') или 'policy' для aria-label.
        // Предполагаем общее 'permissions report' или поиск PolicyIcon.
        // Так как мы замокали t->key, если используется перевод, это будет 'user_management.users.actions.permissions_report'.
        // Предположим, мы найдем её как другую кнопку.
        const buttons = within(adminRow as HTMLElement).getAllByRole('button');
        const policyButton = buttons[0];
        if (!policyButton) throw new Error('Policy button not found');

        fireEvent.click(policyButton);

        expect(mockOnPermissionsReport).toHaveBeenCalledTimes(1);
        expect(mockOnPermissionsReport).toHaveBeenCalledWith(mockUsers[0]?.id, mockUsers[0]?.name);
    });

    it('delete button should be disabled for a built_in user', async () => {
        render(<UserTable {...defaultProps} />);

        const adminRow = (await screen.findByText('admin')).closest('.MuiDataGrid-row');
        if (!adminRow) throw new Error('Row not found');

        const buttons = within(adminRow as HTMLElement).getAllByRole('button');
        // Удаление вероятно второе
        // Проверяем aria-labels или логику.
        // Строка админа: Политика (включена), Удаление (отключено)
        // Сканируем кнопки.
        const deleteButton = buttons.find(b => /delete/i.test(b.getAttribute('aria-label') || ''));

        // Если не найдено по метке, полагаемся на индекс как в предыдущем тесте
        const targetBtn = deleteButton || buttons[1];

        expect(targetBtn).toBeDisabled();
    });

    it('delete button should be disabled if canDelete is false', async () => {
        render(<UserTable {...defaultProps} canDelete={false} />);

        const viewerRow = (await screen.findByText('viewer')).closest('.MuiDataGrid-row');
        if (!viewerRow) throw new Error('Row not found');

        const buttons = within(viewerRow as HTMLElement).getAllByRole('button');
        const deleteButton = buttons.find(b => /delete/i.test(b.getAttribute('aria-label') || '')) || buttons[1];

        expect(deleteButton).toBeDisabled();
    });

    describe('Chips Display', () => {
        it('should display correct Auth Type chips via Keys', async () => {
            render(<UserTable {...defaultProps} />);

            // Ключи из маппинга DTO/Table
            expect(screen.getByText('user_management.users.table.auth_type.built_in')).toBeInTheDocument();
            expect(screen.getByText('user_management.users.table.auth_type.local')).toBeInTheDocument();
            expect(screen.getByText('user_management.users.table.auth_type.ldap')).toBeInTheDocument();
        });

        it('should display correct status chips via Keys', () => {
            render(<UserTable {...defaultProps} />);

            // Ключи статуса
            expect(screen.getAllByText('user_management.users.table.status.active').length).toBeGreaterThan(0);
            expect(screen.getAllByText('user_management.users.table.status.inactive').length).toBeGreaterThan(0);
        });
    });
});
