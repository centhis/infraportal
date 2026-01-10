import { render, screen, fireEvent, waitFor, within } from '../../../../mocks/test-utils';
import { vi } from 'vitest';
import GroupForm from './GroupForm';

const mockAllRoles = [
    { id: 1, name: 'role1', description: 'Role One' },
    { id: 2, name: 'role2', description: 'Role Two' },
    { id: 3, name: 'role3', description: 'Role Three' },
];

const mockAllUsers = [
    { id: 1, name: 'user1', login: 'user1' },
    { id: 2, name: 'user2', login: 'user2' },
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
        const assignedRolesList = within(rolesTransferList).getByTestId('transfer-list-assigned');

        // Fill out the form
        fireEvent.change(screen.getByRole('textbox', { name: /group name/i }), { target: { value: 'New Group' } });
        
        // Find and click the 'role2' chip in the available list
        fireEvent.click(within(availableRolesList).getByText('role2'));

        // Verify it moved to the assigned list
        await waitFor(() => {
            expect(within(assignedRolesList).getByText('role2')).toBeInTheDocument();
        });
        expect(within(availableRolesList).queryByText('role2')).not.toBeInTheDocument();

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: 'Create Group' }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledTimes(1);
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'New Group',
                    roles: [2], // ID of 'role2'
                }),
                expect.anything()
            );
        });
    });

    it('should start with pre-assigned roles and allow moving one back', async () => {
        const defaultValues = {
            id: 1,
            name: 'Edit Group',
            description: 'Edit description',
            roles: [{ id: 1, name: 'role1' }],
            users: [],
        };
        const mockOnSubmit = vi.fn();
        render(<GroupForm {...commonProps} defaultValues={defaultValues} onSubmit={mockOnSubmit} />, { authHookValue });

        const rolesTransferList = screen.getByTestId('roles-transfer-list');
        const availableRolesList = within(rolesTransferList).getByTestId('transfer-list-available');
        const assignedRolesList = within(rolesTransferList).getByTestId('transfer-list-assigned');

        // Verify initial state
        await waitFor(() => {
            expect(within(assignedRolesList).getByText('role1')).toBeInTheDocument();
        });
        expect(within(availableRolesList).queryByText('role1')).not.toBeInTheDocument();

        // Click a chip in the assigned list to move it back
        fireEvent.click(within(assignedRolesList).getByText('role1'));
        
        // Verify it moved back
        await waitFor(() => {
            expect(within(availableRolesList).getByText('role1')).toBeInTheDocument();
        });
        expect(within(assignedRolesList).queryByText('role1')).not.toBeInTheDocument();

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    roles: [], // 'role1' was moved back
                }),
                expect.anything()
            );
        });
    });

    it('should allow adding/removing users/roles from a built-in group', async () => {
        const defaultValues = {
            id: 1,
            name: 'Admin Group',
            built_in: true,
            roles: [{ id: 1, name: 'role1' }],
            users: [],
        };
        const mockOnSubmit = vi.fn();
        render(<GroupForm {...commonProps} defaultValues={defaultValues} onSubmit={mockOnSubmit} />, { authHookValue });
    
        // Check form fields
        expect(screen.getByRole('textbox', { name: /group name/i })).toBeDisabled();
        expect(screen.getByRole('textbox', { name: /description/i })).toBeDisabled();
    
        // Save button should be disabled initially because the form is not dirty
        expect(screen.getByRole('button', { name: 'Save Changes' })).toBeDisabled();
    
        // Add a role
        const rolesTransferList = screen.getByTestId('roles-transfer-list');
        const availableRolesList = within(rolesTransferList).getByTestId('transfer-list-available');
        fireEvent.click(within(availableRolesList).getByText('role2'));
    
        // Save button should now be enabled
        await waitFor(() => {
            expect(screen.getByRole('button', { name: 'Save Changes' })).toBeEnabled();
        });
    
        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    
        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    roles: [1, 2], // 'role1' and 'role2'
                }),
                expect.anything()
            );
        });
    });
});