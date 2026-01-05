import {useState} from "react";
import { Link } from "react-router-dom";
import { Box, IconButton, Menu, MenuItem } from "@mui/material";
import { useTranslation } from "react-i18next";

import UserAvatar from "./UserAvatar";

export default function UserMenu({user, onLogout}) {
    const [anchorEl, setAnchorEl] = useState(null);
    const open = Boolean(anchorEl);
    
    const {t} = useTranslation('layout');

    if (!user) return null;

    const handleMenu = (event) => setAnchorEl(event.currentTarget);
    const handleClose = () => setAnchorEl(null);

    const handleLogout = () => {
        setAnchorEl(null);
        onLogout?.();
    };

    return (
        <Box sx={{ display: "flex", alignItems: "center", ml: "auto" }} >
            <IconButton
                size="small"
                onClick={handleMenu}
                sx={{
                    ml: 1,
                    p: 0.2,
                    border: '2px solid transparent',
                    transition: 'all 0.2s',
                    '&:hover': {
                    borderColor: 'primary.main',
                    bgcolor: 'action.hover',
                    },
                }}
                >
                <UserAvatar user={user} />
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: "bottom",
                    horizontal: "right"
                }}
                transformOrigin={{
                    vertical: "top",
                    horizontal: "right"
                }}
            >
                <MenuItem 
                    component={Link}
                    to="/profile"
                    onClick={handleClose}
                >
                    {t('user_menu.profile')}
                </MenuItem>
                <MenuItem onClick={handleLogout}>
                    {t('user_menu.logout')}
                </MenuItem>
            </Menu>
        </Box>
    )
}