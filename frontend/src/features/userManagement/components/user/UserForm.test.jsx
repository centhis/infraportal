import { render, screen, fireEvent, waitFor } from '../../../../mocks/test-utils';
import { vi } from 'vitest';
import UserForm from './UserForm';

// Mock the TransferList to simplify the UserForm tests
vi.mock('../../../../components/forms/TransferList', () => ({
    __esModule: true,
    default: ({ disabled }) => <div data-testid="mock-transfer-list" data-disabled={String(disabled)}></div>,
}));

const mockAllGroups = [
    { id: 1, name: 'group1' },
    { id: 2, name: 'group2' },
];

const mockUser = {
    id: 1,
    login: 'testuser',
    name: 'Test User',
    is_active: true,
    type: 'local',
    groups: [mockAllGroups[0]],
};

describe('UserForm', () => {
    
    const baseAuthHook = {
        user: { name: 'test' },
        loading: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Create Mode', () => {
        const createProps = {
            onSubmit: vi.fn(),
            allGroups: mockAllGroups,
        };

        it('should submit the form with valid data', async () => {
            const authHookValue = { ...baseAuthHook, permissions: ['users:create'] };
            render(<UserForm {...createProps} />, { authHookValue });

            fireEvent.change(screen.getByLabelText(/login/i), { target: { value: 'newuser' } });
            fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'New User' } });
            fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'password123' } });
            
            fireEvent.click(screen.getByRole('button', { name: /Create User/i }));

            await waitFor(() => {
                expect(createProps.onSubmit).toHaveBeenCalledWith(
                    expect.objectContaining({
                        login: 'newuser',
                        name: 'New User',
                        password: 'password123',
                    }),
                    expect.anything()
                );
            });
        });

        it('should display validation errors for required fields', async () => {
            const authHookValue = { ...baseAuthHook, permissions: ['users:create'] };
            render(<UserForm {...createProps} />, { authHookValue });

            // Make the form dirty by changing an optional field.
            // This enables the submit button so that validation can be triggered.
            fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'p' } });

            fireEvent.click(screen.getByRole('button', { name: /Create User/i }));

            await waitFor(() => {
                expect(screen.getByText('Login is required')).toBeInTheDocument();
                expect(screen.getByText('Name is required')).toBeInTheDocument();
            });
            
            expect(createProps.onSubmit).not.toHaveBeenCalled();
        });

        it('should have a disabled submit button if user lacks create permission', () => {
            const authHookValue = { ...baseAuthHook, permissions: [] }; // No permissions
            render(<UserForm {...createProps} />, { authHookValue });
            expect(screen.getByRole('button', { name: /Create User/i })).toBeDisabled();
        });
    });

    describe('Edit Mode', () => {
        const editProps = {
            onSubmit: vi.fn(),
            allGroups: mockAllGroups,
            defaultValues: mockUser,
        };

        it('should render with default values', () => {
            const authHookValue = { ...baseAuthHook, permissions: ['users:update'] };
            render(<UserForm {...editProps} />, { authHookValue });

            expect(screen.getByLabelText(/login/i)).toHaveValue('testuser');
            expect(screen.getByLabelText(/name/i)).toHaveValue('Test User');
            expect(screen.getByLabelText(/password/i)).toHaveValue('');
        });

        it('should have submit button disabled if form is not dirty', () => {
            const authHookValue = { ...baseAuthHook, permissions: ['users:update'] };
            render(<UserForm {...editProps} />, { authHookValue });
            expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
        });

        it('should have a disabled submit button if user lacks update permission', () => {
            const authHookValue = { ...baseAuthHook, permissions: [] }; // No permissions
            render(<UserForm {...editProps} />, { authHookValue });
            
            fireEvent.change(screen.getByLabelText(/name/i), { target: { value: 'A New Name' } });
            
            expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
        });
    });

    describe('View Only Mode', () => {
        it('should disable all fields and button when isViewOnly is true', () => {
            const props = {
                defaultValues: mockUser,
                allGroups: mockAllGroups,
                isViewOnly: true,
                onSubmit: vi.fn(),
            };
            const authHookValue = { ...baseAuthHook, permissions: ['users:update'] }; // Has permission, but view only overrides
            render(<UserForm {...props} />, { authHookValue });

            expect(screen.getByLabelText(/login/i)).toBeDisabled();
            expect(screen.getByLabelText(/name/i)).toBeDisabled();
            expect(screen.getByLabelText(/password/i)).toBeDisabled();
            expect(screen.getByLabelText(/Active/i)).toBeDisabled();
            
            expect(screen.getByTestId('mock-transfer-list')).toHaveAttribute('data-disabled', 'true');
            expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
        });
    });

    describe('Built-in User Mode', () => {
        it('should enable save button for built-in user when form is dirty', () => {
            const props = {
                defaultValues: { ...mockUser, type: 'built_in' },
                allGroups: mockAllGroups,
                onSubmit: vi.fn(),
            };
            const authHookValue = { ...baseAuthHook, permissions: ['users:update'] };
            render(<UserForm {...props} />, { authHookValue });

            // Initially, the button is disabled because the form is not dirty
            expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();

            // Some fields should be disabled
            expect(screen.getByLabelText(/login/i)).toBeDisabled();
            expect(screen.getByLabelText(/name/i)).toBeDisabled();
            expect(screen.getByLabelText(/Active/i)).toBeDisabled();
            
            // Password can be changed
            expect(screen.getByLabelText(/password/i)).not.toBeDisabled();
            fireEvent.change(screen.getByLabelText(/password/i), { target: { value: 'new-password' } });

            // Now the button should be enabled because the form is dirty
            expect(screen.getByRole('button', { name: /Save Changes/i })).not.toBeDisabled();
        });
    });
});
