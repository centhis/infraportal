import { useEffect } from "react";
import {
    Box,
    Typography,
    CircularProgress,
    Paper,
    List,
} from "@mui/material";
import { useTranslation } from "react-i18next";
import useCoreSettings from "../hooks/useCoreSettings";
import SettingItem from "../components/SettingItem";
import { useToast } from "../../../app/providers/ToastProvider";

const CoreSettingsItemsPage = () => {
    const { t } = useTranslation('settings');
    const { showToast } = useToast();
    const { coreSettings, loading, error, fetchCoreSettings, updateCoreSetting } = useCoreSettings();

    useEffect(() => {
        fetchCoreSettings();
    }, [fetchCoreSettings]);

    useEffect(() => {
        if (error) {
            showToast(error, 'error');
        }
    }, [error, showToast]);

    if (loading && coreSettings.length === 0) {
        return (
            <Box display="flex" justifyContent="center" p={5}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ mb: 3 }}>
                <Typography variant="h5" fontWeight="bold">
                    {t('core.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                    {t('core.subtitle')}
                </Typography>
            </Box>

            {/* Ошибки теперь выводятся через Toast в useEffect */}

            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <List disablePadding>
                    {coreSettings.map((setting, _index) => (
                        <SettingItem
                            key={setting.key}
                            setting={setting}
                            onUpdate={updateCoreSetting}
                        />
                    ))}
                    {coreSettings.length === 0 && !loading && (
                        <Box sx={{ p: 4, textAlign: 'center' }}>
                            <Typography color="text.secondary">
                                {t('core.no_settings')}
                            </Typography>
                        </Box>
                    )}
                </List>
            </Paper>
        </Box>
    );
};

export default CoreSettingsItemsPage;
