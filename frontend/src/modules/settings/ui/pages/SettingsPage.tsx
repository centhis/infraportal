import React, { type SyntheticEvent } from 'react';
import { useTranslation } from 'react-i18next';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { usePersistentState } from '../../../../shared/hooks/usePersistentState';
import { CoreSettingsPage } from './CoreSettingsPage';
import { LdapSettingsPage } from './LdapSettingsPage';

interface TabPanelProps {
    children?: React.ReactNode;
    value: number;
    index: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`settings-tabpanel-${index}`}
            aria-labelledby={`settings-tab-${index}`}
            {...other}
        >
            {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `settings-tab-${index}`,
        'aria-controls': `settings-tabpanel-${index}`,
    };
}

/**
 * Главная страница настроек с вкладками
 */
export function SettingsPage() {
    const [tabIndex, setTabIndex] = usePersistentState('settingsTab', 0);
    const { t } = useTranslation('settings');

    const handleChange = (_event: SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleChange} aria-label="settings-tabs">
                    <Tab label={t('tabs.core', 'Core')} {...a11yProps(0)} />
                    <Tab label={t('tabs.ldap', 'LDAP')} {...a11yProps(1)} />
                </Tabs>
            </Box>
            <TabPanel value={tabIndex} index={0}>
                <CoreSettingsPage />
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
                <LdapSettingsPage />
            </TabPanel>
        </Box>
    );
}
