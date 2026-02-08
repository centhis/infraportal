import { describe, it, expect, vi } from 'vitest';
import { screen, fireEvent } from '@testing-library/react';
import { render } from '../../../../mocks/test-utils';
import { SettingsPage } from './SettingsPage';

// Мокаем дочерние компоненты для изоляции теста
vi.mock('./CoreSettingsPage', () => ({
    CoreSettingsPage: () => <div data-testid="core-settings-page">Core Content</div>
}));

vi.mock('./LdapSettingsPage', () => ({
    LdapSettingsPage: () => <div data-testid="ldap-settings-page">LDAP Content</div>
}));

describe('SettingsPage', () => {
    it('should render tabs', () => {
        render(<SettingsPage />);

        expect(screen.getByRole('tab', { name: /Core/i })).toBeInTheDocument();
        expect(screen.getByRole('tab', { name: /LDAP/i })).toBeInTheDocument();
    });

    it('should default to Core tab', () => {
        render(<SettingsPage />);

        expect(screen.getByTestId('core-settings-page')).toBeInTheDocument();
        expect(screen.queryByTestId('ldap-settings-page')).not.toBeInTheDocument();
    });

    it('should switch to LDAP tab on click', () => {
        render(<SettingsPage />);

        const ldapTab = screen.getByRole('tab', { name: /LDAP/i });
        fireEvent.click(ldapTab);

        expect(screen.getByTestId('ldap-settings-page')).toBeInTheDocument();
        expect(screen.queryByTestId('core-settings-page')).not.toBeInTheDocument();
    });
});
