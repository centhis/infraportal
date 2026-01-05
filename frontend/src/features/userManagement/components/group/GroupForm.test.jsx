import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi } from 'vitest';
import GroupForm from './GroupForm';

// Mock the translation hook
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key, // Returns the key itself for testing
    }),
}));

const mockAllRoles = [
    { id: 1, name: 'role1', description: 'Role One' },
    { id: 2, name: 'role2', description: 'Role Two' },
    { id: 3, name: 'role3', description: 'Role Three' },
];

describe('GroupForm', () => {
    const commonProps = {
        onSubmit: vi.fn(),
        allRoles: mockAllRoles,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render all roles in the "Available" list by default', async () => {
        render(<GroupForm {...commonProps} />);
        
        const availableList = (await screen.findByLabelText(/Available/i)).closest('.MuiCard-root');
        
        expect(within(availableList).getByText('role1')).toBeInTheDocument();
        expect(within(availableList).getByText('role2')).toBeInTheDocument();
        expect(within(availableList).getByText('role3')).toBeInTheDocument();

        const assignedList = (await screen.findByLabelText(/Assigned/i)).closest('.MuiCard-root');
        expect(within(assignedList).queryByText('role1')).not.toBeInTheDocument();
    });

    it('should move a role to the assigned list on click and submit', async () => {
        const mockOnSubmit = vi.fn();
        render(<GroupForm {...commonProps} onSubmit={mockOnSubmit} />);

        const availableList = (await screen.findByLabelText(/Available/i)).closest('.MuiCard-root');
        const assignedList = (await screen.findByLabelText(/Assigned/i)).closest('.MuiCard-root');

        // Fill out the form
        fireEvent.change(screen.getByLabelText(/user_management.groups.form.name/i), { target: { value: 'New Group' } });
        
        // Find and click the 'role2' chip in the available list
        fireEvent.click(within(availableList).getByText('role2'));

        // Verify it moved to the assigned list
        await waitFor(() => {
            expect(within(assignedList).getByText('role2')).toBeInTheDocument();
        });
        expect(within(availableList).queryByText('role2')).not.toBeInTheDocument();

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /user_management.groups.form.create_group/i }));

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
        };
        const mockOnSubmit = vi.fn();
        render(<GroupForm {...commonProps} defaultValues={defaultValues} onSubmit={mockOnSubmit} />);

        const assignedList = (await screen.findByLabelText(/Assigned/i)).closest('.MuiCard-root');
        const availableList = (await screen.findByLabelText(/Available/i)).closest('.MuiCard-root');

        // Verify initial state
        await waitFor(() => {
            expect(within(assignedList).getByText('role1')).toBeInTheDocument();
        });
        expect(within(availableList).queryByText('role1')).not.toBeInTheDocument();

        // Click a chip in the assigned list to move it back
        fireEvent.click(within(assignedList).getByText('role1'));
        
        // Verify it moved back
        await waitFor(() => {
            expect(within(availableList).getByText('role1')).toBeInTheDocument();
        });
        expect(within(assignedList).queryByText('role1')).not.toBeInTheDocument();

        // Submit the form
        fireEvent.click(screen.getByRole('button', { name: /user_management.groups.form.save_changes/i }));

        await waitFor(() => {
            expect(mockOnSubmit).toHaveBeenCalledWith(
                expect.objectContaining({
                    roles: [], // 'role1' was moved back
                }),
                expect.anything()
            );
        });
    });

    it('should disable form and transfer list when editing a built-in group', async () => {
        const defaultValues = {
            id: 1,
            name: 'Admin Group',
            built_in: true,
            roles: [{ id: 1, name: 'role1' }],
        };
        render(<GroupForm {...commonProps} defaultValues={defaultValues} />);

        // Check form fields
        expect(await screen.findByLabelText(/user_management.groups.form.name/i)).toBeDisabled();
        expect(await screen.findByLabelText(/user_management.groups.form.description/i)).toBeDisabled();

        // Check TransferList filter inputs
        const availableCardHeaderTextField = (await screen.findByLabelText(/Available/i));
        expect(availableCardHeaderTextField).toBeDisabled();

        const assignedCardHeaderTextField = (await screen.findByLabelText(/Assigned/i));
        expect(assignedCardHeaderTextField).toBeDisabled();

        // Check a specific chip for disabled status
        const role1Chip = screen.getByText('role1').closest('.MuiChip-root');
        expect(role1Chip).toHaveClass('Mui-disabled');
        
        // Check save button
        expect(screen.getByRole('button', { name: /user_management.groups.form.save_changes/i })).toBeDisabled();
    });
});
