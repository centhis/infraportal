import { render, screen, fireEvent } from '../../../mocks/test-utils';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ConfirmDialog, type ConfirmDialogProps } from './ConfirmDialog';

describe('ConfirmDialog', () => {
    const mockOnClose = vi.fn();
    const mockOnConfirm = vi.fn();

    // Явно указываем тексты кнопок для соответствия ожиданиям теста (или используем дефолтные, если совпадают)
    // Legacy-тест ожидал 'Cancel' и 'Confirm'.
    // Новый компонент по умолчанию использует 'Отмена' и 'Подтвердить'.
    // Передаём явные пропсы для соответствия ожиданиям старого теста или обновляем тест.
    // Передаём явные пропсы для надёжности и консистентности.
    const defaultProps: ConfirmDialogProps = {
        title: 'Test Title',
        message: 'Test Message',
        onClose: mockOnClose,
        onConfirm: mockOnConfirm,
        open: true,
        cancelText: 'Cancel',
        confirmText: 'Confirm',
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render correctly when open', () => {
        render(<ConfirmDialog {...defaultProps} />);

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
        render(<ConfirmDialog {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(mockOnClose).toHaveBeenCalledTimes(1);
        expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm when Confirm button is clicked', () => {
        render(<ConfirmDialog {...defaultProps} />);

        fireEvent.click(screen.getByRole('button', { name: 'Confirm' }));
        expect(mockOnConfirm).toHaveBeenCalledTimes(1);
        expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('should call onClose when close icon is clicked', () => {
        // Новый тест для иконки закрытия
        render(<ConfirmDialog {...defaultProps} />);

        const closeButton = screen.getByLabelText('close');
        fireEvent.click(closeButton);
        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
});
