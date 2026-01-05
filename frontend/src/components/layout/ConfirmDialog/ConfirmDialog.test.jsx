import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

// Mock the translation hook
vi.mock('react-i18next', () => ({
    useTranslation: () => ({
        t: (key) => key, // Returns the key itself for testing
    }),
}));

describe('ConfirmDialog', () => {
    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();
    const defaultProps = {
        title: 'Test Title',
        message: 'Test Message',
        onClose: mockOnClose,
        onConfirm: mockOnConfirm,
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render correctly when open', () => {
        render(<ConfirmDialog {...defaultProps} open={true} />);

        expect(screen.getByText('Test Title')).toBeInTheDocument();
        expect(screen.getByText('Test Message')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'confirm_dialog.cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'confirm_dialog.confirm' })).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        render(<ConfirmDialog {...defaultProps} open={false} />);

        expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
    });

    it('should call onClose when Cancel button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} open={true} />);

        fireEvent.click(screen.getByRole('button', { name: 'confirm_dialog.cancel' }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Confirm button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} open={true} />);

        fireEvent.click(screen.getByRole('button', { name: 'confirm_dialog.confirm' }));
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnClose).not.toHaveBeenCalled();
    });
});
