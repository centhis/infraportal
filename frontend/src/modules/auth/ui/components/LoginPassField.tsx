import { useState } from 'react';
import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import OutlinedInput from '@mui/material/OutlinedInput';
import FormHelperText from '@mui/material/FormHelperText';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';

export interface LoginPassFieldProps<T extends FieldValues> {
    /** Имя поля */
    name: Path<T>;
    /** Контрол React Hook Form */
    control: Control<T>;
    /** Label поля */
    label: string;
    /** Остальные пропсы FormControl */
    margin?: 'none' | 'dense' | 'normal';
    fullWidth?: boolean;
}

/**
 * Поле пароля с переключателем видимости
 */
export function LoginPassField<T extends FieldValues>({
    name,
    control,
    label,
    margin,
    fullWidth = true,
}: LoginPassFieldProps<T>) {
    const [showPassword, setShowPassword] = useState(false);

    const handleToggleVisibility = () => {
        setShowPassword((prev) => !prev);
    };

    return (
        <Controller
            name={name}
            control={control}
            render={({ field: { onChange, value }, fieldState: { error } }) => (
                <FormControl variant="outlined" fullWidth={fullWidth} error={!!error} sx={margin === 'normal' ? { mt: 2, mb: 1 } : margin === 'dense' ? { mt: 1, mb: 0.5 } : {}}>
                    <InputLabel htmlFor={`password-${name}`}>{label}</InputLabel>
                    <OutlinedInput
                        id={`password-${name}`}
                        onChange={onChange}
                        value={value}
                        type={showPassword ? 'text' : 'password'}
                        endAdornment={
                            <InputAdornment position="end">
                                <IconButton onClick={handleToggleVisibility} edge="end" aria-label="toggle password visibility">
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        }
                        label={label}
                    />
                    {error && <FormHelperText>{error.message}</FormHelperText>}
                </FormControl>
            )}
        />
    );
}
