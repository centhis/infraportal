import { forwardRef } from 'react';
import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export interface ButtonProps extends MuiButtonProps {
    /** Показать индикатор загрузки */
    loading?: boolean;
}

/**
 * Обёртка над MUI Button с поддержкой loading state.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
    ({ loading = false, disabled, children, startIcon, ...props }, ref) => {
        return (
            <MuiButton
                ref={ref}
                disabled={disabled || loading}
                startIcon={loading ? <CircularProgress size={20} color="inherit" /> : startIcon}
                {...props}
            >
                {children}
            </MuiButton>
        );
    }
);

Button.displayName = 'Button';
