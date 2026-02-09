import { render, screen, fireEvent, waitFor, within } from '../../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { UserForm } from './UserForm';
import type { Group } from '../../api/users.dto';

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

const mockAllGroups: Group[] = [
    { id: 1, name: 'group1', description: 'desc1', built_in: false, created_at: '2023-01-01', roles: [] },
    { id: 2, name: 'group2', description: 'desc2', built_in: false, created_at: '2023-01-01', roles: [] },
];

const mockUser = {
    id: 1,
    login: 'testuser',
    name: 'Test User',
    password: '',
    is_active: true,
    type: 'local' as const,
    groups: [mockAllGroups[0]!],
    created_at: '2023-01-01',
    ldap_id: null,
    ldap_dn: null
};

describe('UserForm', () => {
    const commonProps = {
        onSubmit: vi.fn(),
        allGroups: mockAllGroups,
    };

    const authHookValue = {
        user: { name: 'test' },
        permissions: ['users:create', 'users:update'],
        loading: false,
        logout: vi.fn(),
    };

    // Хелпер для переопределения разрешений
    const getAuthHookValue = (perms: string[]) => ({
        ...authHookValue,
        permissions: perms,
    });

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Create Mode', () => {
        it('should submit the form with valid data', async () => {
            render(<UserForm {...commonProps} />, { authHookValue: getAuthHookValue(['users:create']) });

            // Ключи: user_management.users.form.login, user_management.users.form.name, user_management.users.form.password
            fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.users.form.login')), { target: { value: 'newuser' } });
            fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.users.form.name')), { target: { value: 'New User' } });
            fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.users.form.password')), { target: { value: 'password123' } });

            // Назначаем группу
            const transferList = screen.getByTestId('groups-transfer-list');
            const availableList = within(transferList).getByTestId('transfer-list-available');
            const group2Chip = within(availableList).getByTestId('chip-group2');
            fireEvent.click(group2Chip);

            await waitFor(() => {
                const assignedList = within(transferList).getByTestId('transfer-list-assigned');
                expect(within(assignedList).getByTestId('chip-group2')).toBeInTheDocument();
            });

            // Ключ: user_management.users.form.create_user
            fireEvent.click(screen.getByRole('button', { name: 'user_management.users.form.create_user' }));

            await waitFor(() => {
                expect(commonProps.onSubmit).toHaveBeenCalledWith(
                    expect.objectContaining({
                        login: 'newuser',
                        name: 'New User',
                        password: 'password123',
                        groups: [2]
                    }),
                    expect.anything()
                );
            });
        });

        it('should display validation errors for required fields', async () => {
            render(<UserForm {...commonProps} />, { authHookValue: getAuthHookValue(['users:create']) });

            // Запускаем валидацию, тронув поле и отправив форму
            fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.users.form.password')), { target: { value: 'p' } });
            fireEvent.click(screen.getByRole('button', { name: 'user_management.users.form.create_user' }));

            await waitFor(() => {
                // Сообщения валидации захардкожены в Zod схеме компонента, поэтому проверяем английские строки.
                expect(screen.getByText(/Login is required/i)).toBeInTheDocument();
                expect(screen.getByText(/Name is required/i)).toBeInTheDocument();
            });

            expect(commonProps.onSubmit).not.toHaveBeenCalled();
        });

        it('should have a disabled submit button if user lacks create permission', () => {
            render(<UserForm {...commonProps} />, { authHookValue: getAuthHookValue([]) });
            expect(screen.getByRole('button', { name: 'user_management.users.form.create_user' })).toBeDisabled();
        });
    });

    describe('Edit Mode', () => {
        const editProps = {
            ...commonProps,
            defaultValues: mockUser,
        };

        it('should render with default values', async () => {
            render(<UserForm {...editProps} />, { authHookValue: getAuthHookValue(['users:update']) });

            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.login'))).toHaveValue('testuser');
            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.name'))).toHaveValue('Test User');
            // Пароль должен быть пустым в режиме редактирования
            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.password'))).toHaveValue('');

            // Проверяем, что group1 назначена
            const transferList = screen.getByTestId('groups-transfer-list');
            const assignedList = within(transferList).getByTestId('transfer-list-assigned');
            await waitFor(() => {
                expect(within(assignedList).getByText('group1')).toBeInTheDocument();
            });
        });

        it('should have submit button disabled if form is not dirty', () => {
            render(<UserForm {...editProps} />, { authHookValue: getAuthHookValue(['users:update']) });
            // Ключ: user_management.users.form.save_changes
            expect(screen.getByRole('button', { name: 'user_management.users.form.save_changes' })).toBeDisabled();
        });

        it('should have a disabled submit button if user lacks update permission', () => {
            render(<UserForm {...editProps} />, { authHookValue: getAuthHookValue([]) });

            fireEvent.change(screen.getByLabelText((content) => content.includes('user_management.users.form.name')), { target: { value: 'A New Name' } });

            expect(screen.getByRole('button', { name: 'user_management.users.form.save_changes' })).toBeDisabled();
        });
    });

    describe('View Only Mode', () => {
        it('should disable all fields and button when isViewOnly is true', () => {
            const props = {
                ...commonProps,
                defaultValues: mockUser,
                isViewOnly: true,
            };
            render(<UserForm {...props} />, { authHookValue: getAuthHookValue(['users:update']) });

            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.login'))).toBeDisabled();
            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.name'))).toBeDisabled();
            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.password'))).toBeDisabled();

            // Для переключателя проверяем input. Ключ: user_management.users.form.is_active
            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.is_active'))).toBeDisabled();

            expect(screen.getByRole('button', { name: 'user_management.users.form.save_changes' })).toBeDisabled();
        });
    });

    describe('Built-in User Mode', () => {
        it('should disable restricted fields for built-in user', () => {
            const builtInUser = { ...mockUser, type: 'built_in' as const };
            render(<UserForm {...commonProps} defaultValues={builtInUser} />, { authHookValue: getAuthHookValue(['users:update']) });

            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.login'))).toBeDisabled();
            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.name'))).toBeDisabled();
            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.is_active'))).toBeDisabled();

            // Пароль редактируем для встроенных пользователей (проверено в UserForm.tsx)
            expect(screen.getByLabelText((content) => content.includes('user_management.users.form.password'))).not.toBeDisabled();
        });
    });
});
