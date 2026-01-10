import { render, screen, renderHook } from '../../mocks/test-utils';
import { vi } from 'vitest';
import { PermissionsProvider, usePermissions, Can } from './PermissionsProvider';
import { useAuth } from '../../features/auth/hooks/useAuth';
import { AuthProvider } from './AuthProvider';

// Mock the useAuth hook
vi.mock('../../features/auth/hooks/useAuth');

describe('PermissionsProvider', () => {

    describe('usePermissions Hook', () => {
        const wrapper = ({ children }) => <AuthProvider><PermissionsProvider>{children}</PermissionsProvider></AuthProvider>;

        it('should return true from can() if user has the required permission', () => {
            const authHookValue = { permissions: ['users:view'], loading: false };
            useAuth.mockReturnValue(authHookValue);
            const { result } = renderHook(() => usePermissions(), { wrapper });
            expect(result.current.can('users:view')).toBe(true);
        });

        it('should return false from can() if user does not have the required permission', () => {
            const authHookValue = { permissions: ['users:view'], loading: false };
            useAuth.mockReturnValue(authHookValue);
            const { result } = renderHook(() => usePermissions(), { wrapper });
            expect(result.current.can('users:create')).toBe(false);
        });

        it('should return true from can() if user has at least one of the permissions in an array', () => {
            const authHookValue = { permissions: ['users:view'], loading: false };
            useAuth.mockReturnValue(authHookValue);
            const { result } = renderHook(() => usePermissions(), { wrapper });
            expect(result.current.can(['users:create', 'users:view'])).toBe(true);
        });

        it('should return false from can() if user has none of the permissions in an array', () => {
            const authHookValue = { permissions: ['users:delete'], loading: false };
            useAuth.mockReturnValue(authHookValue);
            const { result } = renderHook(() => usePermissions(), { wrapper });
            expect(result.current.can(['users:create', 'users:view'])).toBe(false);
        });

        it('should return false from can() when auth is loading', () => {
            const authHookValue = { permissions: ['users:view'], loading: true };
            useAuth.mockReturnValue(authHookValue);
            const { result } = renderHook(() => usePermissions(), { wrapper });
            expect(result.current.can('users:view')).toBe(false);
        });
    });

    describe('Can Component', () => {
        it('should render children if user has the required permission', () => {
            const authHookValue = { permissions: ['users:view'], loading: false };
            render(
                <Can do="users:view">
                    <div>Visible Content</div>
                </Can>,
                { authHookValue }
            );
            expect(screen.getByText('Visible Content')).toBeInTheDocument();
        });

        it('should not render children if user does not have the required permission', () => {
            const authHookValue = { permissions: ['users:view'], loading: false };
            render(
                <Can do="users:create">
                    <div>Hidden Content</div>
                </Can>,
                { authHookValue }
            );
            expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
        });

        it('should render fallback component if provided and user lacks permission', () => {
            const authHookValue = { permissions: ['users:view'], loading: false };
            render(
                <Can do="users:create" fallback={<div>Fallback Content</div>}>
                    <div>Hidden Content</div>
                </Can>,
                { authHookValue }
            );
            expect(screen.queryByText('Hidden Content')).not.toBeInTheDocument();
            expect(screen.getByText('Fallback Content')).toBeInTheDocument();
        });

        it('should not render children or fallback when auth is loading', () => {
            const authHookValue = { permissions: ['users:view'], loading: true };
            render(
                <Can do="users:view" fallback={<div>Fallback Content</div>}>
                    <div>Visible Content</div>
                </Can>,
                { authHookValue }
            );
            expect(screen.queryByText('Visible Content')).not.toBeInTheDocument();
            expect(screen.queryByText('Fallback Content')).not.toBeInTheDocument();
        });
    });
});
