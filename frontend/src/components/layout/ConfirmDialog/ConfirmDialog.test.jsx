import { render, screen, fireEvent } from '../../../mocks/test-utils';
import { vi } from 'vitest';
import ConfirmDialog from './ConfirmDialog';

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
        expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Confirm' })).toBeInTheDocument();
    });

    it('should not render when closed', () => {
        render(<ConfirmDialog {...defaultProps} open={false} />);

        expect(screen.queryByText('Test Title')).not.toBeInTheDocument();
        expect(screen.queryByText('Test Message')).not.toBeInTheDocument();
    });

    it('should call onClose when Cancel button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} open={true} />);

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Confirm button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} open={true} />);

        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnClose).not.toHaveBeenCalled();
    });
});
