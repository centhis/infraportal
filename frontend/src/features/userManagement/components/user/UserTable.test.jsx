import { render, screen, fireEvent, within } from '@testing-library/react';
import { vi } from 'vitest';

import UserTable from './UserTable';

// Мокаем i18n, так как прямой импорт вызывал проблемы
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key, // Просто возвращаем ключ, как обычно делают моки
    }),
}));

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
        it('должен вызывать onEdit при клике на строку', async () => {
            render(
                <UserTable 
                    users={mockUsers}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                    rowCount={mockUsers.length}
                    paginationModel={{ page: 0, pageSize: 5 }}
                    onPaginationModelChange={() => {}}
                />
            );
    
            const viewerRow = await screen.findByText('viewer');
            fireEvent.click(viewerRow.closest('.MuiDataGrid-row'));
    
            expect(mockOnEdit).toHaveBeenCalledTimes(1);
            expect(mockOnEdit).toHaveBeenCalledWith(mockUsers[1]);
            expect(mockOnDelete).not.toHaveBeenCalled();
        });
    
        it('должен вызывать onDelete при клике на иконку удаления', async () => {
            render(
                <UserTable 
                    users={mockUsers}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                    rowCount={mockUsers.length}
                    paginationModel={{ page: 0, pageSize: 5 }}
                    onPaginationModelChange={() => {}}
                />
            );
    
            const viewerRow = (await screen.findByText('viewer')).closest('.MuiDataGrid-row');
            const deleteButton = within(viewerRow).getByRole('button', { name: /delete/i });
            fireEvent.click(deleteButton);
    
            expect(mockOnDelete).toHaveBeenCalledTimes(1);
            expect(mockOnDelete).toHaveBeenCalledWith(mockUsers[1].id);
            expect(mockOnEdit).not.toHaveBeenCalled();
        });

        it('кнопка удаления должна быть заблокирована для built_in пользователя', async () => {
            render(
                <UserTable
                    users={mockUsers}
                    onEdit={mockOnEdit}
                    onDelete={mockOnDelete}
                    rowCount={mockUsers.length}
                    paginationModel={{ page: 0, pageSize: 5 }}
                    onPaginationModelChange={() => {}}
                />
            );

            const adminRow = (await screen.findByText('admin')).closest('.MuiDataGrid-row');
            const deleteButton = within(adminRow).getByRole('button', { name: /delete/i });
            expect(deleteButton).toBeDisabled();
        });
    });

    describe('Отображение', () => {
        beforeEach(() => {
            render(
                <UserTable 
                    users={mockUsers}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    rowCount={mockUsers.length}
                    paginationModel={{ page: 0, pageSize: 5 }}
                    onPaginationModelChange={() => {}}
                />
            );
        });

        it('должен отображать "Встроенная" для built_in пользователя', async () => {
            const adminRow = (await screen.findByText('admin')).closest('.MuiDataGrid-row');
            const chip = within(adminRow).getByText('user_management.users.table.auth_type.built_in');
            expect(chip).toBeInTheDocument();
        });

        it('должен отображать "Локальная" для local пользователя', async () => {
            const viewerRow = (await screen.findByText('viewer')).closest('.MuiDataGrid-row');
            const chip = within(viewerRow).getByText('user_management.users.table.auth_type.local');
            expect(chip).toBeInTheDocument();
        });

        it('должен отображать "LDAP" для ldap пользователя', async () => {
            const ldapRow = (await screen.findByText('ldap_user')).closest('.MuiDataGrid-row');
            const chip = within(ldapRow).getByText('user_management.users.table.auth_type.ldap');
            expect(chip).toBeInTheDocument();
        });
    });
});