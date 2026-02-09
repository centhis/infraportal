import { useTranslation } from 'react-i18next';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import CircularProgress from '@mui/material/CircularProgress';
import { useCoreSettings, useUpdateCoreSetting } from '../hooks/useCoreSettings';
import { SettingItem } from '../components/SettingItem';
import type { SettingValueType } from '../../api/settings.dto';

/**
 * Страница Core настроек с SettingItem компонентами
 */
export function CoreSettingsPage() {
    const { t } = useTranslation('settings');
    const { data: settingsMap, isLoading, error } = useCoreSettings();
    const updateMutation = useUpdateCoreSetting();

    if (isLoading) {
        return (
            <Box p={4} display="flex" justifyContent="center">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Typography color="error">{t('common.error', 'Error loading data')}</Typography>;
    }

    const handleUpdate = async (key: string, value: SettingValueType) => {
        await updateMutation.mutateAsync({ key, value });
    };

    const settings = settingsMap ? Object.values(settingsMap) : [];

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                {t('settings.core.title', 'Core Settings')}
            </Typography>
            <List>
                {settings.map((setting) => (
                    <SettingItem
                        key={setting.key}
                        setting={setting}
                        onUpdate={handleUpdate}
                    />
                ))}
            </List>
            {settings.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 2 }}>
                    {t('settings.core.no_settings', 'No settings available')}
                </Typography>
            )}
        </Box>
    );
}
