import { render, screen, fireEvent, waitFor, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RoleTabPage } from './RoleTabPage';
import * as useRolesHooks from '../hooks/useRoles';
import * as usePermissionsListHooks from '../hooks/usePermissionsList';
import * as authHooks from '@core/auth';
import type { Role } from '../../api/users.dto';

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

// Мокируем персистентное состояние для таблицы
vi.mock('../../../../shared/hooks/usePersistentState', () => ({
    usePersistentState: vi.fn((_key, initialValue) => [initialValue, vi.fn()]),
}));

// Мокируем хуки API
const useRolesMock = vi.fn();
const useCreateRoleMock = vi.fn();
const useUpdateRoleMock = vi.fn();
const useDeleteRoleMock = vi.fn();
const usePermissionsListMock = vi.fn();
const usePermissionsMock = vi.fn();

vi.spyOn(useRolesHooks, 'useRoles').mockImplementation(useRolesMock);
vi.spyOn(useRolesHooks, 'useCreateRole').mockImplementation(useCreateRoleMock);
vi.spyOn(useRolesHooks, 'useUpdateRole').mockImplementation(useUpdateRoleMock);
vi.spyOn(useRolesHooks, 'useDeleteRole').mockImplementation(useDeleteRoleMock);
vi.spyOn(usePermissionsListHooks, 'usePermissionsList').mockImplementation(usePermissionsListMock);
vi.spyOn(authHooks, 'usePermissions').mockImplementation(usePermissionsMock);

const mockRoles: Role[] = [
    {
        id: 1,
        name: 'Admin',
        description: 'Admin role',
        built_in: true,
        created_at: '2025-01-01',
        permissions: [{ id: 1, name: 'users:view', description: '', built_in: true, created_at: '' }]
    },
    {
        id: 2,
        name: 'Viewer',
        description: 'Viewer role',
        built_in: false,
        created_at: '2025-01-02',
        permissions: []
    }
];

describe('RoleTabPage', () => {
    const mutateCreate = vi.fn();
    const mutateUpdate = vi.fn();
    const mutateDelete = vi.fn();
    const refetchMock = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        // Дефолтные реализации моков
        useRolesMock.mockReturnValue({
            data: { items: mockRoles, total: 2, page: 1, size: 10, pages: 1 },
            isLoading: false,
            refetch: refetchMock
        });

        usePermissionsListMock.mockReturnValue({
            data: { items: [], total: 0 },
            isLoading: false
        });

        useCreateRoleMock.mockReturnValue({ mutateAsync: mutateCreate });
        useUpdateRoleMock.mockReturnValue({ mutateAsync: mutateUpdate });
        useDeleteRoleMock.mockReturnValue({ mutateAsync: mutateDelete });

        usePermissionsMock.mockReturnValue({
            can: (_perm: string) => true, // По умолчанию разрешаем все
        });
    });

    it('should render loading state', () => {
        useRolesMock.mockReturnValue({ isLoading: true, data: null });
        render(<RoleTabPage />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render the role table with data', async () => {
        render(<RoleTabPage />);
        expect(screen.getByText('Admin')).toBeInTheDocument();
        expect(screen.getByText('Viewer')).toBeInTheDocument();
    });

    it('should open create dialog when "Add Role" is clicked', async () => {
        render(<RoleTabPage />);

        // Ключ кнопки: user_management.roles.actions.add_role_button
        const addButton = screen.getByRole('button', { name: 'user_management.roles.actions.add_role_button' });
        fireEvent.click(addButton);

        // Ключ заголовка диалога: user_management.roles.form.create_title
        expect(await screen.findByRole('heading', { name: 'user_management.roles.form.create_title' })).toBeInTheDocument();
    });

    it('should create a new role', async () => {
        render(<RoleTabPage />);

        fireEvent.click(screen.getByRole('button', { name: 'user_management.roles.actions.add_role_button' }));

        // Заполняем форму
        // Ключи: user_management.roles.form.name
        fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.roles.form.name')), { target: { value: 'New Role' } });

        // Отправляем
        // Ключ: user_management.roles.form.create_role
        fireEvent.click(screen.getByRole('button', { name: 'user_management.roles.form.create_role' }));

        await waitFor(() => {
            expect(mutateCreate).toHaveBeenCalledWith({
                name: 'New Role',
                description: '',
                permissions: [],
            });
        });
    });

    it('should open edit dialog when row is clicked', async () => {
        render(<RoleTabPage />);

        // Клик по строке 'Viewer'
        const row = screen.getByRole('row', { name: /Viewer/ });
        fireEvent.click(row);

        // Ключ заголовка диалога: user_management.roles.form.edit_title
        expect(await screen.findByRole('heading', { name: 'user_management.roles.form.edit_title' })).toBeInTheDocument();

        // Проверяем, что инпут имеет значение
        expect(screen.getByLabelText((content) => content.includes('user_management.roles.form.name'))).toHaveValue('Viewer');
    });

    it('should update an existing role', async () => {
        render(<RoleTabPage />);

        fireEvent.click(screen.getByRole('row', { name: /Viewer/ }));

        const nameInput = await screen.findByLabelText((content) => content.includes('user_management.roles.form.name'));
        fireEvent.change(nameInput, { target: { value: 'Viewer Updated' } });

        // Ключ: user_management.roles.form.save_changes
        fireEvent.click(screen.getByRole('button', { name: 'user_management.roles.form.save_changes' }));

        await waitFor(() => {
            expect(mutateUpdate).toHaveBeenCalledWith({
                roleId: 2,
                data: expect.objectContaining({ name: 'Viewer Updated' })
            });
        });
    });

    it('should open delete confirmation when delete action is clicked', async () => {
        render(<RoleTabPage />);

        // Поиск строки 'Viewer' и клик по кнопке удаления
        // Таблица обычно использует общий значок/метку удаления
        const row = screen.getByRole('row', { name: /Viewer/ });
        const deleteBtn = within(row).getByRole('button', { name: /delete/i });
        fireEvent.click(deleteBtn);

        // Ключ заголовка диалога: user_management.roles.delete_dialog.title
        expect(await screen.findByText('user_management.roles.delete_dialog.title')).toBeInTheDocument();
    });

    it('should delete a role when confirmed', async () => {
        render(<RoleTabPage />);

        const row = screen.getByRole('row', { name: /Viewer/ });
        fireEvent.click(within(row).getByRole('button', { name: /delete/i }));

        // Подтверждаем удаление. Ключ: common.delete
        const confirmBtn = await screen.findByRole('button', { name: 'common.delete' });
        fireEvent.click(confirmBtn);

        await waitFor(() => {
            expect(mutateDelete).toHaveBeenCalledWith(2);
        });
    });

    it('should disable add button if no create permission', () => {
        usePermissionsMock.mockReturnValue({
            can: (_perm: string) => false,
        });
        render(<RoleTabPage />);
        expect(screen.getByRole('button', { name: 'user_management.roles.actions.add_role_button' })).toBeDisabled();
    });
});
