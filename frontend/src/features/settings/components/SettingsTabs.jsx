import * as React from 'react';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router-dom';

import CoreSettingsItemsPage from '../pages/CoreSettingsItemsPage';
import LdapSettingsItemsPage from '../pages/LdapSettingsItemsPage';
import usePersistentState from '../../../shared/hooks/usePersistentState';

function CustomTabPanel(props) {
    const { children, value, index, ...other } = props;

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

CustomTabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
};

function a11yProps(index) {
    return {
        id: `settings-tab-${index}`,
        'aria-controls': `settings-tabpanel-${index}`,
    };
}

export default function SettingsTabs() {
    const [value, setValue] = usePersistentState('settingsTab', 0);
    const location = useLocation();
    const { t } = useTranslation('settings');

    const handleChange = (event, newValue) => {
        setValue(newValue);
    };

    React.useEffect(() => {
        if (location.state?.resetTab) {
            setValue(0);
            window.history.replaceState({}, document.title);
        }
    }, [location.state, setValue]);

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={value} onChange={handleChange} aria-label="settings-tabs">
                    <Tab label={t('tabs.core')} {...a11yProps(0)} />
                    <Tab label={t('tabs.ldap')} {...a11yProps(1)} />
                </Tabs>
            </Box>
            <CustomTabPanel value={value} index={0}>
                <CoreSettingsItemsPage />
            </CustomTabPanel>
            <CustomTabPanel value={value} index={1}>
                <LdapSettingsItemsPage />
            </CustomTabPanel>
        </Box>
    );
}
