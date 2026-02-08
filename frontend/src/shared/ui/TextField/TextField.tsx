import { forwardRef } from 'react';
import MuiTextField, { type TextFieldProps as MuiTextFieldProps } from '@mui/material/TextField';

export type TextFieldProps = MuiTextFieldProps & {
    /** Скрыть helperText при отсутствии ошибки (сохраняет layout) */
    reserveHelperTextSpace?: boolean;
};

/**
 * Обёртка над MUI TextField.
 */
export const TextField = forwardRef<HTMLDivElement, TextFieldProps>(
    ({ reserveHelperTextSpace = false, helperText, ...props }, ref) => {
        return (
            <MuiTextField
                ref={ref}
                helperText={reserveHelperTextSpace && !helperText ? ' ' : helperText}
                {...props}
            />
        );
    }
);

TextField.displayName = 'TextField';
