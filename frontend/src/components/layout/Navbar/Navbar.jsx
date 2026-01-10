import { useMemo } from "react";
import {
  Box, Drawer, CssBaseline, AppBar, Toolbar,
  List, Typography, Divider, ListItem, ListItemButton,
  ListItemIcon, ListItemText
} from "@mui/material";
import { useTranslation } from "react-i18next";

import HomeIcon from "@mui/icons-material/Home";
import InfoIcon from "@mui/icons-material/Info";
import GroupIcon from "@mui/icons-material/Group";
import { Link, useLocation, Outlet } from "react-router-dom";

import UserMenu from './UserMenu';
import { useAuthContext } from "../../../app/providers/AuthProvider";
import { Can } from "../../../app/providers/PermissionsProvider";
import { ROUTES } from "../../../shared/constants/routes";

const drawerWidth = 240;

export default function Navbar() {
  const {user, logout, loading} = useAuthContext();
  const location = useLocation();

  const {t} = useTranslation('layout');

  const navItems = useMemo(() => [
    { text: t('nav_items.home'), path: ROUTES.HOME, icon: <HomeIcon/> },   
    { text: t('nav_items.about'), path: ROUTES.ABOUT, icon: <InfoIcon/> },
  ], [t]);
  const settingsItems = useMemo(() => [
    { text: t('nav_items.user_management'), path: ROUTES.USER_MANAGEMENT, icon: <GroupIcon/>, permission: 'users:view' },
  ], [t]);

  const allItems = useMemo(() => [...navItems, ...settingsItems], [navItems, settingsItems]);
  const currentNav = useMemo(() => {
    return allItems.find(
      item => location.pathname === item.path || location.pathname.startsWith(item.path + "/")
    );
  }, [location.pathname, allItems])
  
  const currentTitle = currentNav ? currentNav.text : t('nav_items.default');

  if (loading) return null;

  return (
    <Box sx={{ display: 'flex' }}>
      <CssBaseline />
      <AppBar
        position="fixed"
        sx={{ 
          bgcolor: "primary.main" 
        }}
      >
        <Toolbar>
          <Typography variant="h6" noWrap component="h1" sx={{ flexGrow: 1 }}>
            {currentTitle}    
          </Typography>
          <UserMenu user={user} onLogout={logout} />
        </Toolbar>
      </AppBar>
      <Drawer
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            marginTop: '64px',
          },
        }}
        variant="permanent"
        anchor="left"
      >
        {/* <Toolbar />
        <Divider /> */}
        <List>
          {navItems.map((item) => (
            <ListItem key={item.text} disablePadding>
              <ListItemButton
                component={Link}
                to={item.path}
                selected={location.pathname === item.path}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.text} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
        <Divider />
        <List>
          {settingsItems.map((item) => (
            <Can do={item.permission} key={item.text}>
              <ListItem disablePadding>
                <ListItemButton
                  component={Link}
                  to={item.path}
                  state={{ resetTab: true }}
                  selected={location.pathname === item.path}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            </Can>
          ))}
        </List>
      </Drawer>
      <Box
        component="main"
        sx={{ flexGrow: 1, bgcolor: 'background.default', p: 3 }}
      >
        <Toolbar />
          <Outlet />
      </Box>
    </Box>
  );
}