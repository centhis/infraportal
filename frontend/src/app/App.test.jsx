import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the child components to isolate the App component
vi.mock('./providers/I18nProvider', () => ({
    I18nProvider: ({ children }) => <div data-testid="i18n-provider">{children}</div>,
}));

vi.mock('./providers/AuthProvider', () => ({
    AuthProvider: ({ children }) => <div data-testid="auth-provider">{children}</div>,
}));

vi.mock('./AppContent', () => ({ default: () => <div data-testid="app-content">App Content</div> }));


describe('App', () => {
    it('renders all the main providers and AppContent', () => {
        render(<App />);

        // Check that providers are rendered
        expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
        expect(screen.getByTestId('auth-provider')).toBeInTheDocument();

        // Check that AppContent is rendered within the providers
        expect(screen.getByTestId('app-content')).toBeInTheDocument();
        expect(screen.getByText('App Content')).toBeInTheDocument();
    });
});
