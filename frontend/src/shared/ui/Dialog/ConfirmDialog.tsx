import { type ReactNode } from 'react';
import MuiDialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContentText from '@mui/material/DialogContentText';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import { Button } from '../Button';

export interface ConfirmDialogProps {
    /** Открыт ли диалог */
    open: boolean;
    /** Callback закрытия */
    onClose: () => void;
    /** Callback подтверждения */
    onConfirm: () => void;
    /** Заголовок */
    title: string;
    /** Текст сообщения */
    message?: string | ReactNode;
    /** Текст кнопки подтверждения */
    confirmText?: string;
    /** Текст кнопки отмены */
    cancelText?: string;
    /** Цвет кнопки подтверждения */
    confirmColor?: 'primary' | 'secondary' | 'error' | 'warning' | 'info' | 'success';
    /** Индикатор загрузки на кнопке подтверждения */
    loading?: boolean;
    /** Максимальная ширина */
    maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Диалог подтверждения действия.
 */
export function ConfirmDialog({
    open,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Подтвердить',
    cancelText = 'Отмена',
    confirmColor = 'primary',
    loading = false,
    maxWidth = 'xs',
}: ConfirmDialogProps) {
    return (
        <MuiDialog
            open={open}
            onClose={loading ? undefined : onClose}
            maxWidth={maxWidth}
            fullWidth
        >
            <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
                {title}
                <IconButton
                    aria-label="close"
                    onClick={onClose}
                    disabled={loading}
                    sx={{
                        position: 'absolute',
                        right: 8,
                        top: 8,
                        color: (theme) => theme.palette.grey[500],
                    }}
                >
                    <CloseIcon />
                </IconButton>
            </DialogTitle>
            {message && (
                <DialogContent>
                    {typeof message === 'string' ? (
                        <DialogContentText>{message}</DialogContentText>
                    ) : (
                        message
                    )}
                </DialogContent>
            )}
            <DialogActions>
                <Button onClick={onClose} disabled={loading}>
                    {cancelText}
                </Button>
                <Button
                    onClick={onConfirm}
                    variant="contained"
                    color={confirmColor}
                    loading={loading}
                >
                    {confirmText}
                </Button>
            </DialogActions>
        </MuiDialog>
    );
}
