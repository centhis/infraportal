import { useEffect, useMemo, useState } from "react";
import {
    Box,
    Typography,
    CircularProgress,
    Paper,
    List,
    Button,
    Stack
} from "@mui/material";
import {
    PlayArrow as PlayIcon
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import useLdapSettings from "../hooks/useLdapSettings";
import SettingItem from "../components/SettingItem";
import { useToast } from "../../../app/providers/ToastProvider";

const LdapSettingsItemsPage = () => {
    const { t } = useTranslation(['settings', 'common']);
    const { showToast } = useToast();
    const {
        ldapSettings,
        loading,
        error,
        fetchLdapSettings,
        updateLdapSetting,
        updateLdapSettingsBulk,
        testLdapConnection
    } = useLdapSettings();

    const [draftSettings, setDraftSettings] = useState({});
    const [isVerified, setIsVerified] = useState(false);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchLdapSettings();
    }, [fetchLdapSettings]);

    useEffect(() => {
        if (error) {
            showToast(error, 'error');
        }
    }, [error, showToast]);

    const handleTest = async () => {
        setTesting(true);
        try {
            // Объединяем текущие настройки из БД с нашими черновиками
            const currentValues = ldapSettings.reduce((acc, s) => {
                acc[s.key] = draftSettings[s.key] !== undefined ? draftSettings[s.key] : s.value;
                return acc;
            }, {});

            const result = await testLdapConnection(currentValues);
            if (result.success) {
                setIsVerified(true);
                showToast(result.message || t('ldap.test_success'), 'success', t('ldap.test_success'));
            } else {
                setIsVerified(false);
                showToast(result.message || t('ldap.test_failed'), 'error', t('ldap.test_failed'));
            }
        } catch (err) {
            setIsVerified(false);
            showToast(err.message || t('ldap.test_failed'), 'error', t('ldap.test_failed'));
        } finally {
            setTesting(false);
        }
    };

    const handleDraftUpdate = (key, value) => {
        setDraftSettings(prev => ({
            ...prev,
            [key]: value
        }));

        // Список параметров, изменение которых требует повторной проверки соединения
        const connectionKeys = ['LDAP_ENABLED', 'LDAP_URI', 'LDAP_BASE_DN', 'LDAP_BIND_DN', 'LDAP_BIND_PASSWORD', 'LDAP_USER_FILTER'];
        if (connectionKeys.includes(key)) {
            setIsVerified(false);
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            await updateLdapSettingsBulk(draftSettings);
            showToast(t('common:save_success'), 'success');
            setDraftSettings({});
            setIsVerified(false);
        } catch (err) {
            showToast(err.message || t('common:save_error'), 'error');
        } finally {
            setSaving(false);
        }
    };

    const hasChanges = Object.keys(draftSettings).length > 0;

    const groupedSettings = useMemo(() => {
        const groups = {
            connection: ['LDAP_URI', 'LDAP_BASE_DN', 'LDAP_BIND_DN', 'LDAP_BIND_PASSWORD'],
            users: ['LDAP_USER_FILTER'],
            sync: ['LDAP_SYNC_SCHEDULE']
        };

        return Object.entries(groups).map(([groupKey, keys]) => {
            const groupItems = keys
                .map(key => ldapSettings.find(s => s.key === key))
                .filter(Boolean);

            return {
                key: groupKey,
                title: t(`ldap.groups.${groupKey}`),
                items: groupItems
            };
        });
    }, [ldapSettings, t]);

    const isLdapEnabled = useMemo(() => {
        const enabledSetting = ldapSettings.find(s => s.key === 'LDAP_ENABLED');
        const currentValue = draftSettings['LDAP_ENABLED'] !== undefined
            ? draftSettings['LDAP_ENABLED']
            : enabledSetting?.value;
        return currentValue === 'true' || currentValue === true;
    }, [ldapSettings, draftSettings]);

    const ldapEnabledSetting = useMemo(() =>
        ldapSettings.find(s => s.key === 'LDAP_ENABLED'),
        [ldapSettings]);

    if (loading && ldapSettings.length === 0) {
        return (
            <Box display="flex" justifyContent="center" p={5}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                    <Typography variant="h5" fontWeight="bold">
                        {t('ldap.title')}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                        {ldapEnabledSetting && (
                            <SettingItem
                                setting={{
                                    ...ldapEnabledSetting,
                                    value: draftSettings['LDAP_ENABLED'] !== undefined ? draftSettings['LDAP_ENABLED'] : ldapEnabledSetting.value
                                }}
                                onUpdate={handleDraftUpdate}
                                isHeaderToggle
                                isDraft={true}
                            />
                        )}
                        <Typography
                            variant="body2"
                            fontWeight="medium"
                            color={isLdapEnabled ? "primary.main" : "text.secondary"}
                        >
                            {isLdapEnabled ? t('common:enabled') : t('common:disabled')}
                        </Typography>
                    </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                        variant="outlined"
                        startIcon={testing ? <CircularProgress size={20} color="inherit" /> : <PlayIcon />}
                        onClick={handleTest}
                        disabled={testing || saving || ldapSettings.length === 0 || !isLdapEnabled}
                        sx={{ borderRadius: 2 }}
                    >
                        {t('ldap.test_connection')}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSaveAll}
                        disabled={!isVerified || !hasChanges || saving || testing}
                        sx={{ borderRadius: 2, px: 4 }}
                    >
                        {saving ? <CircularProgress size={20} color="inherit" /> : t('common:save_all')}
                    </Button>
                </Box>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 3, maxWidth: 600 }}>
                {t('ldap.subtitle')}
            </Typography>

            {/* Ошибки теперь выводятся через Toast в useEffect */}

            <Stack spacing={3} sx={{ opacity: isLdapEnabled ? 1 : 0.4, pointerEvents: isLdapEnabled ? 'auto' : 'none', transition: 'opacity 0.3s' }}>
                {groupedSettings.map((group) => group.items.length > 0 && (
                    <Box key={group.key}>
                        <Typography variant="overline" color="text.secondary" sx={{ ml: 2, fontWeight: 'bold' }}>
                            {group.title}
                        </Typography>
                        <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden', mt: 1 }}>
                            <List disablePadding>
                                {group.items.map((setting) => {
                                    const isConnectionSetting = setting.key !== 'LDAP_SYNC_SCHEDULE';
                                    return (
                                        <SettingItem
                                            key={setting.key}
                                            setting={isConnectionSetting ? {
                                                ...setting,
                                                value: draftSettings[setting.key] !== undefined ? draftSettings[setting.key] : setting.value
                                            } : setting}
                                            onUpdate={isConnectionSetting ? handleDraftUpdate : updateLdapSetting}
                                            disabled={!isLdapEnabled && setting.key !== 'LDAP_ENABLED'}
                                            isDraft={isConnectionSetting}
                                            showSaveIcon={!isConnectionSetting}
                                        />
                                    );
                                })}
                            </List>
                        </Paper>
                    </Box>
                ))}
            </Stack>

            {ldapSettings.length === 0 && !loading && (
                <Paper variant="outlined" sx={{ p: 4, textAlign: 'center', borderRadius: 2 }}>
                    <Typography color="text.secondary">
                        {t('ldap.no_settings')}
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};

export default LdapSettingsItemsPage;
