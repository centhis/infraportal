import { render, screen, fireEvent, waitFor } from '../../../../mocks/test-utils';
import { vi } from 'vitest';
import RoleForm from './RoleForm';

// Mock the TransferList to simplify the RoleForm tests
vi.mock('../../../../components/forms/TransferList', () => ({
    __esModule: true,
    default: ({ disabled, selectedIds }) => (
        <div data-testid="mock-transfer-list" data-disabled={String(disabled)}>
            <div data-testid="selected-ids">{JSON.stringify(selectedIds)}</div>
        </div>
    ),
}));

const mockPermissions = [
    { id: 1, name: 'users:view', description: 'View users' },
    { id: 2, name: 'users:create', description: 'Create users' },
    { id: 3, name: 'users:update', description: 'Update users' },
];

describe('RoleForm', () => {
    const commonProps = {
        onSubmit: vi.fn(),
        allPermissions: mockPermissions,
    };

    const authHookValue = {
        user: { name: 'test' },
        permissions: ['users:create', 'users:update'],
        loading: false,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render correctly in create mode', () => {
        render(<RoleForm {...commonProps} />, { authHookValue });

        expect(screen.getByLabelText(/Role Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Description/i)).toBeInTheDocument();
        expect(screen.getByTestId('mock-transfer-list')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Create Role/i })).toBeInTheDocument();
    });

    it('should submit the form with valid data in create mode', async () => {
        const mockOnSubmit = vi.fn();
        render(<RoleForm {...commonProps} onSubmit={mockOnSubmit} />, { authHookValue });

        fireEvent.change(screen.getByLabelText(/Role Name/i), { target: { value: 'New Role' } });
        fireEvent.change(screen.getByLabelText(/Description/i), { target: { value: 'A new role description.' } });

        fireEvent.click(screen.getByRole('button', { name: /Create Role/i }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'New Role',
                    description: 'A new role description.',
                }),
                expect.anything()
            );
        });
    });

    it('should render with default values in edit mode', () => {
        const defaultValues = {
            name: 'Edit Role',
            description: 'Edit description',
            permissions: [{ id: 1, name: 'users:view' }],
        };
        render(<RoleForm {...commonProps} defaultValues={defaultValues} />, { authHookValue });

        expect(screen.getByLabelText(/Role Name/i)).toHaveValue('Edit Role');
        expect(screen.getByLabelText(/Description/i)).toHaveValue('Edit description');
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeInTheDocument();
        
        // Check that the selectedIds are passed to the mocked TransferList
        const selectedIds = JSON.parse(screen.getByTestId('selected-ids').textContent);
        expect(selectedIds).toEqual([1]);
    });

    it('should disable the form when editing a built-in role', () => {
        const defaultValues = {
            name: 'Admin',
            built_in: true,
            permissions: [{ id: 1, name: 'users:view' }],
        };
        render(<RoleForm {...commonProps} defaultValues={defaultValues} />, { authHookValue });

        expect(screen.getByLabelText(/Role Name/i)).toBeDisabled();
        expect(screen.getByLabelText(/Description/i)).toBeDisabled();
        expect(screen.getByTestId('mock-transfer-list')).toHaveAttribute('data-disabled', 'true');
        expect(screen.getByRole('button', { name: /Save Changes/i })).toBeDisabled();
    });
});