import { CircularProgress, Box } from '@mui/material';

import { useAuthContext } from './providers/AuthProvider';
import { PermissionsProvider } from './providers/PermissionsProvider';
import AppRoutes from './routes/AppRoutes';

function AppContent() {
    const { loading } = useAuthContext();

    if (loading) {
        return (
            <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
                <CircularProgress />
            </Box>
        );
    }

    return (
        <PermissionsProvider>
            <AppRoutes />
        </PermissionsProvider>
    );
}

export default AppContent;
