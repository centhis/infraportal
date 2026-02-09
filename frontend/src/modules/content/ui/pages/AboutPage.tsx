import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';

/**
 * Страница "О приложении"
 */
export function AboutPage() {
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
                {t('pages.about.title', 'About')}
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 600, textAlign: 'center' }}>
                {t('pages.about.description', 'InfraPortal is a comprehensive infrastructure management platform.')}
            </Typography>
        </Box>
    );
}
