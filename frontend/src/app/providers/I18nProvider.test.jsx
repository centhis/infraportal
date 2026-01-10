import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import { I18nProvider, useI18n } from './I18nProvider';
import i18n from '../../i18n/i18n';
import { I18N_LNG_KEY } from '../../shared/constants/keys';
import { createStorageMock } from '../../mocks/test-helpers';

// We don't mock the i18n instance anymore to test the real behavior.

const TestComponent = () => {
    const { currentLanguage, changeLanguage } = useI18n();
    return (
        <div>
            <span data-testid="language-display">{currentLanguage}</span>
            <button onClick={() => changeLanguage('de')}>Change to DE</button>
            <button onClick={() => changeLanguage('fr')}>Change to FR</button>
        </div>
    );
};

describe('I18nProvider', () => {
    let localStorageMock;

    beforeEach(() => {
        localStorageMock = createStorageMock();
        Object.defineProperty(window, 'localStorage', {
            value: localStorageMock,
            writable: true,
        });

        vi.spyOn(i18n, 'changeLanguage').mockResolvedValue(() => {});
        
        // Reset to English before each test
        act(() => {
            i18n.changeLanguage('en');
        });
        
        vi.clearAllMocks();
    });
    
    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('should render children and provide default language', () => {
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );
        expect(screen.getByTestId('language-display')).toHaveTextContent('en');
    });

    it('should initialize with language from localStorage if present', async () => {
        localStorageMock.setItem(I18N_LNG_KEY, 'ru');
        
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        await waitFor(() => {
            expect(i18n.changeLanguage).toHaveBeenCalledWith('ru');
        });
    });

    it('should call i18n.changeLanguage when context function is used', async () => {
        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        fireEvent.click(screen.getByText('Change to DE'));

        await waitFor(() => {
            expect(i18n.changeLanguage).toHaveBeenCalledWith('de');
        });
    });

    it('should update context and localStorage when language changes', async () => {
        let languageChangedCallback;
        vi.spyOn(i18n, 'on').mockImplementation((event, callback) => {
            if (event === 'languageChanged') {
                languageChangedCallback = callback;
            }
        });

        render(
            <I18nProvider>
                <TestComponent />
            </I18nProvider>
        );

        expect(screen.getByTestId('language-display')).toHaveTextContent('en');

        act(() => {
            languageChangedCallback('fr');
        });

        await waitFor(() => {
            expect(screen.getByTestId('language-display')).toHaveTextContent('fr');
        });
        
        expect(localStorageMock.getItem(I18N_LNG_KEY)).toBe('fr');
    });
});
