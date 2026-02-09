import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { PermissionGuard } from './PermissionGuard';
import { usePermissions } from '@core/auth';

// Мок usePermissions
vi.mock('@core/auth', () => ({
    usePermissions: vi.fn(),
}));

describe('PermissionGuard', () => {
    beforeEach(() => {
        vi.resetAllMocks();
    });

    it('should render children when user has permission', () => {
        vi.mocked(usePermissions).mockReturnValue({
            can: vi.fn().mockReturnValue(true),
            loading: false,
        } as unknown as ReturnType<typeof usePermissions>);

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route path="/protected" element={
                        <PermissionGuard permissions={['required.perm']}>
                            <div>Protected Content</div>
                        </PermissionGuard>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });

    it('should redirect when user lacks permission', () => {
        vi.mocked(usePermissions).mockReturnValue({
            can: vi.fn().mockReturnValue(false),
            loading: false,
        } as unknown as ReturnType<typeof usePermissions>);

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route path="/protected" element={
                        <PermissionGuard permissions={['required.perm']} redirectTo="/fallback">
                            <div>Protected Content</div>
                        </PermissionGuard>
                    } />
                    <Route path="/fallback" element={<div>Fallback Page</div>} />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
        expect(screen.getByText('Fallback Page')).toBeInTheDocument();
    });

    it('should render children restriction is empty', () => {
        vi.mocked(usePermissions).mockReturnValue({
            can: vi.fn().mockReturnValue(false), // Даже если can возвращает false, разрешения не требуются
            loading: false,
        } as unknown as ReturnType<typeof usePermissions>);

        render(
            <MemoryRouter initialEntries={['/protected']}>
                <Routes>
                    <Route path="/protected" element={
                        <PermissionGuard permissions={[]}>
                            <div>Protected Content</div>
                        </PermissionGuard>
                    } />
                </Routes>
            </MemoryRouter>
        );

        expect(screen.getByText('Protected Content')).toBeInTheDocument();
    });
});
