import { useState } from 'react';
import { Controller } from 'react-hook-form';
import {
  FormControl,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  FormHelperText,
} from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

export default function LoginPassField({ label, name, control, ...rest }) {
    const [showPassword, setShowPassword] = useState(false);

    return (
        <Controller
            name={name}
            control={control}
            render={({
                field: {onChange, value},
                fieldState: {error},
            }) => (
                <FormControl 
                    variant='outlined' 
                    fullWidth
                    error={!!error} 
                    {...rest}
                    >
                    <InputLabel htmlFor={`password-${name}`}>{label}</InputLabel>
                    <OutlinedInput
                        id={`password-${name}`}
                        onChange={onChange}
                        value={value}
                        type={showPassword ? 'text' : 'password'}
                        endAdornment={
                            <InputAdornment position='end'>
                                <IconButton
                                    onClick={() => setShowPassword(!showPassword)}
                                    edge="end"
                                >
                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                </IconButton>
                            </InputAdornment>
                        }
                        label={label}
                    />
                    {error && (
                        <FormHelperText>{error.message}</FormHelperText>
                    )}
                </FormControl>
            )
        }
        />
    )
}
