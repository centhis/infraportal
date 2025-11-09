import * as React from 'react';
import PropTypes from 'prop-types';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import { useTranslation } from 'react-i18next';

import UserTabPage from '../pages/UserTabPage';
import RoleTabPage from '../pages/RoleTabPage';
import GroupTabPage from '../pages/GroupTabPage';


function CustomTabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
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

export default function UserManagementTabs() {
  const [value, setValue] = React.useState(0);

  const {t} = useTranslation('user_management');
  
  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={handleChange} aria-label="settings-tabs">
          <Tab label={ t('user_management.tabs.users_tab') } {...a11yProps(0)} />
          <Tab label={ t('user_management.tabs.roles_tab') } {...a11yProps(1)} />
          <Tab label={ t('user_management.tabs.groups_tab') } {...a11yProps(2)} />
        </Tabs>
      </Box>
      <CustomTabPanel value={value} index={0}>
        <UserTabPage />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={1}>
        <RoleTabPage />
      </CustomTabPanel>
      <CustomTabPanel value={value} index={2}>
        <GroupTabPage />
      </CustomTabPanel>
    </Box>
  );
}