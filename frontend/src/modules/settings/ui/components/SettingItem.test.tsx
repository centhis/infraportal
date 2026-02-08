import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen } from '@testing-library/react';
import { render } from '../../../../mocks/test-utils';
import { SettingItem } from './SettingItem';

describe('SettingItem - RBAC Tests', () => {
    // ===== Фабрика тестовых данных (DRY) =====
    const createMockBooleanSetting = () => ({
        key: 'BOOLEAN_SETTING',
        value: 'true',
        type: 'bool' as const,
        is_sensitive: false,
    });

    const createMockStringSetting = (overrides: { is_sensitive?: boolean; value?: string } = {}) => ({
        key: 'STRING_SETTING',
        value: 'test_value',
        type: 'string' as const,
        is_sensitive: false,
        ...overrides,
    });

    beforeEach(() => {
        vi.resetAllMocks();
    });

    // ===== Boolean настройки (Switch) =====
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
            expect(switchInput).toBeChecked(); // значение 'true'
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

    // ===== String настройки =====
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
            // SettingInputField отображает замаскированное значение как '●●●●●●●●'
            expect(screen.getByText('●●●●●●●●')).toBeInTheDocument();
        });
    });
});
