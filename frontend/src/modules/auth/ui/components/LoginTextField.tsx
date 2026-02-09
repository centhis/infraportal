import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { TextField, type TextFieldProps } from '@shared/ui';

export interface LoginTextFieldProps<T extends FieldValues> extends Omit<TextFieldProps, 'name'> {
    /** Имя поля */
    name: Path<T>;
    /** Контрол React Hook Form */
    control: Control<T>;
    /** Label поля */
    label: string;
}

/**
 * Текстовое поле для формы логина с react-hook-form
 */
export function LoginTextField<T extends FieldValues>({
    name,
    control,
    label,
    ...rest
}: LoginTextFieldProps<T>) {
    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState: { error } }) => (
                <TextField
                    {...field}
                    label={label}
                    variant="outlined"
                    fullWidth
                    error={!!error}
                    helperText={error?.message}
                    {...rest}
                />
            )}
        />
    );
}
