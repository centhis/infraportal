import { screen } from '@testing-library/react';
import AppContent from './AppContent';
import { render } from '../mocks/test-utils';
import { useAuthContext } from './providers/AuthProvider';

// Mocks
vi.mock('./providers/AuthProvider', async (importOriginal) => {
    const actual = await importOriginal();
    return {
        ...actual,
        useAuthContext: vi.fn(),
    };
});

vi.mock('@mui/material/CircularProgress', () => ({
    default: (props) => <div role="progressbar" {...props} data-testid="loading-spinner"></div>,
}));

vi.mock('./routes/AppRoutes', () => ({ default: () => <div data-testid="app-routes">App Routes</div> }));


describe('AppContent', () => {
    it('shows a loading spinner when auth is loading', () => {
        useAuthContext.mockReturnValue({ loading: true });

        render(<AppContent />);

        expect(screen.getByRole('progressbar')).toBeInTheDocument();
        expect(screen.queryByTestId('app-routes')).not.toBeInTheDocument();
    });

    it('renders the main content when auth is not loading', () => {
        useAuthContext.mockReturnValue({ loading: false });

        render(<AppContent />);

        expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
        expect(screen.getByTestId('app-routes')).toBeInTheDocument();
        expect(screen.getByText('App Routes')).toBeInTheDocument();
    });
});
