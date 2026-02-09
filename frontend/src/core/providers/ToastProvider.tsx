import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

export type ToastSeverity = 'error' | 'warning' | 'info' | 'success';

export interface ToastOptions {
    message: string;
    severity?: ToastSeverity;
    title?: string;
    duration?: number;
}

export interface ToastContextValue {
    showToast: (message: string, severity?: ToastSeverity, title?: string) => void;
    showSuccess: (message: string, title?: string) => void;
    showError: (message: string, title?: string) => void;
    showWarning: (message: string, title?: string) => void;
    showInfo: (message: string, title?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

// eslint-disable-next-line react-refresh/only-export-components
export function useToast(): ToastContextValue {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}

export interface ToastProviderProps {
    children: ReactNode;
    /** Позиция toast (по умолчанию bottom-right) */
    position?: {
        vertical: 'top' | 'bottom';
        horizontal: 'left' | 'center' | 'right';
    };
    /** Длительность показа (по умолчанию 6000ms) */
    defaultDuration?: number;
}

interface ToastState {
    message: string;
    severity: ToastSeverity;
    title: string;
}

export function ToastProvider({
    children,
    position = { vertical: 'bottom', horizontal: 'right' },
    defaultDuration = 6000,
}: ToastProviderProps) {
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState<ToastState>({
        message: '',
        severity: 'info',
        title: '',
    });

    const showToast = useCallback((message: string, severity: ToastSeverity = 'info', title = '') => {
        setToast({ message, severity, title });
        setOpen(true);
    }, []);

    const showSuccess = useCallback((message: string, title = '') => showToast(message, 'success', title), [showToast]);
    const showError = useCallback((message: string, title = '') => showToast(message, 'error', title), [showToast]);
    const showWarning = useCallback((message: string, title = '') => showToast(message, 'warning', title), [showToast]);
    const showInfo = useCallback((message: string, title = '') => showToast(message, 'info', title), [showToast]);

    const handleClose = (_event?: React.SyntheticEvent | Event, reason?: string) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    const contextValue: ToastContextValue = {
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
    };

    return (
        <ToastContext.Provider value={contextValue}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={defaultDuration}
                onClose={handleClose}
                anchorOrigin={position}
                sx={{
                    // Позволяем элементам выходить за границы Snackbar
                    overflow: 'visible',
                    '& .MuiSnackbarContent-root': {
                        overflow: 'visible',
                        bgcolor: 'transparent',
                        boxShadow: 'none',
                        p: 0,
                    }
                }}
            >
                <Alert
                    severity={toast.severity}
                    variant="filled"
                    sx={{
                        width: '100%',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                        position: 'relative',
                        overflow: 'visible',
                        borderRadius: 2,
                        // Возвращаем стандартные отступы, так как крестик теперь снаружи
                        py: 1.5,
                        pl: 2,
                    }}
                    action={
                        <IconButton
                            aria-label="close"
                            onClick={handleClose}
                            sx={{
                                position: 'absolute',
                                // Выносим за рамку (в левый верхний угол)
                                top: -12,
                                left: -12,
                                width: 28,
                                height: 28,
                                bgcolor: 'background.paper',
                                color: 'text.primary',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                                '&:hover': {
                                    bgcolor: 'grey.100',
                                    transform: 'scale(1.1)',
                                },
                                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                zIndex: 1,
                            }}
                        >
                            <CloseIcon sx={{ fontSize: '1.1rem' }} />
                        </IconButton>
                    }
                >
                    {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
                    {toast.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
}
