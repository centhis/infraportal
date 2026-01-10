import {
    Dialog,
    DialogTitle,
    DialogContent,
    Box,
    Typography,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    List,
    ListItem,
    CircularProgress
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useTranslation } from 'react-i18next';

const PermissionsReportDialog = ({ open, onClose, reportData, isLoading }) => {
    const { t } = useTranslation('user_management');

    if (isLoading) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>{t('user_management.users.permissions_report.title', { username: reportData?.username || '' })}</DialogTitle>
                <DialogContent>
                    <Box display="flex" justifyContent="center" alignItems="center" height="200px">
                        <CircularProgress />
                    </Box>
                </DialogContent>
            </Dialog>
        );
    }

    if (!reportData) {
        return (
            <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
                <DialogTitle>{t('user_management.users.permissions_report.title', { username: '' })}</DialogTitle>
                <DialogContent>
                    <Typography>{t('user_management.users.permissions_report.no_data')}</Typography>
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>{t('user_management.users.permissions_report.title', { username: reportData.username })}</DialogTitle>
            <DialogContent dividers>
                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        {t('user_management.users.permissions_report.all_permissions_section_title')}
                    </Typography>
                    {reportData.all_unique_permissions && reportData.all_unique_permissions.length > 0 ? (
                        <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 0 }}>
                            {reportData.all_unique_permissions.map((permission) => (
                                <ListItem key={permission.id} sx={{ width: 'auto', p: 0 }}>
                                    <Chip
                                        label={permission.name}
                                        variant="outlined"
                                        color="primary"
                                        size="small"
                                    />
                                </ListItem>
                            ))}
                        </List>
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {t('user_management.users.permissions_report.no_permissions')}
                        </Typography>
                    )}
                </Box>

                <Box>
                    <Typography variant="h6" gutterBottom>
                        {t('user_management.users.permissions_report.breakdown_section_title')}
                    </Typography>
                    {reportData.groups_with_roles_and_permissions && reportData.groups_with_roles_and_permissions.length > 0 ? (
                        reportData.groups_with_roles_and_permissions.map((group) => (
                            <Accordion key={group.id}>
                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography sx={{ flexShrink: 0 }}>
                                            {t('user_management.users.permissions_report.group_accordion_title', { groupName: group.name })}
                                        </Typography>
                                        {group.built_in && <Chip label="Built-in" size="small" sx={{ ml: 1 }} color="info" />}
                                    </Box>
                                </AccordionSummary>
                                <AccordionDetails>
                                    {group.roles && group.roles.length > 0 ? (
                                        group.roles.map((role) => (
                                            <Accordion key={role.id} sx={{ ml: 2 }}>
                                                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                                        <Typography>
                                                            {t('user_management.users.permissions_report.role_accordion_title', { roleName: role.name })}
                                                        </Typography>
                                                        {role.built_in && <Chip label="Built-in" size="small" sx={{ ml: 1 }} color="info" />}
                                                    </Box>
                                                </AccordionSummary>
                                                <AccordionDetails>
                                                    {role.permissions && role.permissions.length > 0 ? (
                                                        <List sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, p: 0 }}>
                                                            {role.permissions.map((permission) => (
                                                                <ListItem key={permission.id} sx={{ width: 'auto', p: 0 }}>
                                                                    <Chip
                                                                        label={permission.name}
                                                                        variant="outlined"
                                                                        color="secondary"
                                                                        size="small"
                                                                    />
                                                                </ListItem>
                                                            ))}
                                                        </List>
                                                    ) : (
                                                        <Typography variant="body2" color="text.secondary">
                                                            {t('user_management.users.permissions_report.no_permissions')}
                                                        </Typography>
                                                    )}
                                                </AccordionDetails>
                                            </Accordion>
                                        ))
                                    ) : (
                                        <Typography variant="body2" color="text.secondary">
                                            {t('user_management.users.permissions_report.no_roles_found')}
                                        </Typography>
                                    )}
                                </AccordionDetails>
                            </Accordion>
                        ))
                    ) : (
                        <Typography variant="body2" color="text.secondary">
                            {t('user_management.users.permissions_report.no_groups_found')}
                        </Typography>
                    )}
                </Box>
            </DialogContent>
        </Dialog>
    );
};

export default PermissionsReportDialog;
