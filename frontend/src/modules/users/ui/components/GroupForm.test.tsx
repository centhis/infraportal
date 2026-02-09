import { render, screen, fireEvent, waitFor, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { GroupForm } from './GroupForm';
import type { Role, User, Group } from '../../api/users.dto';

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

const mockAllRoles: Role[] = [
    { id: 1, name: 'role1', description: 'Role One', permissions: [], built_in: false, created_at: '2023-01-01' },
    { id: 2, name: 'role2', description: 'Role Two', permissions: [], built_in: false, created_at: '2023-01-01' },
    { id: 3, name: 'role3', description: 'Role Three', permissions: [], built_in: false, created_at: '2023-01-01' },
];

const mockAllUsers: User[] = [
    { id: 1, name: 'user1', login: 'user1', is_active: true, type: 'local', groups: [], created_at: '2023-01-01', ldap_id: null, ldap_dn: null },
    { id: 2, name: 'user2', login: 'user2', is_active: true, type: 'local', groups: [], created_at: '2023-01-01', ldap_id: null, ldap_dn: null },
];

describe('GroupForm', () => {
    const commonProps = {
        onSubmit: vi.fn(),
        allRoles: mockAllRoles,
        allUsers: mockAllUsers,
    };

    const authHookValue = {
        user: { name: 'test' },
        permissions: ['users:create', 'users:update'],
        loading: false,
        logout: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render all roles in the "Available" list by default', async () => {
        render(<GroupForm {...commonProps} />, { authHookValue });

        const rolesTransferList = screen.getByTestId('roles-transfer-list');
        const availableRolesList = within(rolesTransferList).getByTestId('transfer-list-available');

        await waitFor(() => {
            expect(within(availableRolesList).getByText('role1')).toBeInTheDocument();
            expect(within(availableRolesList).getByText('role2')).toBeInTheDocument();
            expect(within(availableRolesList).getByText('role3')).toBeInTheDocument();
        });

        const assignedRolesList = within(rolesTransferList).getByTestId('transfer-list-assigned');
        expect(within(assignedRolesList).queryByText('role1')).not.toBeInTheDocument();
    });

    it('should move a role to the assigned list on click and submit', async () => {
        const mockOnSubmit = vi.fn();
        render(<GroupForm {...commonProps} onSubmit={mockOnSubmit} />, { authHookValue });

        const rolesTransferList = screen.getByTestId('roles-transfer-list');
        const availableRolesList = within(rolesTransferList).getByTestId('transfer-list-available');

        // Заполняем форму
        // Ключ лейбла: user_management.groups.form.name
        // Мы можем искать textbox по тексту лейбла, который будет ключом
        const nameInput = screen.getByLabelText((content) => content.includes('user_management.groups.form.name'));
        fireEvent.change(nameInput, { target: { value: 'New Group' } });

        // Находим и кликаем на чип 'role2' в списке доступных - используем специфичный data-testid
        const role2Chip = within(availableRolesList).getByTestId('chip-role2');
        fireEvent.click(role2Chip);

        // Проверяем, что он переместился в список назначенных - повторный запрос внутри waitFor
        await waitFor(() => {
            const assignedList = within(screen.getByTestId('roles-transfer-list')).getByTestId('transfer-list-assigned');
            expect(within(assignedList).getByText('role2')).toBeInTheDocument();
        });

        // Проверяем, что он исчез из доступных
        await waitFor(() => {
            const availableList = within(screen.getByTestId('roles-transfer-list')).getByTestId('transfer-list-available');
            expect(within(availableList).queryByText('role2')).not.toBeInTheDocument();
        });

        // Отправляем форму
        // Ключ кнопки: user_management.groups.form.create_group
        fireEvent.click(screen.getByRole('button', { name: 'user_management.groups.form.create_group' }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledTimes(1);
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'New Group',
                    roles: [2], // ID роли 'role2'
                }),
                expect.anything()
            );
        });
    });

    it('should start with pre-assigned roles and allow moving one back', async () => {
        const defaultValues: Group = {
            id: 1,
            name: 'Edit Group',
            description: 'Edit description',
            roles: [{ id: 1, name: 'role1', permissions: [], description: 'Role One', built_in: false, created_at: '2023-01-01' }],
            users: [],
            built_in: false,
            created_at: '2023-01-01'
        };
        const mockOnSubmit = vi.fn();
        render(<GroupForm {...commonProps} defaultValues={defaultValues} onSubmit={mockOnSubmit} />, { authHookValue });

        // Проверяем начальное состояние
        await waitFor(() => {
            const initialAssigned = within(screen.getByTestId('roles-transfer-list')).getByTestId('transfer-list-assigned');
            expect(within(initialAssigned).getByText('role1')).toBeInTheDocument();
        });

        const rolesTransferList = screen.getByTestId('roles-transfer-list');
        const assignedRolesList = within(rolesTransferList).getByTestId('transfer-list-assigned');

        // Кликаем по чипу в списке назначенных, чтобы вернуть его обратно
        const role1Chip = within(assignedRolesList).getByTestId('chip-role1');
        fireEvent.click(role1Chip);

        // Проверяем, что он вернулся обратно
        await waitFor(() => {
            const availableList = within(screen.getByTestId('roles-transfer-list')).getByTestId('transfer-list-available');
            expect(within(availableList).getByText('role1')).toBeInTheDocument();
        });

        await waitFor(() => {
            const assignedList = within(screen.getByTestId('roles-transfer-list')).getByTestId('transfer-list-assigned');
            expect(within(assignedList).queryByText('role1')).not.toBeInTheDocument();
        });

        // Отправляем форму
        // Ключ кнопки: user_management.groups.form.save_changes
        fireEvent.click(screen.getByRole('button', { name: 'user_management.groups.form.save_changes' }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    roles: [], // 'role1' была возвращена обратно
                }),
                expect.anything()
            );
        });
    });

    it('should allow editing custom members for built-in group', async () => {
        const defaultValues: Group = {
            id: 1,
            name: 'Admin Group',
            built_in: true,
            roles: [{ id: 1, name: 'role1', permissions: [], description: 'Role One', built_in: false, created_at: '2023-01-01' }],
            built_in_role_ids: [1], // role1 является встроенной для этой группы
            users: [],
            description: '',
            created_at: '2023-01-01'
        };
        const mockOnSubmit = vi.fn();
        render(<GroupForm {...commonProps} defaultValues={defaultValues} onSubmit={mockOnSubmit} />, { authHookValue });

        // Проверяем поля формы по ключам
        expect(screen.getByLabelText((content) => content.includes('user_management.groups.form.name'))).toBeDisabled();
        expect(screen.getByLabelText((content) => content.includes('user_management.groups.form.description'))).toBeDisabled();

        const rolesTransferList = screen.getByTestId('roles-transfer-list');
        const availableRolesList = within(rolesTransferList).getByTestId('transfer-list-available');

        // Пытаемся кликнуть role2, чтобы добавить её (это кастомная роль)
        const role2Chip = within(availableRolesList).getByTestId('chip-role2');
        fireEvent.click(role2Chip);

        // Она ДОЛЖНА переместиться, так как редактирование разрешено
        const assignedRolesList = within(rolesTransferList).getByTestId('transfer-list-assigned');

        await waitFor(() => {
            expect(within(assignedRolesList).getByText('role2')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: 'user_management.groups.form.save_changes' })).toBeEnabled();
    });
});
