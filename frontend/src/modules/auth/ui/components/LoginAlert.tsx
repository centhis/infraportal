import { useTranslation } from 'react-i18next';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';

export interface LoginAlertProps {
    /** Сообщение об ошибке */
    message: string | null | undefined;
}

/**
 * Компонент отображения ошибки авторизации
 */
export function LoginAlert({ message }: LoginAlertProps) {
    const { t } = useTranslation('common');

    if (!message) return null;

    return (
        <Alert severity="error" variant="filled">
            <AlertTitle>{t('alert_message.error')}</AlertTitle>
            {message}
        </Alert>
    );
}
