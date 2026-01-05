import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import UserTabPage from './UserTabPage.jsx';
import useUsers from '../hooks/useUsers.jsx';

// Mock dependencies
vi.mock('react-i18next', () => ({
    useTranslation: () => ({ t: (key) => key }),
}));
vi.mock('../hooks/useUsers.jsx');

describe('UserTabPage', () => {

    const emptyUsersHook = {
        loading: false,
        users: [],
        paginationModel: { page: 0, pageSize: 10 },
        setPaginationModel: vi.fn(),
        rowCount: 0,
        refetchUsers: vi.fn(),
    };

    it('should show a loading spinner when users are loading', () => {
        useUsers.mockReturnValue({ ...emptyUsersHook, loading: true });

        render(<UserTabPage />);
        expect(screen.getByRole('progressbar')).toBeInTheDocument();
    });

    it('should render the user table when not loading', async () => {
        useUsers.mockReturnValue({
            ...emptyUsersHook,
            users: [{ id: 1, login: 'testuser', name: 'Test User', is_active: true, groups: [] }],
            rowCount: 1,
        });

        render(<UserTabPage />);

        await waitFor(() => {
            expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        });
        expect(await screen.findByText('testuser')).toBeInTheDocument();
    });
});