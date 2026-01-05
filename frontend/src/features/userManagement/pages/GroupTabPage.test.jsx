import { render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import GroupTabPage from './GroupTabPage';
import useGroups from '../hooks/useGroups';
import useRoles from '../hooks/useRoles';

// Mock dependencies
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));
vi.mock('../hooks/useGroups');
vi.mock('../hooks/useRoles');

describe('GroupTabPage', () => {
    beforeEach(() => {
        useGroups.mockReturnValue({
            loading: false,
            groups: [],
            paginationModel: { page: 0, pageSize: 10 },
            setPaginationModel: vi.fn(),
            rowCount: 0,
            refetchGroups: vi.fn(),
        });
        useRoles.mockReturnValue({
            loading: false,
            roles: [],
        });
    });

    it('should show a loading spinner when groups are loading', () => {
        useGroups.mockReturnValue({ loading: true, groups: [] });
        render(<GroupTabPage />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should show a loading spinner when roles are loading', () => {
        useRoles.mockReturnValue({ loading: true, roles: [] });
        render(<GroupTabPage />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render the group table when not loading', async () => {
        useGroups.mockReturnValue({
            loading: false,
            groups: [{ id: 1, name: 'Admins', description: 'Admin group', roles: [] }],
            rowCount: 1,
            paginationModel: { page: 0, pageSize: 10 },
            setPaginationModel: vi.fn(),
        });

        render(<GroupTabPage />);

        expect(await screen.findByText('Admins')).toBeInTheDocument();
        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    });
});
