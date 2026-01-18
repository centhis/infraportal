import { createContext, useContext, useState, useCallback } from 'react';
import { Snackbar, Alert, AlertTitle } from '@mui/material';

const ToastContext = createContext(null);

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
};

export const ToastProvider = ({ children }) => {
    const [open, setOpen] = useState(false);
    const [toast, setToast] = useState({
        message: '',
        severity: 'info', // 'error' | 'warning' | 'info' | 'success'
        title: ''
    });

    const showToast = useCallback((message, severity = 'info', title = '') => {
        setToast({ message, severity, title });
        setOpen(true);
    }, []);

    const handleClose = (event, reason) => {
        if (reason === 'clickaway') {
            return;
        }
        setOpen(false);
    };

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            <Snackbar
                open={open}
                autoHideDuration={6000}
                onClose={handleClose}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            >
                <Alert
                    onClose={handleClose}
                    severity={toast.severity}
                    variant="filled"
                    sx={{ width: '100%', boxShadow: 3 }}
                >
                    {toast.title && <AlertTitle>{toast.title}</AlertTitle>}
                    {toast.message}
                </Alert>
            </Snackbar>
        </ToastContext.Provider>
    );
};
