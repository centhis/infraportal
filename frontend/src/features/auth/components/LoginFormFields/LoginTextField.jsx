import { TextField } from '@mui/material';
import {Controller} from 'react-hook-form'

export default function LoginTextField({ label, name, control, ...rest }){
    return (
        <Controller 
            name = {name}
            control={control}
            render={({
                field,
                fieldState: {error},
            }) => (
                    <TextField
                        {...field}
                        label={label}
                        variant="outlined"
                        fullWidth
                        error={!!error}
                        helperText={error?.message}
                        {...rest}
                    />
                )
            }
        />
    )
}