import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { isValidCron } from 'cron-validator';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import List from '@mui/material/List';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import { usePermissions } from '@core/auth';
import { useToast } from '@core/providers/ToastProvider';
import { useLdapSettings, useLdapEnabled, useUpdateLdapSetting, useUpdateLdapSettingsBulk, useTestLdapConnection } from '../hooks/useLdapSettings';
import { SettingItem } from '../components/SettingItem';
import type { SettingValueType, LdapSettings } from '../../api/settings.dto';

const CONNECTION_SETTINGS = [
    'LDAP_URI',
    'LDAP_TLS_VERIFY',
    'LDAP_BIND_DN',
    'LDAP_BIND_PASSWORD',
    'LDAP_BASE_DN',
    'LDAP_USER_FILTER',
];

const SCHEDULE_SETTINGS = [
    'LDAP_SYNC_SCHEDULE',
];

const MAPPING_SETTINGS = [
    'LDAP_USER_ATTR_EMAIL',
    'LDAP_USER_ATTR_NAME',
    'LDAP_USER_ATTR_USERNAME',
];

/**
 * Страница LDAP настроек с SettingItem и Test Connection
 */
export function LdapSettingsPage() {
    const { t } = useTranslation('settings');
    const { can } = usePermissions();
    const { showSuccess, showError } = useToast();
    const hasUpdatePermission = can('settings:update');
    const { data: ldapSettings, isLoading, error } = useLdapSettings();
    const { data: ldapEnabled } = useLdapEnabled();
    const updateMutation = useUpdateLdapSetting();
    const bulkUpdateMutation = useUpdateLdapSettingsBulk();
    const testMutation = useTestLdapConnection();

    const [draftSettings, setDraftSettings] = useState<LdapSettings | null>(null);

    // Инициализируем draftSettings при загрузке данных
    useEffect(() => {
        if (ldapSettings) {
            setDraftSettings(ldapSettings);
        }
    }, [ldapSettings]);

    if (isLoading) {
        return (
            <Box p={4} display="flex" justifyContent="center">
                <CircularProgress />
            </Box>
        );
    }

    if (error) {
        return <Typography color="error">{t('common:error', 'Error loading data')}</Typography>;
    }

    const handleUpdate = async (key: string, value: SettingValueType) => {
        // Если настройка относится к подключению, обновляем только локальный стейт
        if (CONNECTION_SETTINGS.includes(key)) {
            setDraftSettings((prev) => {
                if (!prev) return null;
                const updatedSetting = {
                    ...prev[key],
                    key,
                    value,
                };
                return {
                    ...prev,
                    [key]: updatedSetting,
                };
            });
            return;
        }

        // Остальные настройки сохраняем сразу
        await updateMutation.mutateAsync({ key, value });
    };

    const handleTestConnection = async () => {
        if (draftSettings) {
            try {
                // Тестируем с draft настройками
                const result = await testMutation.mutateAsync(draftSettings);

                if (result.success) {
                    showSuccess(result.message, t('ldap.test_success', 'Success'));

                    // Если тест успешен, сохраняем изменения
                    if (ldapSettings) {
                        const changes = Object.values(draftSettings)
                            .filter(draftSetting => {
                                const original = ldapSettings[draftSetting.key];
                                // Проверяем изменилось ли значение
                                return original && original.value !== draftSetting.value;
                            })
                            .filter(s => CONNECTION_SETTINGS.includes(s.key))
                            .map(s => ({ key: s.key, value: s.value }));

                        if (changes.length > 0) {
                            await bulkUpdateMutation.mutateAsync(changes);
                            showSuccess(t('ldap.settings_saved', 'Settings saved successfully'));
                        }
                    }
                } else {
                    showError(result.message, t('ldap.test_failed', 'Connection Failed'));
                }
            } catch (err: unknown) {
                // Обработка ошибки запроса (если api/axios кинули исключение)
                // В большинстве случаев services.py возвращает LdapTestResultSchema даже при логических ошибках, 
                // так что catch сработает скорее при сетевых сбоях (500, 4xx).
                const message = err instanceof Error ? err.message : t('common:error', 'Unknown Error');
                showError(message, t('ldap.test_error', 'Error'));
            }
        }
    };

    const handleToggleEnabled = async (event: React.ChangeEvent<HTMLInputElement>) => {
        // Явно преобразуем в строку, чтобы избежать проблем с Pydantic coercion
        await updateMutation.mutateAsync({ key: 'LDAP_ENABLED', value: String(event.target.checked) });
    };

    const settings = draftSettings
        ? Object.values(draftSettings).filter((s) => s.key !== 'LDAP_ENABLED')
        : [];

    // Сортируем настройки подключения согласно порядку в CONNECTION_SETTINGS
    const connectionSettingsList = CONNECTION_SETTINGS
        .map(key => settings.find(s => s.key === key))
        .filter((s): s is typeof settings[0] => !!s);

    const scheduleSettingsList = settings.filter(s => SCHEDULE_SETTINGS.includes(s.key));

    // Сортируем настройки маппинга согласно порядку в MAPPING_SETTINGS
    const mappingSettingsList = MAPPING_SETTINGS
        .map(key => settings.find(s => s.key === key))
        .filter((s): s is typeof settings[0] => !!s);

    const otherSettingsList = settings.filter(s =>
        !CONNECTION_SETTINGS.includes(s.key) &&
        !SCHEDULE_SETTINGS.includes(s.key) &&
        !MAPPING_SETTINGS.includes(s.key)
    );

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h5">
                    {t('ldap.title', 'LDAP Settings')}
                </Typography>
                <FormControlLabel
                    control={
                        <Switch
                            checked={!!ldapEnabled}
                            onChange={handleToggleEnabled}
                            disabled={updateMutation.isPending || !hasUpdatePermission}
                        />
                    }
                    label={ldapEnabled ? t('ldap.enabled', 'LDAP Enabled') : t('ldap.disabled', 'LDAP Disabled')}
                />
            </Box>

            {settings.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 2 }}>
                    {t('ldap.no_settings', 'No LDAP settings available')}
                </Typography>
            )}

            <Stack spacing={3}>
                {/* Секция настроек подключения */}
                <Paper sx={{ p: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {t('ldap.connection_title', 'Connection Parameters')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" paragraph>
                        {t('ldap.connection_desc', 'Settings will be tested before saving.')}
                    </Typography>

                    <List>
                        {connectionSettingsList.map((setting) => (
                            <SettingItem
                                key={setting.key}
                                setting={{
                                    ...setting,
                                    is_sensitive: setting.is_secret ?? false,
                                }}
                                onUpdate={handleUpdate}
                                disabled={!ldapEnabled}
                                isDraft={true}
                                showSaveIcon={false}
                            />
                        ))}
                    </List>

                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            onClick={handleTestConnection}
                            disabled={testMutation.isPending || !ldapEnabled || !draftSettings || !hasUpdatePermission}
                        >
                            {testMutation.isPending ? <CircularProgress size={20} color="inherit" /> : t('ldap.test_connection', 'Save')}
                        </Button>
                    </Box>
                </Paper>

                {/* Секция настроек расписания */}
                {scheduleSettingsList.length > 0 && (
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('ldap.schedule_title', 'Sync Schedule')}
                        </Typography>
                        <List>
                            {scheduleSettingsList.map((setting) => (
                                <SettingItem
                                    key={setting.key}
                                    setting={{
                                        ...setting,
                                        is_sensitive: setting.is_secret ?? false,
                                    }}
                                    onUpdate={handleUpdate}
                                    disabled={!ldapEnabled}
                                    isDraft={false}
                                    showSaveIcon={true}
                                    validate={(value) => {
                                        if (setting.key === 'LDAP_SYNC_SCHEDULE') {
                                            // Backend uses standard 5-part cron (min hour day month dow)
                                            // Example: "0 0 * * *"
                                            if (!value) return t('ldap.cron_required', 'Schedule is required');
                                            const isValid = isValidCron(String(value), { seconds: false, alias: true });
                                            return isValid ? null : t('ldap.invalid_cron', 'Invalid CRON expression (e.g. "0 0 * * *")');
                                        }
                                        return null;
                                    }}
                                />
                            ))}
                        </List>
                        {/* TODO: Добавить пояснение для синтаксиса cron, если нужно */}
                    </Paper>
                )}

                {/* Секция настроек маппинга пользователей */}
                {mappingSettingsList.length > 0 && (
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('ldap.mapping_title', 'User Attributes Mapping')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            {t('ldap.mapping_desc', 'Map LDAP attributes to user profile fields.')}
                        </Typography>
                        <List>
                            {mappingSettingsList.map((setting) => (
                                <SettingItem
                                    key={setting.key}
                                    setting={{
                                        ...setting,
                                        is_sensitive: setting.is_secret ?? false,
                                    }}
                                    onUpdate={handleUpdate}
                                    disabled={!ldapEnabled}
                                    isDraft={false}
                                    showSaveIcon={true}
                                />
                            ))}
                        </List>
                    </Paper>
                )}

                {/* Секция остальных настроек */}
                {otherSettingsList.length > 0 && (
                    <Paper sx={{ p: 3 }}>
                        <Typography variant="h6" gutterBottom>
                            {t('ldap.other_title', 'Additional Settings')}
                        </Typography>
                        <List>
                            {otherSettingsList.map((setting) => (
                                <SettingItem
                                    key={setting.key}
                                    setting={{
                                        ...setting,
                                        is_sensitive: setting.is_secret ?? false,
                                    }}
                                    onUpdate={handleUpdate}
                                    disabled={!ldapEnabled}
                                    isDraft={false}
                                    showSaveIcon={true}
                                />
                            ))}
                        </List>
                    </Paper>
                )}
            </Stack>
        </Box>
    );
}
