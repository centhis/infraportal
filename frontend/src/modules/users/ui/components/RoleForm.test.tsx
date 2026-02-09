import { render, screen, fireEvent, waitFor, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { RoleForm } from './RoleForm';
import type { Role, Permission } from '../../api/users.dto';

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

const mockAllPermissions: Permission[] = [
    { id: 1, name: 'users:view', description: 'View users', built_in: false, created_at: '2023-01-01' },
    { id: 2, name: 'users:create', description: 'Create users', built_in: false, created_at: '2023-01-01' },
    { id: 3, name: 'users:update', description: 'Update users', built_in: false, created_at: '2023-01-01' },
];

describe('RoleForm', () => {
    const commonProps = {
        onSubmit: vi.fn(),
        allPermissions: mockAllPermissions,
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

    it('should render correctly in create mode', async () => {
        render(<RoleForm {...commonProps} />, { authHookValue });

        // Проверка наличия ключей в labels/aria-labels
        expect(screen.getByLabelText((content) => content.includes('user_management.roles.form.name'))).toBeInTheDocument();
        expect(screen.getByLabelText((content) => content.includes('user_management.roles.form.description'))).toBeInTheDocument();

        // Проверяем наличие TransferList по data-testid
        expect(screen.getByTestId('transfer-list-available')).toBeInTheDocument();
        expect(screen.getByTestId('transfer-list-assigned')).toBeInTheDocument();

        expect(screen.getByRole('button', { name: 'user_management.roles.form.create_role' })).toBeInTheDocument();
    });

    it('should submit the form with valid data in create mode', async () => {
        const mockOnSubmit = vi.fn();
        render(<RoleForm {...commonProps} onSubmit={mockOnSubmit} />, { authHookValue });

        const nameInput = screen.getByLabelText((content) => content.includes('user_management.roles.form.name'));
        fireEvent.change(nameInput, { target: { value: 'New Role' } });

        const descInput = screen.getByLabelText((content) => content.includes('user_management.roles.form.description'));
        fireEvent.change(descInput, { target: { value: 'A new role description.' } });

        // Пользовательское разрешение
        const availableList = screen.getByTestId('transfer-list-available');
        const permissionChip = within(availableList).getByTestId('chip-users:view');
        fireEvent.click(permissionChip);

        // Ждем перемещения
        await waitFor(() => {
            const assignedList = screen.getByTestId('transfer-list-assigned');
            expect(within(assignedList).getByTestId('chip-users:view')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: 'user_management.roles.form.create_role' }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'New Role',
                    description: 'A new role description.',
                    permissions: [1],
                }),
                expect.anything()
            );
        });
    });

    it('should render with default values in edit mode', async () => {
        const defaultValues: Role = {
            id: 10,
            name: 'Edit Role',
            description: 'Edit description',
            permissions: [{ id: 1, name: 'users:view', description: 'View users', built_in: false, created_at: '2023-01-01' }],
            built_in: false,
            created_at: '2023-01-01'
        };
        render(<RoleForm {...commonProps} defaultValues={defaultValues} />, { authHookValue });

        expect(screen.getByLabelText((content) => content.includes('user_management.roles.form.name'))).toHaveValue('Edit Role');
        expect(screen.getByLabelText((content) => content.includes('user_management.roles.form.description'))).toHaveValue('Edit description');
        expect(screen.getByRole('button', { name: 'user_management.roles.form.save_changes' })).toBeInTheDocument();

        // Проверяем, что users:view в списке назначенных
        await waitFor(() => {
            const assignedList = screen.getByTestId('transfer-list-assigned');
            expect(within(assignedList).getByTestId('chip-users:view')).toBeInTheDocument();
        });
    });

    it('should allow editing custom permissions for built-in role', async () => {
        const defaultValues: Role = {
            id: 1,
            name: 'Admin',
            description: null,
            permissions: [{ id: 1, name: 'users:view', description: 'View users', built_in: false, created_at: '2023-01-01' }],
            built_in: true,
            built_in_permission_ids: [1], // users:view является встроенным для этой роли
            created_at: '2023-01-01'
        };
        render(<RoleForm {...commonProps} defaultValues={defaultValues} />, { authHookValue });

        expect(screen.getByLabelText((content) => content.includes('user_management.roles.form.name'))).toBeDisabled();
        expect(screen.getByLabelText((content) => content.includes('user_management.roles.form.description'))).toBeDisabled();

        // TransferList должен быть активен для кастомных прав.
        const availableList = screen.getByTestId('transfer-list-available');
        const permissionChip = within(availableList).getByTestId('chip-users:create'); // Пользовательское разрешение
        fireEvent.click(permissionChip);

        // Оно ДОЛЖНО переместиться в назначенные
        const assignedList = screen.getByTestId('transfer-list-assigned');
        await waitFor(() => {
            expect(within(assignedList).getByTestId('chip-users:create')).toBeInTheDocument();
        });

        expect(screen.getByRole('button', { name: 'user_management.roles.form.save_changes' })).toBeEnabled();
    });
});
