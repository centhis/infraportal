import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../../mocks/test-utils';
import SettingItem from './SettingItem';

describe('SettingItem - RBAC Tests', () => {
    // ===== Test Data Factory (DRY) =====
    const createMockBooleanSetting = () => ({
        key: 'BOOLEAN_SETTING',
        value: 'true',
        type: 'boolean',
        is_sensitive: false,
    });

    const createMockStringSetting = (overrides = {}) => ({
        key: 'STRING_SETTING',
        value: 'test_value',
        type: 'string',
        is_sensitive: false,
        ...overrides,
    });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    // ===== Boolean Settings (Switch) =====
    describe('Boolean Settings', () => {
        it('should render Switch for boolean type setting', () => {
            render(
                <SettingItem
                    setting={createMockBooleanSetting()}
                    onUpdate={vi.fn()}
                />, { authHookValue: { permissions: ['settings:update'] } }
            );

            const switchInput = screen.getByRole('switch');
            expect(switchInput).toBeInTheDocument();
            expect(switchInput).toBeChecked(); // value is 'true'
        });

        it('should disable Switch when user lacks settings:update permission', () => {
            render(
                <SettingItem
                    setting={createMockBooleanSetting()}
                    onUpdate={vi.fn()}
                />, { authHookValue: { permissions: [] } }
            );

            const switchInput = screen.getByRole('switch');
            expect(switchInput).toBeDisabled();
        });

        it('should enable Switch when user has settings:update permission', () => {
            render(
                <SettingItem
                    setting={createMockBooleanSetting()}
                    onUpdate={vi.fn()}
                />, { authHookValue: { permissions: ['settings:update'] } }
            );

            const switchInput = screen.getByRole('switch');
            expect(switchInput).not.toBeDisabled();
        });
    });

    // ===== String Settings =====
    describe('String Settings', () => {
        it('should display value for non-sensitive string setting', () => {
            render(
                <SettingItem
                    setting={createMockStringSetting({ value: 'visible_value' })}
                    onUpdate={vi.fn()}
                />
            );

            expect(screen.getByText('visible_value')).toBeInTheDocument();
        });

        it('should mask value for sensitive string setting', () => {
            render(
                <SettingItem
                    setting={createMockStringSetting({ is_sensitive: true, value: 'secret' })}
                    onUpdate={vi.fn()}
                />
            );

            expect(screen.queryByText('secret')).not.toBeInTheDocument();
            expect(screen.getByText('********')).toBeInTheDocument();
        });
    });
});
