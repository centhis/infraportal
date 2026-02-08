import { useEffect, type ReactNode, type SyntheticEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { usePersistentState } from '../../../../shared/hooks/usePersistentState';

// Lazy imports для вкладок
import { UserTabPage } from './UserTabPage';
import { RoleTabPage } from './RoleTabPage';
import { GroupTabPage } from './GroupTabPage';

interface TabPanelProps {
    children?: ReactNode;
    value: number;
    index: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`user-management-tabpanel-${index}`}
            aria-labelledby={`user-management-tab-${index}`}
            style={{ width: '100%', overflow: 'hidden' }}
            {...other}
        >
            {value === index && (
                <Box sx={{ p: 3, width: '100%', minWidth: 0 }}>
                    {children}
                </Box>
            )}
        </div>
    );
}

function a11yProps(index: number) {
    return {
        id: `user-management-tab-${index}`,
        'aria-controls': `user-management-tabpanel-${index}`,
    };
}

/**
 * Страница управления пользователями с вкладками
 */
export function UserManagementPage() {
    const [tabIndex, setTabIndex] = usePersistentState('userManagementTab', 0);
    const location = useLocation();
    const { t } = useTranslation('user_management');

    const handleChange = (_event: SyntheticEvent, newValue: number) => {
        setTabIndex(newValue);
    };

    // Сброс вкладки при навигации с resetTab
    useEffect(() => {
        const state = location.state as { resetTab?: boolean } | null;
        if (state?.resetTab) {
            setTabIndex(0);
            window.history.replaceState({}, document.title);
        }
    }, [location.state, setTabIndex]);

    return (
        <Box sx={{ width: '100%', maxWidth: '100%', overflow: 'hidden' }}>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabIndex} onChange={handleChange} aria-label="user-management-tabs">
                    <Tab label={t('user_management.tabs.users_tab')} {...a11yProps(0)} />
                    <Tab label={t('user_management.tabs.groups_tab')} {...a11yProps(1)} />
                    <Tab label={t('user_management.tabs.roles_tab')} {...a11yProps(2)} />
                </Tabs>
            </Box>
            <TabPanel value={tabIndex} index={0}>
                <UserTabPage />
            </TabPanel>
            <TabPanel value={tabIndex} index={1}>
                <GroupTabPage />
            </TabPanel>
            <TabPanel value={tabIndex} index={2}>
                <RoleTabPage />
            </TabPanel>
        </Box>
    );
}
