import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Главная страница приложения
 */
export function HomePage() {
    const { t } = useTranslation('common');

    return (
        <Box
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60vh',
                p: 4,
            }}
        >
            <Typography variant="h3" component="h1" gutterBottom>
                {t('pages.home.title', 'Welcome')}
            </Typography>
            <Typography variant="body1" color="text.secondary">
                {t('pages.home.description', 'InfraPortal - Infrastructure Management System')}
            </Typography>
        </Box>
    );
}
