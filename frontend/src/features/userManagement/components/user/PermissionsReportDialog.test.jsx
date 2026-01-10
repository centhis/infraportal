import { render, screen, fireEvent } from '../../../../mocks/test-utils';
import PermissionsReportDialog from './PermissionsReportDialog';

const mockReportData = {
    username: 'testuser',
    all_unique_permissions: [
        { id: 1, name: 'permission_a' },
        { id: 2, name: 'permission_b' },
    ],
    groups_with_roles_and_permissions: [
        {
            id: 101,
            name: 'Group 1',
            built_in: false,
            roles: [
                {
                    id: 201,
                    name: 'Role 1',
                    built_in: true,
                    permissions: [{ id: 301, name: 'permission_c' }],
                },
                {
                    id: 202,
                    name: 'Role 2',
                    built_in: false,
                    permissions: [],
                },
            ],
        },
        {
            id: 102,
            name: 'Group 2',
            built_in: true,
            roles: [],
        },
    ],
};

describe('PermissionsReportDialog', () => {
    const onClose = vi.fn();

    beforeEach(() => {
        onClose.mockClear();
    });

    it('does not render the dialog when open is false', () => {
        render(<PermissionsReportDialog open={false} onClose={onClose} reportData={null} isLoading={false} />);
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('renders a loading spinner when isLoading is true', () => {
        render(<PermissionsReportDialog open={true} onClose={onClose} reportData={{ username: 'testuser' }} isLoading={true} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.getByText(/Permissions Report for User: testuser/i)).toBeInTheDocument();
    });

    it('renders "No report data available" message when no reportData and not loading', () => {
        render(<PermissionsReportDialog open={true} onClose={onClose} reportData={null} isLoading={false} />);
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(/Failed to load report data/i)).toBeInTheDocument();
    });

    it('renders all unique permissions as chips', () => {
        render(<PermissionsReportDialog open={true} onClose={onClose} reportData={mockReportData} isLoading={false} />);
        expect(screen.getByText(/All Available Permissions/i)).toBeInTheDocument();
        expect(screen.getByText('permission_a')).toBeInTheDocument();
        expect(screen.getByText('permission_b')).toBeInTheDocument();
    });

    it('renders permissions breakdown with groups and roles', async () => {
        render(<PermissionsReportDialog open={true} onClose={onClose} reportData={mockReportData} isLoading={false} />);

        expect(screen.getByText(/Breakdown by Groups and Roles/i)).toBeInTheDocument();
        
        // Check Group 1 and its role
        const group1AccordionSummary = screen.getByText(/Group: Group 1/i);
        fireEvent.click(group1AccordionSummary); // Expand group
        
        const role1AccordionSummary = screen.getByText(/Role: Role 1/i);
        fireEvent.click(role1AccordionSummary); // Expand role

        expect(screen.getByText('permission_c')).toBeInTheDocument();
        expect(screen.getAllByText(/Built-in/i).length).toBeGreaterThan(0);
    });

    it('renders "No roles found in this group" when a group has no roles', async () => {
        render(<PermissionsReportDialog open={true} onClose={onClose} reportData={mockReportData} isLoading={false} />);

        const group2AccordionSummary = screen.getByText(/Group: Group 2/i);
        fireEvent.click(group2AccordionSummary); // Expand group

        expect(screen.getByText(/This group does not contain any roles providing permissions/i)).toBeInTheDocument();
    });

    it('renders "No permissions found" when a role has no permissions', async () => {
        render(<PermissionsReportDialog open={true} onClose={onClose} reportData={mockReportData} isLoading={false} />);

        const group1AccordionSummary = screen.getByText(/Group: Group 1/i);
        fireEvent.click(group1AccordionSummary); // Expand group
        
        const role2AccordionSummary = screen.getByText(/Role: Role 2/i);
        fireEvent.click(role2AccordionSummary); // Expand role

        expect(screen.getAllByText(/No permissions/i).length).toBeGreaterThan(0);
    });
});

