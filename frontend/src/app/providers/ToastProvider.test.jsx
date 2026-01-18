import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ToastProvider, useToast } from './ToastProvider';
import { ThemeProvider, createTheme } from '@mui/material/styles';

// Create a test component that uses the useToast hook
const TestComponent = () => {
    const { showToast } = useToast();
    return (
        <div>
            <button onClick={() => showToast('Success message', 'success', 'Success Title')}>Show Success</button>
            <button onClick={() => showToast('Error message', 'error')}>Show Error</button>
            <button onClick={() => showToast('Info message')}>Show Info</button>
        </div>
    );
};

describe('ToastProvider', () => {
    const theme = createTheme();

    it('should display a success toast', async () => {
        render(
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            </ThemeProvider>
        );

        fireEvent.click(screen.getByText('Show Success'));

        await waitFor(() => {
            expect(screen.getByText('Success message')).toBeInTheDocument();
            expect(screen.getByText('Success Title')).toBeInTheDocument();
            expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledSuccess');
        });
    });

    it('should display an error toast', async () => {
        render(
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            </ThemeProvider>
        );

        fireEvent.click(screen.getByText('Show Error'));

        await waitFor(() => {
            expect(screen.getByText('Error message')).toBeInTheDocument();
            expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledError');
        });
    });

    it('should display an info toast with default severity', async () => {
        render(
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            </ThemeProvider>
        );

        fireEvent.click(screen.getByText('Show Info'));

        await waitFor(() => {
            expect(screen.getByText('Info message')).toBeInTheDocument();
            expect(screen.getByRole('alert')).toHaveClass('MuiAlert-filledInfo');
        });
    });

    it('should close the toast when dismissed', async () => {
        render(
            <ThemeProvider theme={theme}>
                <ToastProvider>
                    <TestComponent />
                </ToastProvider>
            </ThemeProvider>
        );

        fireEvent.click(screen.getByText('Show Success'));

        await waitFor(() => {
            expect(screen.getByText('Success message')).toBeInTheDocument();
        });

        const closeButton = screen.getByRole('button', { name: 'Close' });
        fireEvent.click(closeButton);

        await waitFor(() => {
            expect(screen.queryByText('Success message')).not.toBeInTheDocument();
        });
    });
});
