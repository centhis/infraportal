
import { AppProvider } from '@core/providers/AppProvider';
import { RouterProvider } from '@core/router/RouterProvider';
import Navbar from '@core/layout/Navbar/Navbar';

import { authRoutes } from '@modules/auth/routes';
import { contentRoutes } from '@modules/content/routes';
import { usersRoutes } from '@modules/users/routes';
import { settingsRoutes } from '@modules/settings/routes';

const allRoutes = [
    ...authRoutes,
    ...contentRoutes,
    ...usersRoutes,
    ...settingsRoutes,
];

function App() {
    return (
        <AppProvider>
            <RouterProvider
                routes={allRoutes}
                navbarLayout={<Navbar />}
                defaultPublicRoute="/"
                defaultProtectedRoute="/home"
            />
        </AppProvider>
    );
}

export default App;
