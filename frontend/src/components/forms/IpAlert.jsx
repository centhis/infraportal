import { Alert, AlertTitle, Stack } from '@mui/material';

export default function IpAlert({ text, severity, title }) {
    return (
        <Stack sx={{ width: '100%' }} spacing={2}>
            <Alert severity={severity} variant="filled">
                {title && <AlertTitle component="h5">{title}</AlertTitle>}
                {text}
            </Alert>
        </Stack>
    )
}