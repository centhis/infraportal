import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import RoleForm from './RoleForm';

// Mock the translation hook
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key, // Returns the key itself for testing
    }),
}));

const mockPermissions = [
    { id: 1, name: 'users:view', description: 'View users' },
    { id: 2, name: 'users:create', description: 'Create users' },
    { id: 3, name: 'users:update', description: 'Update users' },
];

describe('RoleForm with Chip-based TransferList', () => {
    const commonProps = {
        onSubmit: vi.fn(),
        allPermissions: mockPermissions,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render all permissions in the "Available" list by default', async () => {
        render(<RoleForm {...commonProps} />);
        
        const availableList = (await screen.findByLabelText(/Available/i)).closest('.MuiCard-root');
        
        expect(within(availableList).getByText('users:view')).toBeInTheDocument();
        expect(within(availableList).getByText('users:create')).toBeInTheDocument();
        expect(within(availableList).getByText('users:update')).toBeInTheDocument();

        const assignedList = (await screen.findByLabelText(/Assigned/i)).closest('.MuiCard-root');
        expect(within(assignedList).queryByText('users:view')).not.toBeInTheDocument();
    });

    it('should move a permission to the assigned list on click and submit', async () => {
        const mockOnSubmit = vi.fn();
        render(<RoleForm {...commonProps} onSubmit={mockOnSubmit} />);

        const availableList = (await screen.findByLabelText(/Available/i)).closest('.MuiCard-root');
        const assignedList = (await screen.findByLabelText(/Assigned/i)).closest('.MuiCard-root');

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/user_management.roles.form.name/i), { target: { value: 'New Role' } });
        
        // Find and click the 'users:create' permission chip in the available list
        fireEvent.click(within(availableList).getByText('users:create'));

        // Verify it moved to the assigned list
        await waitFor(() => {
            expect(within(assignedList).getByText('users:create')).toBeInTheDocument();
        });
        expect(within(availableList).queryByText('users:create')).not.toBeInTheDocument();

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /user_management.roles.form.create_role/i }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledTimes(1);
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    name: 'New Role',
                    permissions: [2], // ID of 'users:create'
                }),
                expect.anything()
            );
        });
    });

    it('should start with pre-assigned permissions and allow moving one back', async () => {
        const defaultValues = {
            name: 'Edit Role',
            description: 'Edit description',
            permissions: [{ id: 1, name: 'users:view' }],
        };
        const mockOnSubmit = vi.fn();
        render(<RoleForm {...commonProps} defaultValues={defaultValues} onSubmit={mockOnSubmit} />);

        const assignedList = (await screen.findByLabelText(/Assigned/i)).closest('.MuiCard-root');
        const availableList = (await screen.findByLabelText(/Available/i)).closest('.MuiCard-root');

        // Verify initial state
        await waitFor(() => {
            expect(within(assignedList).getByText('users:view')).toBeInTheDocument();
        });
        expect(within(availableList).queryByText('users:view')).not.toBeInTheDocument();

        // Click a chip in the assigned list to move it back
        fireEvent.click(within(assignedList).getByText('users:view'));
        
        // Verify it moved back
        await waitFor(() => {
            expect(within(availableList).getByText('users:view')).toBeInTheDocument();
        });
        expect(within(assignedList).queryByText('users:view')).not.toBeInTheDocument();

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /user_management.roles.form.save_changes/i }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    permissions: [], // 'users:view' was moved back
                }),
                expect.anything()
            );
        });
    });

    it('should disable the transfer list when editing a built-in role', async () => {
        const defaultValues = {
            name: 'Admin',
            built_in: true,
            permissions: [{ id: 1, name: 'users:view' }],
        };
        render(<RoleForm {...commonProps} defaultValues={defaultValues} />);

        const availableCardHeaderTextField = (await screen.findByLabelText(/Available/i));
        expect(availableCardHeaderTextField).toBeDisabled();

        const assignedCardHeaderTextField = (await screen.findByLabelText(/Assigned/i));
        expect(assignedCardHeaderTextField).toBeDisabled();

        // Check a specific chip for disabled status
        const usersViewChip = screen.getByText('users:view').closest('.MuiChip-root');
        expect(usersViewChip).toHaveClass('Mui-disabled');
    });
});