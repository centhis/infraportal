import { render, screen } from '../../mocks/test-utils';
import { RouterProvider } from './RouterProvider';
import type { RouteConfig } from './types';
import { Outlet } from 'react-router-dom';

// Моковые компоненты
const PublicComponent = () => <div>Public Page</div>;
const ProtectedComponent = () => <div>Protected Page</div>;
const Navbar = () => <div data-testid="navbar">Navbar <Outlet /></div>;

const mockRoutes: RouteConfig[] = [
    {
        path: '/public',
        element: PublicComponent,
        protected: false,
    },
    {
        path: '/protected',
        element: ProtectedComponent,
        protected: true,
    },
];

describe('RouterProvider', () => {
    it('should render public route when unauthenticated', () => {
        render(
            <RouterProvider
                routes={mockRoutes}
                defaultPublicRoute="/public"
            />,
            {
                authHookValue: { user: null, loading: false },
                initialEntries: ['/public']
            }
        );

        expect(screen.getByText('Public Page')).toBeInTheDocument();
        expect(screen.queryByTestId('navbar')).not.toBeInTheDocument();
    });

    it('should redirect to defaultPublicRoute when accessing protected route unauthenticated', () => {
        // Логика ProtectedRoute: если !user -> Navigate к redirectTo ('/public' в данном случае)
        render(
            <RouterProvider
                routes={mockRoutes}
                defaultPublicRoute="/public"
            />,
            {
                authHookValue: { user: null, loading: false },
                initialEntries: ['/protected']
            }
        );

        // Должен быть редирект на /public
        expect(screen.getByText('Public Page')).toBeInTheDocument();
        expect(screen.queryByText('Protected Page')).not.toBeInTheDocument();
    });

    it('should render protected route and navbar when authenticated', () => {
        render(
            <RouterProvider
                routes={mockRoutes}
                navbarLayout={<Navbar />}
                defaultProtectedRoute="/protected"
            />,
            {
                authHookValue: { user: { name: 'User' }, loading: false },
                initialEntries: ['/protected']
            }
        );

        expect(screen.getByText('Protected Page')).toBeInTheDocument();
        expect(screen.getByTestId('navbar')).toBeInTheDocument();
    });

    it('should redirect unknown routes to defaultProtectedRoute when authenticated', () => {
        render(
            <RouterProvider
                routes={mockRoutes}
                navbarLayout={<Navbar />}
                defaultProtectedRoute="/protected"
            />,
            {
                authHookValue: { user: { name: 'User' }, loading: false },
                initialEntries: ['/unknown-route']
            }
        );

        // Должен быть catch-all редирект на /protected внутри ProtectedRoute
        expect(screen.getByText('Protected Page')).toBeInTheDocument();
    });

    it('should redirect to defaultPublicRoute when user lacks required permission for a route', () => {
        const routesWithPermissions: RouteConfig[] = [
            {
                path: '/admin',
                element: () => <div>Admin Page</div>,
                protected: true,
                permissions: ['admin.access'],
            },
            {
                path: '/home',
                element: () => <div>Home Page</div>,
                protected: true,
            },
            ...mockRoutes,
        ];

        render(
            <RouterProvider
                routes={routesWithPermissions}
                navbarLayout={<Navbar />}
                defaultProtectedRoute="/protected"
            />,
            {
                authHookValue: { user: { name: 'User', permissions: [] }, loading: false },
                initialEntries: ['/admin']
            }
        );

        expect(screen.queryByText('Admin Page')).not.toBeInTheDocument();
        // PermissionGuard перенаправляет на ROUTES.HOME ('/home') по умолчанию
        expect(screen.getByText('Home Page')).toBeInTheDocument();
    });
});
